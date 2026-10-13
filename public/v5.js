'use strict';
/* Clean-room visual keyframe controls for KORSAN V5. */
(function(){
 const K=window.KorsanKeyframes;
 if(!K)throw Error('Shared keyframe engine unavailable');
 const priorInspector=drawInspector,priorTimeline=drawTimeline,priorCanvas=updateCanvas;
 const frame=document.querySelector('#frame');
 document.querySelector('.version').textContent='ALPHA 0.5';
 const styles=document.createElement('style');
 styles.textContent='.v5-header{font-size:11px;font-weight:800;border-top:1px solid #3d4052;margin:16px 0 12px;padding-top:12px}.v5-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v5-controls .field{margin:0 0 7px}.v5-row{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.v5-row .btn{font-size:11px;padding:7px;flex:1}.v5-list{display:flex;flex-wrap:wrap;gap:5px}.v5-list button{font-size:10px;background:#373247;color:#eee;border:1px solid #665988;border-radius:5px;padding:5px}.v5-help{color:#aaa4ba;font-size:11px;line-height:1.6}.v5-marker{position:absolute;top:3px;width:8px;height:8px;z-index:7;transform:rotate(45deg);background:#f4ceff;border:1px solid #8f4da6;cursor:pointer}.v5-box{position:absolute;z-index:8;border:2px solid #d9b8ff;cursor:grab;pointer-events:auto;box-shadow:0 0 0 1px #0008}.v5-box.hidden{display:none}.v5-handle{position:absolute;width:11px;height:11px;background:#fcfaff;border:1px solid #715ea1;border-radius:2px}.v5-handle.nw{left:-6px;top:-6px;cursor:nwse-resize}.v5-handle.ne{right:-6px;top:-6px;cursor:nesw-resize}.v5-handle.sw{left:-6px;bottom:-6px;cursor:nesw-resize}.v5-handle.se{right:-6px;bottom:-6px;cursor:nwse-resize}.v5-handle.rot{left:calc(50% - 5px);top:-25px;background:#74d8c6;cursor:crosshair;border-radius:50%}#v2-video,#v2-image,#preview,#image-preview,#v3-behind,#v3-behind-image{transform-origin:50% 50%}';
 document.head.appendChild(styles);
 const overlay=document.createElement('div');overlay.id='v5-stage-box';overlay.className='v5-box hidden';
 for(const name of ['nw','ne','sw','se','rot']){const el=document.createElement('span');el.className='v5-handle '+name;el.dataset.handle=name;overlay.appendChild(el)}
 frame.appendChild(overlay);
 const lane=c=>c.track||(c.type==='image'?'V1':c.type==='video'?'V1':c.type==='audio'?'A1':'T1');
 const active=(tr,t)=>state.clips.filter(c=>lane(c)===tr&&t>=c.start&&t<c.start+K.duration(c)).sort((a,b)=>a.start-b.start).at(-1);
 const selected=()=>state.clips.find(c=>c.id===state.selected);
 const time=c=>K.clamp(state.playhead-c.start,0,K.duration(c));
 function animate(el,c,t){
  if(!el||!c){if(el){el.style.filter='';el.style.transform=''}return}
  const v=K.sample(c,K.clamp(t-c.start,0,K.duration(c)));
  el.style.left=(v.x*100)+'%';el.style.top=(v.y*100)+'%';el.style.width=(v.w*100)+'%';el.style.height=(v.h*100)+'%';
  el.style.objectFit='fill';el.style.transform='rotate('+v.rotation+'deg)';el.style.filter=K.cssFilters(c);
  const local=t-c.start,len=K.duration(c),fin=Math.max(0,c.fadeIn||0),fout=Math.max(0,c.fadeOut||0);
  const fade=Math.min(1,fin?local/fin:1,fout?(len-local)/fout:1);
  el.style.opacity=String(Math.max(0,Math.min(1,v.opacity*fade)));
 }
 updateCanvas=function(){
  priorCanvas();const t=state.playhead;
  const front=active('V1',t),pip=active('V2',t);
  const all=state.clips.filter(c=>lane(c)==='V1'&&t>=c.start&&t<c.start+K.duration(c)).sort((a,b)=>a.start-b.start);
  const behind=all.length>1?all.at(-2):null;
  animate(document.querySelector('#preview'),front,t);animate(document.querySelector('#image-preview'),front,t);
  animate(document.querySelector('#v3-behind'),behind,t);animate(document.querySelector('#v3-behind-image'),behind,t);
  animate(document.querySelector('#v2-video'),pip,t);animate(document.querySelector('#v2-image'),pip,t);
  if(pip&&state.selected===pip.id){
   const v=K.sample(pip,t-pip.start);
   overlay.style.left=(v.x*100)+'%';overlay.style.top=(v.y*100)+'%';overlay.style.width=(v.w*100)+'%';overlay.style.height=(v.h*100)+'%';
   overlay.style.transform='rotate('+v.rotation+'deg)';overlay.classList.remove('hidden');
  }else overlay.classList.add('hidden');
 };
 function changeTransform(c,key,value){
  remember();const v=K.clamp(value,...K.limits[key]);
  if(K.keys(c).length)K.setKey(c,time(c),{[key]:v});
  else c.transform={...K.initial(c),[key]:v};
  updateAll();queueSave();
 }
 drawInspector=function(){
  priorInspector();const c=selected();if(!c||!['video','image'].includes(c.type))return;
  const v=K.sample(c,time(c)),keys=K.keys(c),p=document.createElement('div');p.id='v5-inspector';
  const fields=[['x','X (%)',100],['y','Y (%)',100],['w','Largura (%)',100],['h','Altura (%)',100],['rotation','Rotação (°)',1],['opacity','Opacidade (%)',100]];
  p.innerHTML='<div class="v5-header">◆ Keyframes ('+keys.length+')</div>'+
    '<p class="v5-help">Move o cursor para criar ou editar pontos. Arrasta o vídeo V2 na pré-visualização para alterar posição ou tamanho.</p>'+
    '<div class="v5-controls">'+fields.map(([k,name,m])=>'<div class="field"><label>'+name+'</label><input type="number" data-key="'+k+'" value="'+K.round(v[k]*m,2)+'"></div>').join('')+'</div>'+
    '<div class="v5-row"><button class="btn" id="v5-add">◆ Adicionar</button><button class="btn" id="v5-remove">Remover</button></div>'+
    '<div class="v5-list">'+keys.map(k=>'<button data-time="'+k.time+'">◆ '+formatTime(k.time)+'</button>').join('')+'</div>'+
    '<div class="v5-header">Presets de animação</div><div class="v5-row">'+
    [['zoom-in','Zoom In'],['zoom-out','Zoom Out'],['slide-left','Slide Left'],['slide-right','Slide Right'],['fade-in','Fade In'],['spin-in','Spin In']].map(([key,label])=>'<button class="btn" data-preset="'+key+'">'+label+'</button>').join('')+
    '</div><div class="v5-header">Filtros de imagem</div><div class="v5-controls">'+
    [['brightness','Brilho (%)',100],['contrast','Contraste (%)',100],['saturation','Saturação (%)',100],['blur','Desfoque (px)',1]].map(([k,label,m])=>'<div class="field"><label>'+label+'</label><input type="number" data-fx="'+k+'" value="'+K.round(K.filters(c)[k]*m,2)+'"></div>').join('')+
    '</div><button class="btn block" id="v5-reset">Repor filtros</button>';
  document.querySelector('#inspector').appendChild(p);
  p.querySelectorAll('[data-key]').forEach(el=>el.onchange=()=>changeTransform(c,el.dataset.key,Number(el.value)/(el.dataset.key==='rotation'?1:100)));
  p.querySelector('#v5-add').onclick=()=>{remember();K.setKey(c,time(c),{});updateAll();queueSave()};
  p.querySelector('#v5-remove').onclick=()=>{remember();K.removeKey(c,time(c));updateAll();queueSave()};
  p.querySelectorAll('[data-time]').forEach(el=>el.onclick=()=>{seek(c.start+Number(el.dataset.time));drawInspector()});
  p.querySelectorAll('[data-preset]').forEach(el=>el.onclick=()=>{remember();K.applyPreset(c,el.dataset.preset);updateAll();queueSave()});
  p.querySelectorAll('[data-fx]').forEach(el=>el.onchange=()=>{
   remember();const key=el.dataset.fx,m=key==='blur'?1:100;
   c.filters={...K.filters(c),[key]:Number(el.value)/m};updateAll();queueSave();
  });
  p.querySelector('#v5-reset').onclick=()=>{remember();c.filters={brightness:0,contrast:1,saturation:1,blur:0};updateAll();queueSave()};
 };
 drawTimeline=function(){
  priorTimeline();
  for(const c of state.clips){
   if(!['video','image'].includes(c.type))continue;
   const parent=document.querySelector('.clip[data-id="'+c.id+'"]');if(!parent)continue;
   for(const k of K.keys(c)){
    const dot=document.createElement('span');dot.className='v5-marker';dot.style.left=(Math.min(99,k.time/K.duration(c)*100))+'%';
    dot.title='Keyframe '+formatTime(k.time);
    dot.onpointerdown=e=>{e.preventDefault();e.stopPropagation();select(c.id);seek(c.start+k.time);drawInspector()};
    parent.append(dot);
   }
  }
 };
 overlay.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const c=active('V2',state.playhead);if(!c)return;
  e.preventDefault();e.stopPropagation();if(state.selected!==c.id){select(c.id);return}
  const mode=e.target.dataset.handle||'move',rect=frame.getBoundingClientRect();
  const pt={x:e.clientX,y:e.clientY},original=K.sample(c,time(c));remember();
  let moved=false;
  const drag=ev=>{
   const dx=(ev.clientX-pt.x)/rect.width,dy=(ev.clientY-pt.y)/rect.height;if(Math.abs(dx)+Math.abs(dy)<.002&&!moved)return;
   moved=true;const val={...original};
   if(mode==='move'){val.x+=dx;val.y+=dy}
   else if(mode==='rot')val.rotation+=(ev.clientX-pt.x)*.7;
   else{
    if(mode.includes('e'))val.w+=dx;
    if(mode.includes('s'))val.h+=dy;
    if(mode.includes('w')){val.x+=dx;val.w-=dx}
    if(mode.includes('n')){val.y+=dy;val.h-=dy}
   }
   for(const k of K.props)val[k]=K.clamp(val[k],...K.limits[k]);
   if(K.keys(c).length)K.setKey(c,time(c),val);else c.transform={...K.initial(c),...val};
   updateCanvas();
  };
  const end=()=>{window.removeEventListener('pointermove',drag);window.removeEventListener('pointerup',end);if(moved){updateAll();queueSave()}};
  window.addEventListener('pointermove',drag);window.addEventListener('pointerup',end);
 });
 window.KorsanV5={K,active,changeTransform};
 updateCanvas();
})();
