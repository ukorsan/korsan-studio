'use strict';
// Independent FFmpeg composition engine for KORSAN Video Editor V3 with alpha dissolves and audio fades.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const VIDEO=new Set(['video','image']);
const KF=require('./public/keyframes.js');
const TR=require('./public/transitions.js');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const fmt=n=>Number(n).toFixed(3);
function mediaDuration(c){return c.type==='text'?clamp(c.duration,.05,10800):Math.max(.04,Number(c.out||0)-Number(c.in||0))}
function projectDuration(clips){return clips.reduce((max,c)=>Math.max(max,clamp(c.start,0,10800)+mediaDuration(c)),0)}
function layer(c){return c.track==='V2'?2:c.track==='V3'?3:1}
function dimensions(c,W,H){
 let x,y,w,h;
 if(c.transform&&typeof c.transform==='object'){
  x=clamp(c.transform.x,0,1);y=clamp(c.transform.y,0,1);w=clamp(c.transform.w,.05,1);h=clamp(c.transform.h,.05,1);
 }else if(layer(c)>=2){x=.63;y=.05;w=.34;h=.36}
 else{x=0;y=0;w=1;h=1}
 w=Math.min(w,1-x);h=Math.min(h,1-y);
 const even=n=>Math.max(2,Math.floor(n/2)*2);
 return {x:even(x*W),y:even(y*H),w:even(w*W),h:even(h*H)};
}
function assTime(sec){const cs=Math.max(0,Math.round(sec*100));return Math.floor(cs/360000)+':'+String(Math.floor(cs/6000)%60).padStart(2,'0')+':'+String(Math.floor(cs/100)%60).padStart(2,'0')+'.'+String(cs%100).padStart(2,'0')}
function assEscape(s){return String(s??'').replace(/[{}]/g,'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\N').slice(0,2000)}
function assFile(file,clips,W,H){
 const lines=['[Script Info]','ScriptType: v4.00+','PlayResX: '+W,'PlayResY: '+H,'WrapStyle: 0','','[V4+ Styles]','Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding'];
 for(const [name,alignment] of [['Top',8],['Middle',5],['Bottom',2]])lines.push('Style: '+name+',Arial,'+Math.round(H*.058)+',&H00FFFFFF,&H000000FF,&H00222222,&H80000000,1,0,0,0,100,100,0,0,1,3,1,'+alignment+',48,48,65,1');
 lines.push('','[Events]','Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');
 for(const c of clips.filter(x=>x.type==='text'&&x.text)){
  const start=clamp(c.start,0,10800),end=start+mediaDuration(c);
  const pos=c.position==='top'?'Top':c.position==='bottom'?'Bottom':'Middle';
  lines.push('Dialogue: '+(c.track==='T2'?2:1)+','+assTime(start)+','+assTime(end)+','+pos+',,0,0,0,,'+assEscape(c.text));
 }
 fs.writeFileSync(file,lines.join('\r\n'),'utf8');
}
async function runFFmpeg(bin,args){return new Promise((resolve,reject)=>{
 const child=spawn(bin,['-hide_banner','-loglevel','error','-nostdin','-y',...args],{windowsHide:true});
 let stderr='',settled=false;
 child.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-9000)});
 child.once('error',e=>{if(!settled){settled=true;reject(e)}});
 child.once('close',code=>{if(settled)return;settled=true;code===0?resolve():reject(new Error('FFmpeg composition '+code+': '+stderr))});
})}
async function renderMultitrack({spec,library,mediaDir,renderDir,ffmpeg='ffmpeg',onProgress=()=>{}}){
 const clips=Array.isArray(spec?.clips)?spec.clips:[];
 if(!clips.some(c=>VIDEO.has(c.type)))throw Error('É necessária uma pista de vídeo/imagem.');
 const total=projectDuration(clips);
 if(!Number.isFinite(total)||total<=0||total>10800)throw Error('Duração fora do limite de 3 horas desta versão.');
 const portrait=spec.aspect==='9:16',q=spec.quality==='720p'?720:1080;
 const W=portrait?q:Math.round((q*16/9)/2)*2,H=portrait?Math.round((q*16/9)/2)*2:q,fps=30;
 const jobdir=path.join(renderDir,'.v9-'+crypto.randomBytes(8).toString('hex'));
 fs.mkdirSync(jobdir,{recursive:true});
 try{
  const entries=clips.filter(c=>VIDEO.has(c.type)||c.type==='audio').map(c=>{
   const m=library.find(x=>x.id===c.mediaId);
   if(!m)throw Error('Ficheiro removido da biblioteca: '+c.mediaId);
   const file=path.join(mediaDir,m.stored);
   if(!fs.existsSync(file))throw Error('Media não encontrado: '+m.name);
   return {clip:c,media:m,file,start:clamp(c.start,0,total),duration:mediaDuration(c)};
  });
  const videos=entries.filter(x=>VIDEO.has(x.clip.type)).sort((a,b)=>layer(a.clip)-layer(b.clip)||a.start-b.start);
  const args=['-f','lavfi','-t',fmt(total),'-i','color=c=0x09090c:s='+W+'x'+H+':r='+fps,'-f','lavfi','-t',fmt(total),'-i','anullsrc=channel_layout=stereo:sample_rate=48000'];
  const filters=['[0:v]format=yuv420p,setpts=PTS-STARTPTS[stage0]'],audioLabels=['[1:a]'];
  for(let i=0;i<entries.length;i++){
   const item=entries[i];item.inputIndex=i+2;
   if(item.media.kind==='image'||item.clip.type==='image')args.push('-loop','1','-framerate',String(fps),'-t',fmt(item.duration),'-i',item.file);
   else args.push('-ss',fmt(clamp(item.clip.in,0,10800)),'-t',fmt(item.duration),'-i',item.file);
  }
  let stage=0;
  for(const item of videos){
   const c=item.clip,next='stage'+(++stage),pin='clip'+stage;
   const trans=TR.lane(c)==='V1'?TR.get(c):null;
   const transValid=trans&&clips.some(x=>x.id===c.transition?.previousId&&TR.video(x)&&x.start+mediaDuration(x)>item.start+.02);
   const transition=transValid?trans:null;
   const startExpr='(t-'+fmt(item.start)+')';
   const anim=transition?.type==='zoom-in'?'*(0.8+0.2*min(1,max(0,t/'+fmt(transition.duration)+')))':'';
   const wExpr='trunc(('+W+'*'+KF.expression(c,'w','t')+anim+')/2)*2';
   const hExpr='trunc(('+H+'*'+KF.expression(c,'h','t')+anim+')/2)*2';
   const xpExpr='('+W+'*'+KF.expression(c,'x',startExpr)+')';
   const ypExpr='('+H+'*'+KF.expression(c,'y',startExpr)+')';
   const rotation=KF.expression(c,'rotation','t');
   const ff=KF.filters(c);
   const fadeIn=clamp(c.fadeIn??0,0,Math.min(4,item.duration));
   const fadeOut=clamp(c.fadeOut??0,0,Math.min(4,item.duration-fadeIn));
   const fades=(fadeIn>.001?',fade=t=in:st=0:d='+fmt(fadeIn)+':alpha=1':'')+(fadeOut>.001?',fade=t=out:st='+fmt(item.duration-fadeOut)+':d='+fmt(fadeOut)+':alpha=1':'');
   const effects=(ff.brightness!==0||ff.contrast!==1||ff.saturation!==1?',eq=brightness='+fmt(ff.brightness)+':contrast='+fmt(ff.contrast)+':saturation='+fmt(ff.saturation):'')+
     (ff.blur>.01?',boxblur='+Math.min(15,Math.ceil(ff.blur/2))+':1':'');
   const keys=KF.keys(c),alphaExpr=KF.expression(c,'opacity','T');
   const alphaNeeded=keys.some(k=>(k.opacity??1)!==1)||KF.initial(c).opacity!==1||Boolean(transition&&!transition.type.startsWith('slide-'));
   const combinedAlpha=alphaExpr+(transition?'*('+TR.ffAlpha(transition.type,'T',transition.duration)+')':'');
   const alpha=alphaNeeded?(",format=yuva444p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='alpha(X,Y)*("+combinedAlpha+")'"):'';
   const slide=transition?TR.ffSlide(transition.type,startExpr,transition.duration,W,H):{x:'0',y:'0'};
   const actualX='('+xpExpr+'+'+slide.x+')',actualY='('+ypExpr+'+'+slide.y+')';
   filters.push('['+item.inputIndex+':v]setpts=PTS-STARTPTS,fps='+fps+
     ',format=yuva420p'+effects+',format=yuva420p'+alpha+
     ",rotate=a='("+rotation+")*PI/180':ow=iw:oh=ih:c=none"+fades+
     ",scale=w='"+wExpr+"':h='"+hExpr+"':eval=frame"+
     ',setsar=1,format=yuva420p,setpts=PTS-STARTPTS+'+fmt(item.start)+'/TB['+pin+']');
   const end=Math.max(item.start,item.start+item.duration-.0005);
   filters.push('[stage'+(stage-1)+']['+pin+"]overlay=x='"+actualX+"':y='"+actualY+
     "':eval=frame:shortest=0:eof_action=pass:repeatlast=0:enable=between(t\\,"+
     fmt(item.start)+'\\,'+fmt(end)+'):format=auto['+next+']');
  }
  const hasText=clips.some(c=>c.type==='text'&&c.text);
  if(hasText){
   assFile(path.join(jobdir,'titles.ass'),clips,W,H);
   // Use relative subtitles filename with the working directory in the FFmpeg process.
   filters.push('[stage'+stage+']ass=titles.ass,format=yuv420p[vout]');
  }else filters.push('[stage'+stage+']format=yuv420p[vout]');
  for(const item of entries){
   if(item.clip.type==='image'||!item.media.hasAudio)continue;
   const label='a'+item.inputIndex,delay=Math.round(item.start*1000),gain=clamp(item.clip.muted?0:(item.clip.volume??1),0,3);
   const incoming=TR.lane(item.clip)==='V1'?TR.get(item.clip):null;
   const outgoing=clips.find(c=>c.transition?.previousId===item.clip.id&&TR.video(c));
   const outgoingTransition=outgoing?TR.get(outgoing):null;
   const inSec=clamp(Math.max(item.clip.fadeIn||0,incoming?.duration||0),0,Math.min(4,item.duration));
   const outSec=clamp(Math.max(item.clip.fadeOut||0,outgoingTransition?.duration||0),0,Math.min(4,item.duration));
   const fades=(inSec>.001?',afade=t=in:st=0:d='+fmt(inSec):'')+(outSec>.001?',afade=t=out:st='+fmt(item.duration-outSec)+':d='+fmt(outSec):'');
   filters.push('['+item.inputIndex+':a]aresample=48000,aformat=channel_layouts=stereo,volume='+gain+fades+',adelay='+delay+'|'+delay+'['+label+']');
   audioLabels.push('['+label+']');
  }
  if(audioLabels.length===1)filters.push('[1:a]anull[aout]');
  else filters.push(audioLabels.join('')+'amix=inputs='+audioLabels.length+':duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[aout]');
  const outfile=path.join(renderDir,'KorsanVideoV9-'+Date.now()+'.mp4');
  onProgress(.1,'A compor '+videos.length+' clips e '+clips.filter(c=>c.transition).length+' transições');
  const mode=spec.encoder==='nvenc'?'nvenc':'cpu';
  const videoCodec=mode==='nvenc'?['-c:v','h264_nvenc','-preset','p4','-rc','vbr','-cq','23','-b:v','0']:['-c:v','libx264','-preset','veryfast','-crf','23'];
  onProgress(.12,mode==='nvenc'?'A exportar com NVIDIA NVENC':'A exportar com codificador CPU');
  args.push('-filter_complex',filters.join(';'),'-map','[vout]','-map','[aout]','-t',fmt(total),'-r',String(fps),...videoCodec,'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',outfile);
  await new Promise((resolve,reject)=>{
   const child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y',...args],{cwd:jobdir,windowsHide:true});
   let err='',done=false;child.stderr.on('data',x=>{err=(err+String(x)).slice(-9000)});
   child.on('error',e=>{if(!done){done=true;reject(e)}});
   child.on('close',code=>{if(done)return;done=true;code===0?resolve():reject(Error('Erro FFmpeg '+code+': '+err))});
  });
  if(!fs.existsSync(outfile)||fs.statSync(outfile).size<1000)throw Error('Exportação incompleta');
  onProgress(1,'Exportação multipista concluída');
  return path.basename(outfile);
 }finally{try{fs.rmSync(jobdir,{recursive:true,force:true})}catch{}}
}
module.exports={renderMultitrack,dimensions,projectDuration,mediaDuration};
