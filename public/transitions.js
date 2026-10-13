/* KORSAN Studio transition engine (shared Node/renderer). Original implementation. */
(function(root,factory){const out=factory();if(typeof module==='object'&&module.exports)module.exports=out;if(root)root.KorsanTransitions=out})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TYPES=[
  {id:'dissolve',name:'Dissolver',group:'Suaves',icon:'◐'},
  {id:'wipe-left',name:'Wipe à esquerda',group:'Wipe',icon:'◀'},
  {id:'wipe-right',name:'Wipe à direita',group:'Wipe',icon:'▶'},
  {id:'wipe-up',name:'Wipe para cima',group:'Wipe',icon:'▲'},
  {id:'wipe-down',name:'Wipe para baixo',group:'Wipe',icon:'▼'},
  {id:'slide-left',name:'Deslizar à esquerda',group:'Movimento',icon:'⇠'},
  {id:'slide-right',name:'Deslizar à direita',group:'Movimento',icon:'⇢'},
  {id:'slide-up',name:'Deslizar para cima',group:'Movimento',icon:'⇡'},
  {id:'slide-down',name:'Deslizar para baixo',group:'Movimento',icon:'⇣'},
  {id:'circle-open',name:'Círculo expandir',group:'Criativas',icon:'◉'},
  {id:'diagonal',name:'Wipe diagonal',group:'Criativas',icon:'◩'},
  {id:'zoom-in',name:'Zoom In',group:'Criativas',icon:'⤢'}
 ];
 const ids=new Set(TYPES.map(x=>x.id));
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
 const fmt=n=>Number(n).toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
 const length=c=>c.type==='text'?Math.max(.05,+c.duration||0):Math.max(.05,(+c.out||0)-(+c.in||0));
 const lane=c=>c.track||((c.type==='video'||c.type==='image')?'V1':c.type==='audio'?'A1':'T1');
 const video=c=>(c.type==='video'||c.type==='image')&&lane(c)==='V1';
 function previous(clips,clip){
  return clips.filter(c=>c.id!==clip.id&&video(c)&&c.start<clip.start+.001)
   .sort((a,b)=>a.start-b.start).at(-1)||null;
 }
 function get(c){const o=c?.transition;return o&&ids.has(o.type)?{type:o.type,duration:clamp(o.duration||.6,.1,3)}:null}
 function progress(clip,time){const t=get(clip);return t?clamp((time-clip.start)/t.duration,0,1):1}
 function apply(clips,incoming,type,requested=.7){
  if(!ids.has(type))throw Error('Transição desconhecida');
  const before=previous(clips,incoming);
  if(!before)throw Error('É preciso um clip V1 anterior para aplicar uma transição');
  if(incoming.transition)remove(clips,incoming);
  const end=before.start+length(before);
  const oldStart=incoming.start,duration=clamp(requested,.1,Math.min(3,length(before)*.9,length(incoming)*.9));
  const start=Math.max(before.start+.03,end-duration);
  // Move every clip starting at the same time/later, preserving synchronization and no gap downstream.
  const move=Math.max(0,oldStart-start);
  if(oldStart>end+.08)throw Error('Os clips estão afastados. Junta-os primeiro na timeline.');
  if(oldStart<end-duration-.06)throw Error('Os clips já se sobrepõem demasiado. Reduz a sobreposição.');
  for(const c of clips)if(c.start>=oldStart-.001)c.start=Math.max(0,+(c.start-move).toFixed(3));
  incoming.transition={type,duration,previousId:before.id,originalStart:oldStart,shift:move};
  return incoming.transition;
 }
 function remove(clips,incoming){
  const t=incoming.transition;if(!t)return;
  if(t.shift>0){const start=incoming.start;for(const c of clips)if(c.start>=start-.001)c.start=+(c.start+t.shift).toFixed(3)}
  delete incoming.transition;
 }
 function ffAlpha(type,variable,duration){
  const p='min(1,max(0,('+variable+'/'+fmt(duration)+')))';
  const raw={
   dissolve:p,
   'wipe-left':'gte(X/W,1-'+p+')',
   'wipe-right':'lte(X/W,'+p+')',
   'wipe-up':'gte(Y/H,1-'+p+')',
   'wipe-down':'lte(Y/H,'+p+')',
   'circle-open':'lte(sqrt(pow((X/W-0.5)*2,2)+pow((Y/H-0.5)*2,2)),'+p+'*1.5)',
   diagonal:'lte((X/W+Y/H)/2,'+p+')',
   'slide-left':'1','slide-right':'1','slide-up':'1','slide-down':'1','zoom-in':p
  };
  return raw[type]||p;
 }
 function ffSlide(type,variable,duration,W,H){
  const p='min(1,max(0,('+variable+'/'+fmt(duration)+')))';
  return ({
   'slide-left':{x:'('+W+'*(1-'+p+'))',y:'0'},
   'slide-right':{x:'(-'+W+'*(1-'+p+'))',y:'0'},
   'slide-up':{x:'0',y:'('+H+'*(1-'+p+'))'},
   'slide-down':{x:'0',y:'(-'+H+'*(1-'+p+'))'}
  })[type]||{x:'0',y:'0'};
 }
 function preview(type,p){
  const u=clamp(p,0,1),pct=v=>(v*100).toFixed(3)+'%';
  switch(type){
   case 'wipe-left':return {clipPath:'inset(0 0 0 '+pct(1-u)+')'};
   case 'wipe-right':return {clipPath:'inset(0 '+pct(1-u)+' 0 0)'};
   case 'wipe-up':return {clipPath:'inset('+pct(1-u)+' 0 0 0)'};
   case 'wipe-down':return {clipPath:'inset(0 0 '+pct(1-u)+' 0)'};
   case 'circle-open':return {clipPath:'circle('+pct(u*75)+' at 50% 50%)'};
   case 'diagonal':return {clipPath:'polygon(0 0,'+pct(u*2)+' 0,'+pct(u*2)+' '+pct(u*2)+',0 '+pct(u*2)+')'};
   case 'slide-left':return {transform:'translateX('+pct(1-u)+')'};
   case 'slide-right':return {transform:'translateX('+pct(u-1)+')'};
   case 'slide-up':return {transform:'translateY('+pct(1-u)+')'};
   case 'slide-down':return {transform:'translateY('+pct(u-1)+')'};
   case 'zoom-in':return {transform:'scale('+(0.8+u*.2).toFixed(4)+')',opacity:u};
   default:return {opacity:u};
  }
 }
 return {TYPES,ids,clamp,fmt,length,lane,video,previous,get,progress,apply,remove,ffAlpha,ffSlide,preview};
});
