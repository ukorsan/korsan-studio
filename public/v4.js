'use strict';
// V4: waveform cache visualization, GPU export selector and video clock drift corrections.
(function(){
 const previousDraw=drawTimeline,previousCanvas=updateCanvas;
 const memory=new Map();
 const fetchWaveform=id=>{
  if(!memory.has(id)){
   const p=fetch('/api/waveform/'+encodeURIComponent(id))
     .then(r=>{if(!r.ok)throw Error('Não foi possível gerar forma de onda');return r.json()})
     .catch(e=>{console.warn('Waveform skipped:',e.message);return null});
   memory.set(id,p);
  }
  return memory.get(id);
 };
 const style=document.createElement('style');
 style.textContent='.clip-wave-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.86;pointer-events:none;z-index:1}.clip-label{position:relative;z-index:2;text-shadow:0 1px 3px #0a0d1caa}.clip .trim-grip{z-index:8}.wave-note{font-size:10px;color:#8ee5ce;padding:6px 0}.quality.v4-export{margin-left:3px}.clip.audio{background:linear-gradient(125deg,#194c4c,#205b53)}';
 document.head.append(style);
 document.querySelector('.version').textContent='ALPHA 0.4';
 document.querySelector('.timeline-title').insertAdjacentHTML('beforeend',' <span class="v3-detail">WAVEFORMS / GPU</span>');
 const label=document.createElement('label');
 label.className='quality v4-export';
 label.innerHTML='Codificação <select id="v4-encoder"><option value="cpu">CPU · H.264</option><option value="nvenc" disabled>RTX 4060 · NVENC</option></select>';
 document.querySelector('#quality').closest('label').after(label);
 state.encoder='cpu';
 const selector=label.querySelector('select');
 selector.addEventListener('change',()=>{state.encoder=selector.value;toast(selector.value==='nvenc'?'Codificador NVIDIA selecionado':'Codificador CPU selecionado')});
 fetch('/api/capabilities').then(r=>r.json()).then(data=>{
  selector.querySelector('option[value="nvenc"]').disabled=!data.h264NvencListed;
  selector.title=data.h264NvencListed?'NVENC disponível no FFmpeg. Depende de GPU/driver.':'NVENC não disponível nesta instalação do FFmpeg';
 }).catch(()=>{});
 document.querySelector('#tab-audio').insertAdjacentHTML('beforeend','<p class="wave-note">As ondas de áudio são geradas localmente e guardadas em cache, sem alterar os ficheiros originais.</p>');
 function drawWave(canvas,data,c){
  if(!canvas.isConnected||!data?.peaks?.length)return;
  const box=canvas.parentElement;
  const width=Math.min(2800,Math.max(40,Math.round(box.getBoundingClientRect().width*devicePixelRatio)));
  const height=Math.round(44*devicePixelRatio);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);
  const track= c.type==='audio' ? '#83ffdc' : '#ddcffb';
  const duration=Math.max(.001,Number(data.duration)||1),a=Math.max(0,Number(c.in)||0),b=Math.max(a+.01,Number(c.out)||a+1);
  const first=Math.floor(a/duration*data.peaks.length),last=Math.max(first+1,Math.ceil(b/duration*data.peaks.length));
  ctx.strokeStyle=track;ctx.lineWidth=Math.max(1,devicePixelRatio);ctx.beginPath();
  for(let x=1;x<width-1;x+=2){
   const binA=first+(x/width)*(last-first);
   const binB=first+((x+2)/width)*(last-first);
   let peak=0;
   for(let k=Math.floor(binA);k<=Math.ceil(binB);k++)peak=Math.max(peak,data.peaks[Math.min(data.peaks.length-1,Math.max(0,k))]||0);
   const h=Math.max(.8,Math.min(1,peak)*height*.45);
   ctx.moveTo(x,height/2-h);ctx.lineTo(x,height/2+h);
  }
  ctx.stroke();
 }
 const activeCanvases=[];
 drawTimeline=function(){
  previousDraw();
  for(const c of state.clips){
   const media=findMedia(c.mediaId);
   if(!media?.hasAudio||c.type==='text')continue;
   const node=document.querySelector('.clip[data-id="'+c.id+'"]');
   if(!node)continue;
   const canvas=document.createElement('canvas');canvas.className='clip-wave-canvas';
   node.insertBefore(canvas,node.firstChild);
   fetchWaveform(c.mediaId).then(result=>{
    if(!result||!canvas.isConnected)return;
    drawWave(canvas,result,c);
   });
  }
 };
 const getActive=(lane,t)=>state.clips.filter(c=>(c.track||({video:'V1',image:'V1',audio:'A1',text:'T1'}[c.type]))===lane && c.start<=t && c.start+Math.max(.04,Number(c.out||0)-Number(c.in||0))>t).at(-1);
 function adjustPlayer(player,clip,t){
  if(!clip||player.classList.contains('hidden')||player.readyState<1)return;
  const target=Math.max(0,(Number(clip.in)||0)+t-clip.start);
  const drift=target-player.currentTime;
  if(!state.playing){
   player.playbackRate=1;
   if(Math.abs(drift)>.022){try{player.currentTime=target}catch{}}
  }else if(Math.abs(drift)>.25){
   player.playbackRate=1;
   try{player.currentTime=target}catch{}
  }else player.playbackRate=Math.max(.94,Math.min(1.06,1+drift*.35));
 }
 updateCanvas=function(){
  previousCanvas();
  const t=state.playhead;
  adjustPlayer(document.querySelector('#preview'),getActive('V1',t),t);
  adjustPlayer(document.querySelector('#v2-video'),getActive('V2',t),t);
  const overlaps=state.clips.filter(c=>(c.track||'V1')==='V1'&&c.type==='video'&&t>=c.start&&t<c.start+Math.max(.04,Number(c.out)-Number(c.in))).sort((a,b)=>a.start-b.start);
  const previous=overlaps.length>1?overlaps.at(-2):null;
  const behind=document.querySelector('#v3-behind');
  if(behind&&previous&&!behind.classList.contains('hidden')){
   behind.muted=false;
   behind.volume=Math.min(1,Math.max(0,Number(previous.muted?0:(previous.volume??1))));
   adjustPlayer(behind,previous,t);
  }else if(behind){behind.muted=true}
 };
 const priorInspector=drawInspector;
 drawInspector=function(){
  priorInspector();
  const clip=state.clips.find(c=>c.id===state.selected);
  if(!clip||clip.type==='text')return;
  const mute=document.createElement('button');
  mute.id='v4-mute';mute.className='btn block';
  mute.textContent=clip.muted?'Ativar som do clip':'Silenciar clip';
  mute.title='Silenciar apenas este clip, sem alterar o volume guardado';
  mute.onclick=()=>{remember();clip.muted=!clip.muted;drawInspector();updateCanvas();queueSave()};
  document.querySelector('#inspector').appendChild(mute);
 };
 const oldExport=exportVideo;
 exportVideo=async function(){return oldExport()};
 document.querySelector('#export').onclick=exportVideo;
 window.KorsanV4={getWaveform:fetchWaveform,drawWave,encoder:()=>state.encoder};
 // GUI smoke tests inspect UI and waveform after direct media insertion.
})();
