'use strict';
(function(){
 const beforeDraw=drawInspector,beforeCanvas=updateCanvas,FPS=30;
 const duration=c=>c.type==='text'?Math.max(.05,Number(c.duration)||0):Math.max(.05,Number(c.out)-Number(c.in));
 const track=c=>c.track||(c.type==='text'?'T1':c.type==='audio'?'A1':'V1');
 const active=(tr,t)=>state.clips.filter(c=>track(c)===tr&&c.start<=t&&c.start+duration(c)>t).sort((a,b)=>a.start-b.start);
 const opacity=(c,t)=>{if(!c)return 1;const elapsed=t-c.start,remaining=c.start+duration(c)-t;const start=Math.max(0,Number(c.fadeIn)||0),end=Math.max(0,Number(c.fadeOut)||0);return Math.max(0,Math.min(1,start?elapsed/start:1,end?remaining/end:1))};
 const oldRemember=remember;
 state.future=[];
 remember=function(){oldRemember();state.future.length=0};
 const snapshot=()=>JSON.stringify({clips:state.clips,selected:state.selected});
 const restore=s=>{const p=JSON.parse(s);state.clips=p.clips;state.selected=p.selected;updateAll();queueSave()};
 undo=function(){if(!state.history.length){toast('Nada para desfazer');return}state.future.push(snapshot());restore(state.history.pop())};
 const redo=()=>{if(!state.future.length){toast('Nada para refazer');return}state.history.push(snapshot());restore(state.future.pop())};
 document.querySelector('#undo').onclick=undo;
 const redoBtn=document.createElement('button');redoBtn.id='redo';redoBtn.className='tool';redoBtn.textContent='↷ Refazer';redoBtn.title='Ctrl+Y';document.querySelector('#undo').after(redoBtn);redoBtn.onclick=redo;
 const ripple=document.createElement('button');ripple.id='ripple-delete';ripple.className='tool';ripple.textContent='⇤ Ripple';ripple.title='Eliminar e fechar espaço na pista';document.querySelector('#delete').after(ripple);
 ripple.onclick=()=>{const c=state.clips.find(x=>x.id===state.selected);if(!c)return toast('Seleciona um clip');remember();const end=c.start+duration(c),len=duration(c),tr=track(c);state.clips=state.clips.filter(x=>x.id!==c.id);state.clips.forEach(x=>{if(track(x)===tr&&x.start>=end-.001)x.start=Math.max(0,x.start-len)});state.selected=null;updateAll();queueSave()};
 const frame=document.querySelector('#frame'),main=document.querySelector('#preview');
 const prev=document.createElement('video');prev.id='v3-behind';prev.playsInline=true;prev.preload='metadata';prev.muted=true;prev.className='v3-behind hidden';
 const prevImg=document.createElement('img');prevImg.id='v3-behind-image';prevImg.className='v3-behind hidden';prevImg.alt='Clip anterior';
 frame.insertBefore(prev,main);frame.insertBefore(prevImg,main);
 const css=document.createElement('style');css.textContent='.v3-behind{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#09090c}.v3-behind.hidden{display:none}.frame-control{font-size:12px}.v3-detail{color:#68e2c1;font-size:10px}.timeline-tools .tool{white-space:nowrap}';document.head.appendChild(css);
 document.querySelector('.version').textContent='ALPHA 0.3';
 document.querySelector('.timeline-title').insertAdjacentHTML('beforeend',' <span class="v3-detail">DISSOLVE / FRAMES</span>');
 const backBtn=document.createElement('button'),nextBtn=document.createElement('button');
 for(const [button,id,label] of [[backBtn,'frame-back','◀|'],[nextBtn,'frame-next','|▶']]){button.id=id;button.textContent=label;button.className='control frame-control'}
 const play=document.querySelector('#play');play.before(backBtn);play.after(nextBtn);
 const frameLabel=document.createElement('span');frameLabel.id='v3-frame';frameLabel.className='v3-detail';document.querySelector('.playback').append(frameLabel);
 const frameStep=n=>{if(state.playing)playPause();seek(Math.max(0,Math.min(projectLength(),Math.round(state.playhead*FPS+n)/FPS)))};
 backBtn.title='Recuar fotograma (←)';nextBtn.title='Avançar fotograma (→)';backBtn.onclick=()=>frameStep(-1);nextBtn.onclick=()=>frameStep(1);
 drawInspector=function(){
  beforeDraw();const c=state.clips.find(x=>x.id===state.selected);if(!c||c.type==='text')return;
  const panel=document.createElement('div');panel.id='v3-fades';
  panel.innerHTML='<div class="lane-help">Transições · Dissolve / Fade</div>'+['fadeIn','fadeOut'].map(k=>'<div class="field"><label>'+(k==='fadeIn'?'Fade in (segundos)':'Fade out (segundos)')+'</label><input data-fade="'+k+'" type="number" min="0" max="4" step="0.1" value="'+Number(c[k]||0).toFixed(2)+'"></div>').join('')+'<button class="btn block" id="v3-preset">Dissolve 0,5 s</button>';
  document.querySelector('#inspector').append(panel);
  for(const input of panel.querySelectorAll('[data-fade]'))input.addEventListener('change',()=>{remember();c[input.dataset.fade]=Math.max(0,Math.min(4,Number(input.value)||0));updateAll();queueSave()});
  panel.querySelector('#v3-preset').onclick=()=>{remember();c.fadeIn=.5;c.fadeOut=.5;updateAll();queueSave()};
 };
 const syncPrevious=c=>{
  if(!c){prev.classList.add('hidden');prevImg.classList.add('hidden');prev.pause();return}
  const src='/media/'+encodeURIComponent(c.mediaId);
  if(c.type==='image'){prev.classList.add('hidden');prev.pause();prevImg.classList.remove('hidden');if(prevImg.getAttribute('src')!==src)prevImg.src=src;return}
  prevImg.classList.add('hidden');prev.classList.remove('hidden');
  if(prev.dataset.mediaId!==c.mediaId){prev.dataset.mediaId=c.mediaId;prev.src=src;prev.load()}
  const t=Math.max(0,Number(c.in||0)+state.playhead-c.start);
  if(prev.readyState>=1&&Math.abs(prev.currentTime-t)>(state.playing?.15:.008))prev.currentTime=t;
  if(state.playing&&prev.paused)prev.play().catch(()=>{});
  if(!state.playing&&!prev.paused)prev.pause();
 };
 updateCanvas=function(){
  beforeCanvas();
  const t=state.playhead,fronts=active('V1',t),front=fronts.at(-1),second=active('V2',t).at(-1);
  syncPrevious(fronts.length>1?fronts.at(-2):null);
  const alpha=opacity(front,t),piAlpha=opacity(second,t);
  document.querySelector('#preview').style.opacity=alpha;
  document.querySelector('#image-preview').style.opacity=alpha;
  document.querySelector('#v2-video').style.opacity=piAlpha;
  document.querySelector('#v2-image').style.opacity=piAlpha;
  if(front&&!document.querySelector('#preview').classList.contains('hidden'))document.querySelector('#preview').volume=Math.max(0,Math.min(1,Number(front.muted?0:(front.volume??1))*alpha));
  if(second&&!document.querySelector('#v2-video').classList.contains('hidden'))document.querySelector('#v2-video').volume=Math.max(0,Math.min(1,Number(second.muted?0:(second.volume??1))*piAlpha));
  frameLabel.textContent='F '+String(Math.round(t*FPS)).padStart(5,'0');
 };
 const nudge=n=>{const c=state.clips.find(x=>x.id===state.selected);if(!c)return frameStep(n);remember();c.start=Math.max(0,Math.round((c.start+n/FPS)*FPS)/FPS);updateAll();queueSave()};
 document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const ctrl=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
  if(ctrl&&(key==='y'||(key==='z'&&e.shiftKey))){e.preventDefault();e.stopImmediatePropagation();redo();return}
  if(ctrl&&key==='z'){e.preventDefault();e.stopImmediatePropagation();undo();return}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();const n=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?FPS:1);if(ctrl)nudge(n);else frameStep(n)}
 },true);
 window.KorsanV3={redo,frameStep,ripple:()=>ripple.click(),opacity};
 updateCanvas();
})();
