'use strict';
// V2 UI upgrade: 6 independently addressable timeline lanes, synchronized PiP preview.
(function(){
 const oldTimeline=drawTimeline,oldInspector=drawInspector,oldAddMedia=addMedia,oldAddText=addText,oldPlay=playPause;
 const frameEl=document.querySelector('#frame');
 const lanes=[{code:'T2',type:'text',name:'Títulos 2',before:'track-text'},{code:'V2',type:'video',name:'Sobreposição',before:'track-video'},{code:'A2',type:'audio',name:'Áudio 2',after:'track-audio'}];
 const baseTrack={text:'T1',video:'V1',image:'V1',audio:'A1'};
 function trackOf(c){return c.track||baseTrack[c.type]||'V1'}
 const labels={T1:'T1',T2:'T2',V1:'V1',V2:'V2',A1:'A1',A2:'A2'};
 function setState(c,code){
  c.track=code;
  if(code==='V2'&&!c.transform)c.transform={x:.63,y:.05,w:.34,h:.36};
 }
 for(const v of lanes){
  const rel=document.getElementById(v.before||v.after);
  if(!rel)continue;
  const track=document.createElement('div');track.id='track-'+v.code.toLowerCase();track.className='track';track.dataset.type=v.type;
  if(v.before)rel.parentElement.insertBefore(track,rel);else rel.after(track);
  const labelsParent=document.querySelector('.track-head');
  const trackIndex=Array.from(rel.parentElement.children).indexOf(track);
  const div=document.createElement('div');div.className='track-label';div.textContent=v.code;
  const small=document.createElement('small');small.textContent=v.name;div.appendChild(small);
  const beforeLabel=labelsParent.children[trackIndex]||null;
  labelsParent.insertBefore(div,beforeLabel);
  track.addEventListener('dragover',e=>e.preventDefault());
  track.addEventListener('drop',e=>{
   e.preventDefault();
   const id=e.dataTransfer.getData('text/plain'),m=findMedia(id);
   if(!m)return;
   const isAudio=m.kind==='audio';
   if((isAudio?'audio':'video')!==v.type){toast('Arrasta este ficheiro para uma pista compatível');return}
   const rect=document.querySelector('#timeline-inner').getBoundingClientRect();
   const offset=e.clientX-rect.left;
   oldAddMedia(id,Math.max(0,Math.round(offset/state.zoom*10)/10));
   const c=state.clips.find(x=>x.id===state.selected);
   if(c){setState(c,v.code);updateAll();queueSave()}
  });
 }
 const css=document.createElement('style');css.textContent='.editor{grid-template-rows:minmax(260px,1fr) 450px}.timeline-inner{height:392px}.track{height:60px}.timeline-body .timeline-inner{height:392px}.track-head{min-height:392px}#frame .v2-overlay{position:absolute;z-index:2;object-fit:contain;background:#050507}#frame #title-preview,#frame #v2-title-preview{z-index:3}#frame .v2-overlay.hidden{display:none}.track-label small{font-size:10px}#frame .pip-outline{position:absolute;z-index:4;border:1px dashed rgba(180,166,255,.8);pointer-events:none}.lane-help{margin:10px 0 12px;background:#2e2b40;border-radius:8px;padding:9px;color:#c8c1f5;font-size:11px}.multitrack-tag{color:#50d7c7;font-size:10px}';
 css.textContent += '.trim-grip{position:absolute;z-index:6;top:0;bottom:0;width:8px;background:#ffffff43;border:1px solid #ffffff77;cursor:ew-resize}.trim-grip.left{left:0;border-radius:5px 0 0 5px}.trim-grip.right{right:0;border-radius:0 5px 5px 0}.clip.selected .trim-grip{background:#ffffff80}';
 document.head.appendChild(css);
 document.querySelector('.version').textContent='ALPHA 0.2';
 document.querySelector('.timeline-title').insertAdjacentHTML('beforeend',' <span class="multitrack-tag">MULTIPISTA</span>');
 document.querySelector('#tab-media .drop-zone').insertAdjacentHTML('afterend','<p class="lane-help">PiP: arrasta para V2. Dissolve: sobrepõe clips em V1 e ajusta o Fade In. Alt + arrastar mantém os clips separados.</p>');
 const topLayer=document.createElement('video');topLayer.id='v2-video';topLayer.className='v2-overlay hidden';topLayer.playsInline=true;topLayer.preload='metadata';topLayer.muted=false;
 const topImage=document.createElement('img');topImage.id='v2-image';topImage.className='v2-overlay hidden';topImage.alt='Sobreposição';
 frameEl.append(topLayer,topImage);
 const title2=document.createElement('div');title2.id='v2-title-preview';title2.className='title-preview hidden';frameEl.appendChild(title2);
 const audioNodes=new Map();let activeV2=null;
 const lengthOf=c=>c.type==='text'?Math.max(.05,Number(c.duration)||0):Math.max(.05,Number(c.out)-Number(c.in));
 const inTime=c=>Number(c.in)||0;
 const findActive=(lane,t)=>state.clips.filter(c=>trackOf(c)===lane && t>=c.start && t<c.start+lengthOf(c)).sort((a,b)=>a.start-b.start).at(-1);
 const sync=(el,c,t,playing)=>{
  const m=findMedia(c.mediaId);if(!m)return;
  const src='/media/'+encodeURIComponent(m.id);
  const key='mediaId';
  if(el.dataset[key]!==m.id){el.dataset[key]=m.id;el.src=src;el.load()}
  const target=Math.max(0,inTime(c)+t-c.start);
  if(el.readyState>=1&&Math.abs((el.currentTime||0)-target)>(playing?.2:.008)){try{el.currentTime=target}catch{}}
  el.volume=Math.min(1,Math.max(0,Number(c.muted?0:(c.volume??1))));
  if(playing&&el.paused)el.play().catch(()=>{});
  if(!playing&&!el.paused)el.pause();
 };
 function rectFor(c){
  const tr=c.transform || {x:.63,y:.05,w:.34,h:.36};
  const x=Math.min(1,Math.max(0,Number(tr.x??.63)));
  const y=Math.min(1,Math.max(0,Number(tr.y??.05)));
  const w=Math.min(1-x,Math.max(.05,Number(tr.w??.34)));
  const h=Math.min(1-y,Math.max(.05,Number(tr.h??.36)));
  return {left:(x*100)+'%',top:(y*100)+'%',width:(w*100)+'%',height:(h*100)+'%'};
 }
 function drawCanvasV2(){
  const t=state.playhead;
  const base=findActive('V1',t);
  const pip=findActive('V2',t);
  const textActive=findActive('T1',t),textSecond=findActive('T2',t);
  const vid=document.querySelector('#preview'),pic=document.querySelector('#image-preview');
  document.querySelector('#empty-preview').classList.toggle('hidden',!!base||!!pip);
  if(!base){vid.classList.add('hidden');pic.classList.add('hidden');if(!vid.paused)vid.pause();state.currentMediaId=null}
  else if(base.type==='image'){
   pic.classList.remove('hidden');vid.classList.add('hidden');
   const src='/media/'+encodeURIComponent(base.mediaId);if(pic.getAttribute('src')!==src)pic.src=src;
   if(!vid.paused)vid.pause();
  }else{
   vid.classList.remove('hidden');pic.classList.add('hidden');
   sync(vid,base,t,state.playing);state.currentMediaId=base.mediaId;
  }
  if(!pip){topLayer.classList.add('hidden');topImage.classList.add('hidden');if(!topLayer.paused)topLayer.pause();activeV2=null}
  else {
   const style=rectFor(pip);
   const el=pip.type==='image'?topImage:topLayer;
   const other=pip.type==='image'?topLayer:topImage;
   Object.assign(el.style,style);el.classList.remove('hidden');other.classList.add('hidden');
   if(!topLayer.classList.contains('hidden')&&pip.type==='video')sync(topLayer,pip,t,state.playing);
   else{if(!topLayer.paused)topLayer.pause();const src='/media/'+encodeURIComponent(pip.mediaId);if(topImage.getAttribute('src')!==src)topImage.src=src}
   activeV2=pip.id;
  }
  const title=document.querySelector('#title-preview');
  title.className='title-preview '+(textActive?.position||'center')+(textActive?'':' hidden');
  title.textContent=textActive?.text||'';
  title2.className='title-preview '+(textSecond?.position||'center')+(textSecond?'':' hidden');
  title2.textContent=textSecond?.text||'';
  document.querySelector('#current-time').textContent=formatTime(t);
  document.querySelector('#duration').textContent=formatTime(projectLength());
  document.querySelector('#playhead').style.left=Math.round(t*state.zoom)+'px';
  for(const lane of ['A1','A2']){
   const c=findActive(lane,t);
   if(!c){if(audioNodes.has(lane)){audioNodes.get(lane).pause()}continue}
   if(!audioNodes.has(lane)){const a=new Audio();a.preload='metadata';audioNodes.set(lane,a)}
   sync(audioNodes.get(lane),c,t,state.playing);
  }
 }
 function snapToEdges(value,c){
  const edges=[0,state.playhead];
  for(const other of state.clips)if(other.id!==c.id){edges.push(other.start,other.start+lengthOf(other))}
  let best=value,bestDist=.14;
  for(const edge of edges){const d=Math.abs(value-edge);if(d<bestDist){best=edge;bestDist=d}}
  return Math.max(0,Math.round(best*100)/100);
 }
 window.korsanSnapStart=snapToEdges;
 function bindTrim(c,element){
  if(c.type==='text')return;
  for(const side of ['left','right']){
   const grip=document.createElement('span');
   grip.className='trim-grip '+side;grip.title=side==='left'?'Ajustar entrada':'Ajustar saída';
   element.appendChild(grip);
   grip.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    e.stopPropagation();e.preventDefault();
    const x=e.clientX,start=c.start,oldIn=c.in,oldOut=c.out,len=oldOut-oldIn;
    const media=findMedia(c.mediaId);
    const maxOut=media?.kind==='image'?Math.max(3600,oldOut):Number(media?.duration||oldOut);
    let diff=0;
    const move=ev=>{
     diff=(ev.clientX-x)/state.zoom;
     if(side==='left'){
       diff=Math.max(-oldIn,Math.min(len-.12,diff));
       element.style.left=(start+diff)*state.zoom+'px';
       element.style.width=Math.max(8,(len-diff)*state.zoom)+'px';
     }else{
       diff=Math.max(.12-len,Math.min(maxOut-oldOut,diff));
       element.style.width=Math.max(8,(len+diff)*state.zoom)+'px';
     }
    };
    const end=ev=>{
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);
      if(Math.abs(diff)<.02){drawTimeline();return}
      remember();
      if(side==='left'){c.in=oldIn+diff;c.start=Math.max(0,start+diff)}
      else c.out=oldOut+diff;
      updateAll();queueSave();
    };
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
   });
  }
 }
 drawTimeline=function(){
  for(const code of ['T2','V2','A2'])document.getElementById('track-'+code.toLowerCase())?.replaceChildren();
  oldTimeline();
  for(const code of Object.keys(labels)){
   if(code==='T1'||code==='V1'||code==='A1')continue;
   const row=document.getElementById('track-'+code.toLowerCase());
   if(!row)continue;
   state.clips.filter(c=>trackOf(c)===code).forEach(c=>{
    const el=document.querySelector('.clip[data-id="'+c.id+'"]');
    if(el)row.appendChild(el);
   });
  }
  for(const c of state.clips){const el=document.querySelector('.clip[data-id="'+c.id+'"]');if(el)bindTrim(c,el)}
 };
 drawInspector=function(){
  oldInspector();
  const c=state.clips.find(x=>x.id===state.selected);
  if(!c)return;
  const control=document.createElement('div');control.className='field';
  const fieldOptions=c.type==='text'?['T1','T2']:c.type==='audio'?['A1','A2']:['V1','V2'];
  control.innerHTML='<label>Pista da timeline</label><select id="v2-lane">'+fieldOptions.map(code=>'<option value="'+code+'"'+(trackOf(c)===code?' selected':'')+'>'+code+(code==='V2'?' · Overlay / PiP':'')+'</option>').join('')+'</select>';
  const inspector=document.querySelector('#inspector');
  inspector.insertBefore(control,inspector.children[1]||null);
  control.querySelector('select').addEventListener('change',e=>{
   remember();setState(c,e.target.value);updateAll();queueSave();
  });
  if(c.type==='video'||c.type==='image'){
   const pip=trackOf(c)==='V2';
   const box=document.createElement('div');box.id='v2-geometry';
   if(pip){
    const tr=c.transform||{x:.63,y:.05,w:.34,h:.36};
    box.innerHTML='<div class="lane-help">Posição e tamanho da sobreposição (%)</div>'+
      [['x','Esquerda'],['y','Topo'],['w','Largura'],['h','Altura']].map(([k,name])=>'<div class="field"><label>'+name+'</label><input type="number" data-transform="'+k+'" min="0" max="100" step="1" value="'+Math.round((tr[k]??0)*100)+'"></div>').join('');
    box.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>{
      remember();if(!c.transform)c.transform={x:.63,y:.05,w:.34,h:.36};
      c.transform[x.dataset.transform]=Math.max(0,Math.min(1,Number(x.value)/100));
      updateAll();queueSave();
    }));
   }
   inspector.appendChild(box);
  }
 };
 addMedia=function(id,startAt){
  oldAddMedia(id,startAt);
  const c=state.clips.find(x=>x.id===state.selected);
  if(c&&!c.track)c.track=baseTrack[c.type];
  updateAll();queueSave();
 };
 addText=function(){oldAddText();const c=state.clips.find(x=>x.id===state.selected);if(c)c.track='T1';updateAll();queueSave()};
 updateCanvas=drawCanvasV2;
 syncVideo=drawCanvasV2;
 playPause=function(){oldPlay();if(!state.playing){topLayer.pause();for(const a of audioNodes.values())a.pause()}else drawCanvasV2()};
 // An independent track must never be blocked by clips in a different video lane.
 document.querySelectorAll('.track').forEach(track=>track.addEventListener('click',()=>{}));
})();
