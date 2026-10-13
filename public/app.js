'use strict';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const escapeHTML=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={clips:[],media:[],name:'Projeto sem título',aspect:'16:9',selected:null,playhead:0,playing:false,zoom:24,history:[],currentMediaId:null,saving:null,renderTimer:null};
const video=$('#preview'),img=$('#image-preview'),music=new Audio();music.preload='metadata';
let toastTimer=null,lastTick=0;
const formatTime=t=>{t=Math.max(0,Number(t)||0);const minutes=Math.floor(t/60),s=Math.floor(t%60),cs=Math.round((t%1)*100);return String(minutes).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0')};
const clipLength=c=>c.type==='text'?Math.max(.1,Number(c.duration)||0):Math.max(.1,(Number(c.out)||0)-(Number(c.in)||0));
const projectLength=()=>state.clips.reduce((a,c)=>Math.max(a,Number(c.start)+clipLength(c)),0);
const findMedia=id=>state.media.find(x=>x.id===id);
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const toast=(message,error=false)=>{const el=$('#toast');el.textContent=message;el.classList.toggle('status-error',error);el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),4300)};
const status=(s,error=false)=>{$('#status').textContent='● '+s;$('#status').classList.toggle('status-error',error)};
async function api(url,options){const r=await fetch(url,options);if(!r.ok){let err;try{err=(await r.json()).error}catch{}throw Error(err||'Pedido falhou ('+r.status+')')}return r.json()}
function remember(){state.history.push(JSON.stringify({clips:state.clips,selected:state.selected}));if(state.history.length>50)state.history.shift()}
function queueSave(){clearTimeout(state.saving);$('#save-status').textContent='● A guardar...';state.saving=setTimeout(save,550)}
async function save(){try{await api('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,aspect:state.aspect,clips:state.clips})});$('#save-status').textContent='● Guardado localmente'}catch(e){$('#save-status').textContent='● Erro ao guardar';toast(e.message,true)}}
function switchTab(tab){$$('.rail-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));$$('.panel-content').forEach(x=>x.classList.toggle('hidden',x.id!=='tab-'+tab))}
function drawLibrary(){
 const media=state.media.filter(m=>m.kind!=='audio');
 const audio=state.media.filter(m=>m.kind==='audio');
 $('#asset-count').textContent=state.media.length+' ficheiros';
 const card=m=>'<div class="asset" draggable="true" data-id="'+escapeHTML(m.id)+'" title="Arrasta para a timeline ou clica em +"><div class="asset-icon '+escapeHTML(m.kind)+'">'+(m.kind==='video'?'▶':m.kind==='audio'?'♫':'▧')+'</div><div class="asset-meta"><div class="asset-name">'+escapeHTML(m.name)+'</div><div class="asset-sub">'+escapeHTML(m.kind)+' · '+formatTime(m.duration)+'</div></div><button class="asset-add" title="Adicionar à timeline" data-add="'+escapeHTML(m.id)+'">＋</button></div>';
 $('#media-list').innerHTML=media.map(card).join('')||'<p class="hint">Ainda não importaste vídeos.</p>';
 $('#audio-list').innerHTML=audio.map(card).join('')||'<p class="hint">Ainda não importaste áudio.</p>';
 $$('.asset').forEach(el=>{el.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',el.dataset.id));el.addEventListener('dblclick',()=>addMedia(el.dataset.id))});
 $$('[data-add]').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();addMedia(x.dataset.add)}));
}
async function uploadFiles(files){
 if(!files.length)return;
 status('A importar '+files.length+' ficheiro(s)...');
 for(const f of files){
  try{
   const m=await api('/api/import?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:f});
   state.media.push(m);drawLibrary();toast('Importado: '+m.name);
  }catch(e){toast(f.name+': '+e.message,true)}
 }
 status('Pronto para criar');$('#file').value='';
}
function addMedia(id,startAt){
 const m=findMedia(id);if(!m)return;
 remember();
 const type=m.kind==='audio'?'audio':m.kind==='image'?'image':'video';
 const lane=type==='audio'?'audio':'video';
 const prior=state.clips.filter(c=>(c.type==='image'?'video':c.type)===lane);
 const end=prior.reduce((a,c)=>Math.max(a,c.start+clipLength(c)),0);
 const start=typeof startAt==='number'?Math.max(0,startAt):end;
 const c={id:uid(),type,mediaId:id,start:Math.round(start*10)/10,in:0,out:Math.max(.25,Number(m.duration)||5),volume:1};
 state.clips.push(c);state.selected=c.id;state.playhead=start;updateAll();queueSave();
}
function addText(){
 remember();const c={id:uid(),type:'text',start:Math.max(0,state.playhead),duration:3,text:'O TEU TÍTULO',position:'center'};
 state.clips.push(c);state.selected=c.id;updateAll();queueSave();switchTab('text');
}
function clipTrack(c){return c.type==='image'?'video':c.type}
function drawTimeline(){
 const length=Math.max(projectLength()+8,35);
 const wide=Math.max($('#timeline-scroll').clientWidth,Math.ceil(length*state.zoom)+120);
 $('#timeline-inner').style.width=wide+'px';
 const labels=[];const step=state.zoom>=45?2:state.zoom>=23?5:10;
 for(let t=0;t<=length;t+=step){labels.push('<span class="tick" style="left:'+Math.round(t*state.zoom)+'px">'+formatTime(t).slice(0,5)+'</span>')}
 $('#ruler').innerHTML=labels.join('');
 for(const lane of ['text','video','audio']){
  const el=$('#track-'+lane);el.innerHTML='';
  state.clips.filter(c=>clipTrack(c)===lane).forEach(c=>{
   const m=findMedia(c.mediaId);
   const div=document.createElement('div');div.className='clip '+c.type+(state.selected===c.id?' selected':'');
   div.style.left=Math.round(c.start*state.zoom)+'px';
   div.style.width=Math.max(7,clipLength(c)*state.zoom)+'px';
   div.dataset.id=c.id;
   div.title=(c.type==='text'?c.text:(m?.name||'Ficheiro'))+' · '+formatTime(clipLength(c));
   div.innerHTML='<span class="clip-decor"></span>'+(lane==='audio'?'<span class="clip-wave"></span>':'')+'<span class="clip-label">'+(c.type==='text'?'T '+escapeHTML(c.text):(c.type==='audio'?'♫ ':'▣ ')+escapeHTML(m?.name||'Sem ficheiro'))+'</span>';
   div.addEventListener('pointerdown',e=>beginDrag(e,c,div));
   el.appendChild(div);
  });
 }
 $('#clip-counter').textContent=state.clips.length+' clips';
 $('#playhead').style.left=Math.round(state.playhead*state.zoom)+'px';
}
function beginDrag(e,c,el){
 if(e.button!==0)return;
 e.stopPropagation();e.preventDefault();select(c.id);
 const x=e.clientX,start=c.start;let didDrag=false;
 const move=ev=>{if(Math.abs(ev.clientX-x)>4)didDrag=true;if(!didDrag)return;const newStart=Math.max(0,Math.round((start+(ev.clientX-x)/state.zoom)*10)/10);const live=document.querySelector('.clip[data-id="'+c.id+'"]');if(live)live.style.left=(newStart*state.zoom)+'px'};
 const end=ev=>{
  window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);
  if(!didDrag)return;
  remember();
  let n=Math.max(0,Math.round((start+(ev.clientX-x)/state.zoom)*10)/10);
  if(typeof window.korsanSnapStart==='function')n=window.korsanSnapStart(n,c);
  if(clipTrack(c)==='video'&&ev.altKey){
   const other=state.clips.filter(x=>x.id!==c.id&&clipTrack(x)==='video'&&(x.track||'V1')===(c.track||'V1')).sort((a,b)=>a.start-b.start);
   const low=other.filter(x=>x.start<=n).reduce((a,x)=>Math.max(a,x.start+clipLength(x)),0);
   const next=other.find(x=>x.start>n);
   n=Math.max(n,low);
   if(next&&n+clipLength(c)>next.start){n=Math.max(0,next.start-clipLength(c))}
  }
  c.start=n;state.playhead=n;updateAll();queueSave();
 };
 window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
}
function updateCanvas(){
 const active=state.clips.filter(c=>(c.type==='video'||c.type==='image')&&state.playhead>=c.start&&state.playhead<c.start+clipLength(c)).sort((a,b)=>a.start-b.start).at(-1);
 const title=state.clips.filter(c=>c.type==='text'&&state.playhead>=c.start&&state.playhead<c.start+clipLength(c)).at(-1);
 $('#title-preview').className='title-preview '+(title?.position||'center')+(title?'':' hidden');
 $('#title-preview').textContent=title?.text||'';
 $('#empty-preview').classList.toggle('hidden',!!active);
 if(!active){video.classList.add('hidden');img.classList.add('hidden');if(!video.paused)video.pause();state.currentMediaId=null}
 else{
  const m=findMedia(active.mediaId),src='/media/'+encodeURIComponent(m?.id||'');
  if(active.type==='image'){img.classList.remove('hidden');video.classList.add('hidden');if(img.getAttribute('src')!==src)img.src=src;if(!video.paused)video.pause();state.currentMediaId=active.mediaId}
  else{video.classList.remove('hidden');img.classList.add('hidden');if(state.currentMediaId!==active.mediaId){video.src=src;state.currentMediaId=active.mediaId;video.addEventListener('loadedmetadata',syncVideo,{once:true})}syncVideo()}
 }
 $('#current-time').textContent=formatTime(state.playhead);
 $('#duration').textContent=formatTime(projectLength());
 $('#playhead').style.left=Math.round(state.playhead*state.zoom)+'px';
}
function syncVideo(){
 if(!video.src||video.classList.contains('hidden'))return;
 const active=state.clips.filter(c=>c.type==='video'&&state.playhead>=c.start&&state.playhead<c.start+clipLength(c)).at(-1);
 if(!active)return;
 const target=Math.max(0,active.in+state.playhead-active.start);
 if(video.readyState>=1&&Math.abs((video.currentTime||0)-target)>.35){try{video.currentTime=target}catch{}}
 if(state.playing&&video.paused)video.play().catch(()=>{});
}
function seek(t){state.playhead=Math.max(0,Math.min(projectLength(),Number(t)||0));updateCanvas()}
function playPause(){
 if(state.playing){state.playing=false;video.pause();music.pause();$('#play').textContent='▶';return}
 if(!projectLength())return toast('Adiciona um vídeo à timeline');
 state.playing=true;lastTick=performance.now();$('#play').textContent='Ⅱ';syncVideo();requestAnimationFrame(frame);
}
function frame(now){if(!state.playing)return;const dt=Math.min(.1,(now-lastTick)/1000);lastTick=now;state.playhead+=dt;if(state.playhead>=projectLength()){state.playhead=projectLength();playPause()}updateCanvas();if(state.playing)requestAnimationFrame(frame)}
function select(id){state.selected=id;drawTimeline();drawInspector()}
function drawInspector(){
 const el=$('#inspector'),c=state.clips.find(x=>x.id===state.selected);
 if(!c){el.innerHTML='<div class="inspector-empty"><span>◫</span><p>Seleciona um clip na timeline para editar as propriedades.</p></div>';return}
 const m=findMedia(c.mediaId);
 const input=(label,prop,value,step='.1')=>'<div class="field"><label>'+label+'</label><input type="number" step="'+step+'" min="0" data-prop="'+prop+'" value="'+Number(value||0).toFixed(2)+'"></div>';
 let fields='<div class="inspector-heading">'+escapeHTML(m?.name||'Título de texto')+'</div>';
 if(c.type==='text'){fields+='<div class="field"><label>Texto</label><textarea data-prop="text">'+escapeHTML(c.text)+'</textarea></div><div class="field"><label>Posição</label><select data-prop="position"><option value="top"'+(c.position==='top'?' selected':'')+'>Em cima</option><option value="center"'+(c.position==='center'?' selected':'')+'>Centro</option><option value="bottom"'+(c.position==='bottom'?' selected':'')+'>Em baixo</option></select></div>';fields+='<div class="fields-2">'+input('Início (s)','start',c.start)+input('Duração (s)','duration',c.duration)+'</div>'}
 else{fields+='<div class="fields-2">'+input('Início (s)','start',c.start)+input('Entrada (s)','in',c.in)+input('Saída (s)','out',c.out)+input('Volume','volume',c.volume,'.05')+'</div>'}
 fields+='<div class="inspector-actions"><button class="btn" id="duplicate-clip">Duplicar</button><button class="btn" id="remove-clip">Eliminar</button></div>';
 el.innerHTML=fields;
 $$('[data-prop]').forEach(x=>{
  x.addEventListener('change',()=>{remember();const prop=x.dataset.prop;let val=prop==='text'||prop==='position'?x.value:Number(x.value);if(typeof val==='number'&&!Number.isFinite(val))return;
    if(prop==='duration')val=Math.max(.1,val);if(prop==='start'||prop==='in')val=Math.max(0,val);
    if(prop==='out')val=Math.max(c.in+.1,val);
    if(prop==='volume')val=Math.max(0,Math.min(3,val));
    c[prop]=val;updateAll();queueSave()});
 });
 $('#duplicate-clip').onclick=()=>{remember();const n=JSON.parse(JSON.stringify(c));n.id=uid();n.start=c.start+clipLength(c);state.clips.push(n);state.selected=n.id;updateAll();queueSave()};
 $('#remove-clip').onclick=deleteClip;
}
function updateAll(){drawTimeline();drawInspector();updateCanvas()}
function deleteClip(){if(!state.selected)return;remember();state.clips=state.clips.filter(x=>x.id!==state.selected);state.selected=null;updateAll();queueSave()}
function splitClip(){
 const c=state.clips.find(x=>x.id===state.selected&&x.type!=='text');
 if(!c)return toast('Seleciona um vídeo ou áudio para dividir');
 const pos=state.playhead-c.start;if(pos<.12||pos>clipLength(c)-.12)return toast('Posiciona o cursor dentro do clip');
 remember();const second=JSON.parse(JSON.stringify(c));second.id=uid();second.in=c.in+pos;second.start=state.playhead;c.out=c.in+pos;state.clips.push(second);state.selected=second.id;updateAll();queueSave();toast('Clip dividido');
}
function undo(){const prev=state.history.pop();if(!prev)return toast('Não há alterações para desfazer');const p=JSON.parse(prev);state.clips=p.clips;state.selected=p.selected;updateAll();queueSave()}
async function exportVideo(){
 if(!state.clips.some(c=>c.type==='video'||c.type==='image'))return toast('Adiciona um vídeo ou imagem antes de exportar',true);
 $('#render-modal').classList.remove('hidden');$('#render-title').textContent='A exportar o teu vídeo';$('#render-description').textContent='O processamento é realizado localmente, sem enviar ficheiros para a cloud.';$('#download').classList.add('hidden');$('#progress-bar').style.width='0%';$('#progress-text').textContent='A preparar...';
 try{await api('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,aspect:state.aspect,quality:$('#quality').value,encoder:state.encoder||'cpu',clips:state.clips})});status('Exportação em curso...');clearInterval(state.renderTimer);state.renderTimer=setInterval(pollExport,1200);pollExport()}catch(e){toast(e.message,true);$('#render-modal').classList.add('hidden')}
}
async function pollExport(){
 try{const r=await api('/api/render');$('#progress-bar').style.width=Math.round(r.progress*100)+'%';$('#progress-text').textContent=Math.round(r.progress*100)+'% — '+(r.message||'');
  if(r.state==='done'){clearInterval(state.renderTimer);$('#render-title').textContent='O vídeo está pronto!';$('#render-description').textContent='Exportação concluída com sucesso.';$('#download').href='/renders/'+encodeURIComponent(r.file);$('#download').classList.remove('hidden');status('Exportação concluída');toast('Vídeo exportado com sucesso')}
  else if(r.state==='error'){clearInterval(state.renderTimer);$('#render-title').textContent='Falha na exportação';$('#render-description').textContent=r.message;$('#progress-text').textContent='Erro';status('Erro na exportação',true);toast(r.message,true)}
 }catch(e){console.error(e)}
}
async function init(){
 try{
   const [media,p]=await Promise.all([api('/api/library'),api('/api/project')]);
   state.media=media;state.clips=Array.isArray(p.clips)?p.clips:[];state.name=p.name||state.name;state.aspect=p.aspect||'16:9';
   $('#project-name').value=state.name;$('#aspect').value=state.aspect;
   aspectChange(false);drawLibrary();updateAll();status('Pronto para criar');
 }catch(e){toast('Não foi possível carregar o projeto: '+e.message,true)}
}
function aspectChange(saveIt=true){const portrait=$('#aspect').value==='9:16';state.aspect=portrait?'9:16':'16:9';$('#frame').classList.toggle('portrait',portrait);$('#frame').classList.toggle('landscape',!portrait);$('#canvas-badge').textContent=portrait?'1080 × 1920':'1920 × 1080';if(saveIt)queueSave()}
$('#import').onclick=()=>$('#file').click();$('#import-audio').onclick=()=>$('#file').click();
$('#file').addEventListener('change',e=>uploadFiles(Array.from(e.target.files)));
$('#add-text').onclick=addText;
$$('.rail-btn').forEach(x=>x.onclick=()=>switchTab(x.dataset.tab));
$('#project-name').addEventListener('input',e=>{state.name=e.target.value;queueSave()});
$('#aspect').addEventListener('change',()=>aspectChange());
$('#play').onclick=playPause;$('#prev').onclick=()=>seek(0);$('#next').onclick=()=>seek(projectLength());
$('#split').onclick=splitClip;$('#undo').onclick=undo;$('#delete').onclick=deleteClip;
$('#zoom').addEventListener('input',e=>{state.zoom=Number(e.target.value);drawTimeline()});
$('#export').onclick=exportVideo;$('#close-modal').onclick=()=>$('#render-modal').classList.add('hidden');
$('#render-modal').addEventListener('click',e=>{if(e.target.id==='render-modal')$('#render-modal').classList.add('hidden')});
$('#timeline-inner').addEventListener('pointerdown',e=>{if(e.target.closest('.clip'))return;const rect=$('#timeline-inner').getBoundingClientRect();seek((e.clientX-rect.left)/state.zoom)});
$$('.track').forEach(track=>{track.addEventListener('dragover',e=>e.preventDefault());track.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain'),m=findMedia(id);if(!m)return;const lane=track.dataset.type;if(lane!==(m.kind==='audio'?'audio':'video'))return toast('Arrasta o ficheiro para a pista correspondente');const rect=$('#timeline-inner').getBoundingClientRect();const x=e.clientX-rect.left;addMedia(id,Math.round(x/state.zoom*10)/10)})});
const drop=$('#dropzone');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');uploadFiles(Array.from(e.dataTransfer.files))});
document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(e.code==='Space'){e.preventDefault();playPause()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}else if(e.key.toLowerCase()==='s'&&!e.ctrlKey){e.preventDefault();splitClip()}else if(e.key==='Delete'||e.key==='Backspace'){deleteClip()}});
window.addEventListener('resize',()=>drawTimeline());
init();
