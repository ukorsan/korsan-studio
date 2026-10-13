'use strict';
/* V9: first-class transition editor between overlapping clips on V1. */
(function(){
 const TR=window.KorsanTransitions;
 if(!TR)throw Error('Transition model missing');
 const $=s=>document.querySelector(s),oldInspector=drawInspector,oldTimeline=drawTimeline,oldCanvas=updateCanvas;
 let chosen='dissolve',seconds=.7;
 const panel=$('#tab-transitions');
 const grid=$('#transition-grid'),durationInput=$('#transition-duration');
 const labels=Object.fromEntries(TR.TYPES.map(t=>[t.id,t.name]));
 const iconMap={'dissolve':'◐','wipe-left':'⇠','wipe-right':'⇢','wipe-up':'⇡','wipe-down':'⇣','slide-left':'⟵','slide-right':'⟶','slide-up':'↑','slide-down':'↓','circle-open':'◉','diagonal':'◪','zoom-in':'⊕'};
 function v1(){return state.clips.filter(TR.video).sort((a,b)=>a.start-b.start)}
 function incomingClip(){
  const c=state.clips.find(c=>c.id===state.selected);if(!c||!TR.video(c))return null;
  const all=v1(),idx=all.indexOf(c);
  return idx>0?c:(idx===0&&all.length>1?all[1]:null);
 }
 function report(msg,error=false){const el=$('#transition-help');el.textContent=msg;el.classList.toggle('error',error);if(error)toast(msg,true)}
 function applyTransition(type=chosen){
  const c=incomingClip();if(!c)return report('Coloca dois clips na pista V1 e seleciona o segundo para aplicar uma transição.',true);
  try{
   remember();TR.apply(state.clips,c,type,seconds);
   state.selected=c.id;state.playhead=c.start+Math.min(seconds*.5,TR.length(c));
   updateAll();queueSave();report('Aplicada: '+labels[type]+' · '+seconds.toFixed(1)+' s entre os clips.');
   toast('Transição: '+labels[type]);
  }catch(e){report(e.message,true)}
 }
 function remove(){
  const c=incomingClip();if(!c?.transition)return report('Seleciona um clip com transição.',true);
  remember();TR.remove(state.clips,c);state.selected=c.id;state.playhead=c.start;
  updateAll();queueSave();report('Transição removida.');
 }
 const groups=[...new Set(TR.TYPES.map(x=>x.group))];
 for(const group of groups){
  const heading=document.createElement('h3');heading.className='tr-group';heading.textContent=group;grid.append(heading);
  const row=document.createElement('div');row.className='tr-grid';
  for(const item of TR.TYPES.filter(t=>t.group===group)){
   const button=document.createElement('button');button.className='tr-card';button.dataset.transition=item.id;
   const symbol=document.createElement('div');symbol.className='tr-visual';symbol.textContent=item.icon;
   const label=document.createElement('span');label.textContent=item.name;
   button.append(symbol,label);
   button.onclick=()=>{
    chosen=item.id;grid.querySelectorAll('.tr-card').forEach(b=>b.classList.toggle('active',b.dataset.transition===chosen));
    const clip=incomingClip();
    if(clip)applyTransition(chosen);else report('Seleciona o segundo clip na pista V1 para aplicar '+item.name+'.');
   };
   row.append(button);
  }
  grid.append(row);
 }
 grid.querySelector('.tr-card').classList.add('active');
 durationInput.value=seconds;
 durationInput.addEventListener('input',()=>{seconds=TR.clamp(durationInput.value,.1,3);$('#tr-duration-value').textContent=seconds.toFixed(1)+' s'});
 $('#tr-apply').onclick=()=>applyTransition();
 $('#tr-remove').onclick=remove;
 $('#tr-duration-value').textContent=seconds.toFixed(1)+' s';
 drawInspector=function(){
  oldInspector();
  const c=state.clips.find(c=>c.id===state.selected);
  if(!c||!TR.video(c))return;
  const prior=TR.previous(state.clips,c);
  const box=document.createElement('div');box.className='tr-inspector';
  const transition=TR.get(c),header=transition?labels[transition.type]+' · '+transition.duration.toFixed(1)+' s':'Sem transição';
  box.innerHTML='<div class="tr-inspector-title">✦ Transições</div><p class="tr-small">'+header+'</p>'+
    '<div class="tr-inspector-controls"><button class="btn" id="tr-open">Escolher</button><button class="btn" id="tr-remove-selected" '+(!transition?'disabled':'')+'>Remover</button></div>'+
    '<small class="tr-small">'+(prior?'Entre este clip e o anterior na pista V1.':'Seleciona o próximo clip V1 para aplicar.')+'</small>';
  $('#inspector').append(box);
  box.querySelector('#tr-open').onclick=()=>switchTab('transitions');
  box.querySelector('#tr-remove-selected').onclick=remove;
 };
 drawTimeline=function(){
  oldTimeline();
  for(const c of state.clips){
   if(!TR.video(c)||!TR.get(c))continue;
   const el=document.querySelector('.clip[data-id="'+c.id+'"]');if(!el)continue;
   const marker=document.createElement('span');marker.className='tr-marker';marker.title=labels[c.transition.type]+' · '+c.transition.duration+' s';marker.textContent='✦';
   marker.style.left='2px';marker.style.width=Math.max(24,c.transition.duration*state.zoom)+'px';
   marker.onpointerdown=e=>{e.preventDefault();e.stopPropagation();select(c.id);switchTab('transitions')};
   el.append(marker);
  }
 };
 updateCanvas=function(){
  oldCanvas();
  const t=state.playhead;
  const active=v1().filter(c=>t>=c.start&&t<c.start+TR.length(c)).at(-1);
  for(const element of [$('#preview'),$('#image-preview')]){
   if(!element)continue;
   element.style.clipPath='';
   if(!active?.transition)continue;
   const transition=TR.get(active),p=TR.progress(active,t);
   if(!transition||p>=1)continue;
   const fx=TR.preview(transition.type,p);
   if(fx.clipPath)element.style.clipPath=fx.clipPath;
   if(fx.opacity!==undefined)element.style.opacity=(Number(element.style.opacity)||1)*fx.opacity;
   if(fx.transform)element.style.transform=(element.style.transform||'')+' '+fx.transform;
  }
 };
 window.KorsanTransitionsUI={apply:applyTransition,remove,incomingClip};
 $('.version').textContent='ALPHA 0.9';
 updateCanvas();
})();
