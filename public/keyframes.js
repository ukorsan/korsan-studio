/* KORSAN V5 shared keyframe geometry and interpolation. Independent clean-room code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.KorsanKeyframes=api})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const props=['x','y','w','h','rotation','opacity'];
 const limits={x:[-1.5,1.5],y:[-1.5,1.5],w:[.05,2],h:[.05,2],rotation:[-360,360],opacity:[0,1]};
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(v))?Number(v):lo));
 const round=(n,d=5)=>Number(Number(n).toFixed(d));
 const duration=c=>c.type==='text'?Math.max(.04,Number(c.duration)||1):Math.max(.04,Number(c.out||1)-Number(c.in||0));
 function initial(c){
  const pip=c.track==='V2';
  const base=pip?{x:.63,y:.05,w:.34,h:.36,rotation:0,opacity:1}:{x:0,y:0,w:1,h:1,rotation:0,opacity:1};
  const tr=c.transform||{};
  for(const key of props)if(Number.isFinite(Number(tr[key])) && tr[key]!==undefined && tr[key]!==null)base[key]=clamp(tr[key],...limits[key]);
  return base;
 }
 function keys(c){
  if(!Array.isArray(c.keyframes))return [];
  return c.keyframes.filter(k=>k&&Number.isFinite(Number(k.time))).map(k=>({...k,time:clamp(k.time,0,Math.max(.04,duration(c)))}))
    .sort((a,b)=>a.time-b.time).slice(0,100);
 }
 function ease(u,mode){
  const t=clamp(u,0,1);
  return mode==='smooth'?t*t*(3-2*t):t;
 }
 function sample(c,relative){
  const base=initial(c),list=keys(c);
  if(!list.length)return base;
  const t=clamp(relative,0,duration(c));
  const first=list[0],last=list.at(-1);
  const merged=k=>Object.fromEntries(props.map(p=>[p,clamp(k[p]??base[p],...limits[p])]));
  if(t<=first.time)return merged(first);
  if(t>=last.time)return merged(last);
  let i=0;while(i<list.length-1 && t>list[i+1].time)i++;
  const a=list[i],b=list[i+1];
  const u=ease((t-a.time)/(b.time-a.time||1),b.easing||'linear');
  return Object.fromEntries(props.map(p=>[p,round(clamp(Number(a[p]??base[p])+(Number(b[p]??base[p])-Number(a[p]??base[p]))*u,...limits[p]))]));
 }
 function setKey(c,time,patch){
  const current=sample(c,time);
  const t=round(clamp(time,0,duration(c)),3);
  const k={time:t,...current,...patch};
  for(const p of props)k[p]=round(clamp(k[p],...limits[p]));
  if(!Array.isArray(c.keyframes))c.keyframes=[];
  const idx=c.keyframes.findIndex(o=>Math.abs(Number(o.time)-t)<.017);
  if(idx>=0)c.keyframes[idx]=k;else c.keyframes.push(k);
  c.keyframes.sort((a,b)=>a.time-b.time);
  return k;
 }
 function removeKey(c,time){
  if(!Array.isArray(c.keyframes))return;
  c.keyframes=c.keyframes.filter(k=>Math.abs(k.time-time)>.0167);
 }
 const number=n=>round(n,6).toString();
 function expression(c,prop,variable){
  const k=keys(c),base=initial(c);
  if(!k.length)return number(base[prop]);
  // All values are from the validated allowlisted numeric properties.
  const v=o=>number(clamp(o[prop]??base[prop],...limits[prop]));
  let result=v(k.at(-1));
  for(let i=k.length-2;i>=0;i--){
   const a=k[i],b=k[i+1],dt=Math.max(.001,b.time-a.time);
   const u='(('+variable+'-'+number(a.time)+')/'+number(dt)+')';
   const t=b.easing==='smooth'?'('+u+'*'+u+'*(3-2*'+u+'))':u;
   const linear='('+v(a)+'+('+v(b)+'-'+v(a)+')*'+t+')';
   result='if(lt('+variable+','+number(b.time)+'),'+linear+','+result+')';
  }
  return 'if(lt('+variable+','+number(k[0].time)+'),'+v(k[0])+','+result+')';
 }
 function applyPreset(c,preset){
  const base=initial(c),d=Math.min(1.5,duration(c));
  let a={...base},b={...base};
  switch(preset){
   case 'zoom-in':a.w*=.75;a.h*=.75;a.x+=(base.w-a.w)/2;a.y+=(base.h-a.h)/2;break;
   case 'zoom-out':b.w*=.75;b.h*=.75;b.x+=(base.w-b.w)/2;b.y+=(base.h-b.h)/2;break;
   case 'slide-left':a.x=-base.w;break;
   case 'slide-right':a.x=1;break;
   case 'fade-in':a.opacity=0;break;
   case 'spin-in':a.rotation=-25;a.opacity=0;break;
   default:throw Error('Unknown animation preset');
  }
  c.keyframes=[];
  setKey(c,0,a);setKey(c,d,b);
  if(c.keyframes.length>1)c.keyframes[1].easing='smooth';
 }
 function filters(c){
  const f=c.filters||{};
  return {
   brightness:clamp(f.brightness??0,-.5,.5),
   contrast:clamp(f.contrast??1,.25,3),
   saturation:clamp(f.saturation??1,0,3),
   blur:clamp(f.blur??0,0,14)
  };
 }
 function cssFilters(c){
  const f=filters(c);
  return 'brightness('+round(1+f.brightness)+') contrast('+round(f.contrast)+') saturate('+round(f.saturation)+') blur('+round(f.blur)+'px)';
 }
 return {props,limits,clamp,round,duration,initial,keys,sample,setKey,removeKey,expression,applyPreset,filters,cssFilters};
});
