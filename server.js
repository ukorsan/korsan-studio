'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn, execFile} = require('node:child_process');
const {renderMultitrack} = require('./composition-v9');
const {extractWaveform} = require('./waveforms');
const stock=require('./stock-library');
const {promisify} = require('node:util');
const execFileAsync = promisify(execFile);
const ROOT = process.env.KORSAN_DATA_ROOT || __dirname;
const MEDIA_DIR = path.join(ROOT, 'media');
const RENDER_DIR = path.join(ROOT, 'renders');
const WAVEFORM_DIR = path.join(ROOT, 'waveforms');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(ROOT, 'library.json');
const PROJECT_PATH = path.join(ROOT, 'project.json');
const PORT = Number(process.env.PORT || 4196);
for (const folder of [MEDIA_DIR, RENDER_DIR, WAVEFORM_DIR]) fs.mkdirSync(folder,{recursive:true});
const loadJSON=(p,fallback)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return fallback}};
let library=loadJSON(DB_PATH,[]);
let project=loadJSON(PROJECT_PATH,{name:'Untitled project',aspect:'16:9',clips:[]});
let render={state:'idle',progress:0,message:'',file:null};
const saveJSON=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2),'utf8');
const json=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const fail=(res,msg,code=400)=>json(res,{error:msg},code);
const safeId=()=>crypto.randomBytes(12).toString('hex');
const allowedExt=new Set(['.mp4','.mov','.mkv','.webm','.avi','.m4v','.mp3','.wav','.m4a','.aac','.ogg','.png','.jpg','.jpeg','.webp']);
const videoExt=new Set(['.mp4','.mov','.mkv','.webm','.avi','.m4v']);
const audioExt=new Set(['.mp3','.wav','.m4a','.aac','.ogg']);
const imageExt=new Set(['.png','.jpg','.jpeg','.webp']);
const mime={'.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const ffmpeg=process.env.FFMPEG||'ffmpeg', ffprobe=process.env.FFPROBE||'ffprobe';
function readBody(req,max=5e6){return new Promise((resolve,reject)=>{let size=0,b='';req.on('data',c=>{size+=c.length;if(size>max){reject(new Error('Pedido demasiado grande'));req.destroy()}else b+=c});req.on('end',()=>{try{resolve(JSON.parse(b))}catch{reject(new Error('JSON inválido'))}});req.on('error',reject)})}
function streamFile(res,p,ctype){
  const stat=fs.statSync(p);const size=stat.size;
  const range=res.req?.headers.range;
  const base={'Content-Type':ctype||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
  if(range){const m=/bytes=(\d+)-(\d*)/.exec(range);if(m){const a=Number(m[1]);const b=m[2]?Math.min(Number(m[2]),size-1):size-1;if(a>=size||a>b){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return}res.writeHead(206,{...base,'Content-Range':'bytes '+a+'-'+b+'/'+size,'Content-Length':b-a+1});fs.createReadStream(p,{start:a,end:b}).pipe(res);return}}
  res.writeHead(200,{...base,'Content-Length':size});fs.createReadStream(p).pipe(res);
}
async function probe(p,extension){
  if(imageExt.has(extension))return {kind:'image',duration:5,hasAudio:false,width:0,height:0};
  const {stdout}=await execFileAsync(ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',p],{maxBuffer:1e6,timeout:30000});
  const info=JSON.parse(stdout);const streams=info.streams||[];
  const v=streams.find(s=>s.codec_type==='video');
  return {kind:audioExt.has(extension)?'audio':'video',duration:Number(info.format?.duration)||0,hasAudio:streams.some(s=>s.codec_type==='audio'),width:v?.width||0,height:v?.height||0};
}
async function runFF(args,cwd,callback){
 return new Promise((resolve,reject)=>{
  const child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{cwd,windowsHide:true});
  let stderr=''; child.stderr.on('data',x=>{stderr=(stderr+x.toString()).slice(-6000);if(callback)callback(x.toString())});
  child.on('error',reject);
  child.on('close',code=>code===0?resolve():reject(new Error('FFmpeg '+code+': '+stderr)));
 });
}
function assTime(sec){const cs=Math.max(0,Math.round(sec*100));return Math.floor(cs/360000)+':'+String(Math.floor(cs/6000)%60).padStart(2,'0')+':'+String(Math.floor(cs/100)%60).padStart(2,'0')+'.'+String(cs%100).padStart(2,'0')}
function assEscape(s){return String(s||'').replace(/[{}]/g,'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\N').slice(0,2000)}
async function renderProject(spec){
 const jobdir=path.join(RENDER_DIR,'.job-'+safeId());fs.mkdirSync(jobdir,{recursive:true});
 const clips=Array.isArray(spec.clips)?spec.clips:[];
 const aspect=spec.aspect==='9:16'?'9:16':'16:9';
 const quality=spec.quality==='720p'?720:1080;
 const width=aspect==='9:16'?quality:Math.round(quality*16/9/2)*2;
 const height=aspect==='9:16'?Math.round(quality*16/9/2)*2:quality;
 const fps=30;
 const video=clips.filter(c=>(c.type==='video'||c.type==='image')&&library.some(x=>x.id===c.mediaId)).sort((a,b)=>a.start-b.start);
 if(!video.length)throw Error('Adiciona pelo menos um vídeo ou imagem à timeline.');
 let position=0;const segments=[];let index=0;
 const createSegment=async(obj,isBlack=false)=>{
  const output=path.join(jobdir,'seg-'+String(index++).padStart(3,'0')+'.mp4');
  const length=Math.max(.05,Number(obj.out)-Number(obj.in));
  const target='fps='+fps+',scale='+width+':'+height+':force_original_aspect_ratio=decrease,pad='+width+':'+height+':(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p';
  if(isBlack){await runFF(['-f','lavfi','-i','color=c=black:s='+width+'x'+height+':r='+fps,'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-t',String(length),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-shortest',output],jobdir);return output}
  const media=library.find(x=>x.id===obj.mediaId);if(!media)throw Error('Ficheiro não encontrado para o clip');
  const src=path.join(MEDIA_DIR,media.stored);
  const a=media.kind==='image'?['-loop','1','-i',src]:['-ss',String(Math.max(0,Number(obj.in)||0)),'-i',src];
  const sound=media.hasAudio&&media.kind!=='image';
  const inputs=sound?a:['-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000',...a];
  const vidMap=sound?'0:v:0':'1:v:0',audMap=sound?'0:a:0':'0:a:0';
  const vf=['-vf',target];
  const af=sound?['-af','volume='+Math.max(0,Math.min(3,Number(obj.volume??1)))]:[];
  await runFF([...inputs,'-t',String(length),'-map',vidMap,'-map',audMap,...vf,...af,'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-shortest',output],jobdir);
  return output;
 };
 for(const item of video){
  const start=Math.max(0,Number(item.start)||0);const clipDuration=Math.max(.05,Number(item.out)-Number(item.in));
  if(start+0.04<position)throw Error('Existem clips de vídeo sobrepostos. Separa-os antes de exportar.');
  if(start-position>.05){segments.push(await createSegment({in:0,out:start-position},true));position=start}
  segments.push(await createSegment(item));position=start+clipDuration;
  render.progress=Math.min(0.76,0.76*segments.length/(video.length*2+1));render.message='A processar segmentos '+segments.length;
 }
 const playlist=segments.map(f=>"file '"+f.replace(/\\/g,'/').replace(/'/g,"'\\''")+"'").join('\n');
 fs.writeFileSync(path.join(jobdir,'concat.txt'),playlist,'utf8');
 const joined=path.join(jobdir,'joined.mp4');
 render.message='A juntar os segmentos';render.progress=.8;
 await runFF(['-f','concat','-safe','0','-i','concat.txt','-c','copy','-movflags','+faststart',joined],jobdir);
 let outputInput=joined;
 const texts=clips.filter(c=>c.type==='text'&&c.text&&Number(c.duration)>0);
 if(texts.length){
  const basic=['[Script Info]','ScriptType: v4.00+','PlayResX: '+width,'PlayResY: '+height,'WrapStyle: 0','','[V4+ Styles]','Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding'];
  const style=(name,align)=>'Style: '+name+',Arial,'+Math.round(height*.065)+',&H00FFFFFF,&H000000FF,&H00141414,&H80000000,1,0,0,0,100,100,0,0,1,3,1,'+align+',48,48,65,1';
  basic.push(style('Top',8),style('Center',5),style('Bottom',2),'','[Events]','Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');
  for(const t of texts){const end=Number(t.start)+Number(t.duration);const position=t.position==='top'?'Top':t.position==='center'?'Center':'Bottom';basic.push('Dialogue: 0,'+assTime(Number(t.start)||0)+','+assTime(end)+','+position+',,0,0,0,,'+assEscape(t.text))}
  fs.writeFileSync(path.join(jobdir,'titles.ass'),basic.join('\r\n'),'utf8');
  const titled=path.join(jobdir,'titled.mp4');render.progress=.86;render.message='A aplicar títulos';
  await runFF(['-i',joined,'-vf','ass=titles.ass','-c:v','libx264','-preset','veryfast','-crf','23','-c:a','copy','-movflags','+faststart',titled],jobdir);outputInput=titled;
 }
 const audioClips=clips.filter(c=>c.type==='audio'&&library.some(x=>x.id===c.mediaId)).slice(0,8);
 if(audioClips.length){
  render.progress=.91;render.message='A misturar áudio';
  const args=['-i',outputInput]; const filters=['[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[base]'];let maps=['[base]'];
  for(let i=0;i<audioClips.length;i++){
    const c=audioClips[i];const m=library.find(x=>x.id===c.mediaId);
    args.push('-ss',String(Math.max(0,Number(c.in)||0)),'-t',String(Math.max(.1,Number(c.out)-Number(c.in))),'-i',path.join(MEDIA_DIR,m.stored));
    const delay=Math.max(0,Math.round(Number(c.start)*1000));
    const key='[mix'+i+']';filters.push('['+(i+1)+':a]aresample=48000,volume='+Math.max(0,Math.min(3,Number(c.volume??1)))+',adelay='+delay+'|'+delay+key);maps.push(key);
  }
  filters.push(maps.join('')+'amix=inputs='+maps.length+':duration=first:dropout_transition=0[aout]');
  const mixed=path.join(jobdir,'mixed.mp4');
  await runFF([...args,'-filter_complex',filters.join(';'),'-map','0:v:0','-map','[aout]','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',mixed],jobdir);outputInput=mixed;
 }
 const name='KorsanVideo-'+Date.now()+'.mp4';fs.copyFileSync(outputInput,path.join(RENDER_DIR,name));
 try{fs.rmSync(jobdir,{recursive:true,force:true})}catch{}
 render={state:'done',progress:1,message:'Exportação concluída',file:name};
}
function safeStaticPath(p){const full=path.resolve(PUBLIC_DIR,'.'+p);return full.startsWith(PUBLIC_DIR+path.sep)||full===PUBLIC_DIR?full:null}
async function handle(req,res){
 try{
 const u=new URL(req.url,'http://127.0.0.1:'+PORT), route=u.pathname;
 if(req.method==='GET'&&route==='/api/health')return json(res,{ok:true,name:'Korsan Video Editor',media:library.length,ffmpeg});
 if(req.method==='GET'&&route==='/api/library')return json(res,library);
 if(req.method==='GET'&&route==='/api/stock/search'){
   const data=stock.search({kind:u.searchParams.get('kind')||'brands',q:u.searchParams.get('q')||'',category:u.searchParams.get('category')||'',offset:Math.max(0,Math.min(10000,Number(u.searchParams.get('offset'))||0)),limit:48});
   return data?json(res,data):fail(res,'Categoria inexistente',400);
 }
 if(req.method==='GET'&&route==='/api/stock/svg'){
   const svg=stock.svgFor(u.searchParams.get('kind'),u.searchParams.get('id'),u.searchParams.get('color'));
   if(!svg)return fail(res,'Elemento inexistente',404);
   res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(svg);return;
 }
 if(req.method==='GET'&&route==='/api/capabilities'){
   try {const {stdout}=await execFileAsync(ffmpeg,['-hide_banner','-encoders'],{timeout:15000,maxBuffer:300000});
      return json(res,{h264NvencListed:/\bh264_nvenc\b/.test(stdout),warning:'Disponibilidade do encoder não garante funcionamento da GPU. Usar apenas após teste.'});
   } catch(e){return json(res,{h264NvencListed:false,warning:e.message})}
 }
 if(req.method==='GET'&&route.startsWith('/api/waveform/')){
   const id=route.slice('/api/waveform/'.length),m=library.find(x=>x.id===id);
   if(!m)return fail(res,'Ficheiro não encontrado',404);
   if(!m.hasAudio)return fail(res,'Este ficheiro não tem áudio',422);
   const data=await extractWaveform({id,file:path.join(MEDIA_DIR,m.stored),duration:m.duration,ffmpeg,cacheDir:WAVEFORM_DIR});
   return json(res,data);
 }
 if(req.method==='GET'&&route==='/api/project')return json(res,project);
 if(req.method==='PUT'&&route==='/api/project'){const data=await readBody(req);if(!Array.isArray(data.clips))return fail(res,'Estrutura de projeto inválida');project=data;saveJSON(PROJECT_PATH,project);return json(res,{ok:true})}
 if(req.method==='GET'&&route==='/api/render')return json(res,render);
 if(req.method==='POST'&&route==='/api/render'){
   if(render.state==='running')return fail(res,'Já existe uma exportação em curso',409);
   const spec=await readBody(req);render={state:'running',progress:0,message:'A preparar exportação',file:null};
   renderMultitrack({spec,library,mediaDir:MEDIA_DIR,renderDir:RENDER_DIR,ffmpeg,onProgress:(progress,message)=>{render.progress=progress;render.message=message}}).then(file=>{render={state:'done',progress:1,message:'Exportação multipista concluída',file}}).catch(e=>{render={state:'error',progress:0,message:e.message,file:null};console.error('V2 export failed:',e.message)});
   return json(res,{ok:true});
 }
 if(req.method==='POST'&&route==='/api/import'){
  const original=(u.searchParams.get('name')||'').slice(0,180);const ext=path.extname(original).toLowerCase();
  if(!allowedExt.has(ext))return fail(res,'Formato ainda não suportado: '+ext);
  const contentLength=Number(req.headers['content-length']||0);
  if(contentLength>8e9)return fail(res,'Ficheiro superior ao limite de 8 GB',413);
  const id=safeId(),stored=id+ext, full=path.join(MEDIA_DIR,stored);
  const file=fs.createWriteStream(full,{flags:'wx'});
  req.pipe(file);
  req.on('aborted',()=>{file.destroy();fs.rm(full,{force:true},()=>{})});
  file.on('error',e=>{console.error(e);if(!res.headersSent)fail(res,'Erro ao escrever ficheiro',500)});
  file.on('finish',async()=>{try{const meta=await probe(full,ext);const row={id,name:original,stored,size:fs.statSync(full).size,...meta};library.push(row);saveJSON(DB_PATH,library);json(res,row,201)}catch(e){fs.rm(full,{force:true},()=>{});fail(res,'Ficheiro inválido ou incompatível: '+e.message)}});
  return;
 }
 if(req.method==='GET'&&route.startsWith('/media/')){
  const row=library.find(x=>x.id===route.slice(7));if(!row)return fail(res,'Media desconhecido',404);
  return streamFile(res,path.join(MEDIA_DIR,row.stored),mime[path.extname(row.stored)]||'application/octet-stream');
 }
 if(req.method==='GET'&&route.startsWith('/renders/')){
  const name=route.slice(9);if(!/^KorsanVideo(?:V2|V3|V4|V5|V9)?-\d+\.mp4$/.test(name))return fail(res,'Exportação desconhecida',404);
  const p=path.join(RENDER_DIR,name);if(!fs.existsSync(p))return fail(res,'Não encontrado',404);
  res.setHeader('Content-Disposition','attachment; filename="'+name+'"');
  return streamFile(res,p,'video/mp4');
 }
 if(req.method==='GET'||req.method==='HEAD'){
   const p=safeStaticPath(route==='/'?'/index.html':route);if(!p||!fs.existsSync(p)||fs.statSync(p).isDirectory())return fail(res,'Não encontrado',404);
   const t={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
   if(req.method==='HEAD'){res.writeHead(200,{'Content-Type':t[path.extname(p)]||'application/octet-stream'});return res.end()}
   return streamFile(res,p,t[path.extname(p)]||'application/octet-stream');
 }
 fail(res,'Método não suportado',405);
 }catch(e){console.error(e);if(!res.headersSent)fail(res,e.message,500)}
}
const server=http.createServer((req,res)=>{
 const host=String(req.headers.host||'').split(':')[0];
 const origin=req.headers.origin;
 const allowed=origin===undefined||origin==='http://127.0.0.1:'+PORT||origin==='http://localhost:'+PORT;
 if(!['127.0.0.1','localhost'].includes(host)||!allowed){res.writeHead(403);res.end('Forbidden');return}
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 res.req=req;handle(req,res)
});
server.listen(PORT,'127.0.0.1',()=>console.log('Korsan Studio → http://127.0.0.1:'+PORT));
