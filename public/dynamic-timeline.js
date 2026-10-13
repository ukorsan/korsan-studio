'use strict';
/* Compact timeline: show V1 only when empty, reveal tracks only as needed. */
(function(){
 const originalDraw=drawTimeline,originalAdd=addMedia,originalText=addText;
 const order=[
  {code:'T2',id:'track-t2'},{code:'T1',id:'track-text'},
  {code:'V2',id:'track-v2'},{code:'V1',id:'track-video'},
  {code:'A1',id:'track-audio'},{code:'A2',id:'track-a2'}
 ];
 const chosen=new Set(),trackOf=c=>c.track||({text:'T1',video:'V1',image:'V1',audio:'A1'}[c.type]||'V1');
 const tool=document.createElement('div');tool.className='dynamic-lanes-menu';
 const button=document.createElement('button');button.type='button';button.className='tool dynamic-add';button.id='add-track';button.title='Show another track';button.textContent='+ Track';
 const popup=document.createElement('div');popup.className='dynamic-lanes-popup hidden';popup.id='track-menu';
 const options=[['V2','Video overlay · V2'],['T1','Titles · T1'],['A1','Audio · A1'],['T2','Extra titles · T2'],['A2','Extra audio · A2']];
 for(const [code,label] of options){
  const action=document.createElement('button');action.type='button';action.textContent=label;action.dataset.lane=code;
  action.onclick=()=>{
   chosen.add(code);popup.classList.add('hidden');updateLayout();
   const c=state.clips.find(x=>x.id===state.selected);
   const compatible=c&&(code.startsWith('V')?['video','image'].includes(c.type):code.startsWith('T')?c.type==='text':c.type==='audio');
   if(compatible){remember();c.track=code;if(code==='V2'&&!c.transform)c.transform={x:.63,y:.05,w:.34,h:.36,rotation:0,opacity:1};updateAll();queueSave()}
  };
  popup.append(action);
 }
 tool.append(button,popup);button.onclick=()=>popup.classList.toggle('hidden');
 document.addEventListener('pointerdown',e=>{if(!tool.contains(e.target))popup.classList.add('hidden')});
 document.querySelector('.timeline-title').after(tool);
 function nodes(){
  const labels=Array.from(document.querySelectorAll('.track-head .track-label'));
  return order.map((t,i)=>({...t,row:document.getElementById(t.id),label:labels[i]}));
 }
 function updateLayout(){
  const visible=new Set(state.clips.map(trackOf));visible.add('V1');
  for(const lane of nodes()){
   const show=visible.has(lane.code)||chosen.has(lane.code);
   if(lane.row){lane.row.style.display=show?'':'none';lane.row.dataset.visible=String(show)}
   if(lane.label){lane.label.style.display=show?'':'none';lane.label.dataset.visible=String(show)}
  }
  const count=order.filter(c=>visible.has(c.code)||chosen.has(c.code)).length;
  document.documentElement.style.setProperty('--dynamic-timeline-height',Math.min(480,Math.max(206,116+count*60))+'px');
  const inner=document.querySelector('#timeline-inner');if(inner)inner.style.height=(32+60*count)+'px';
  const head=document.querySelector('.track-head');if(head)head.style.minHeight=(32+60*count)+'px';
  button.title='Visible tracks: '+order.filter(x=>visible.has(x.code)||chosen.has(x.code)).map(x=>x.code).join(', ');
 }
 drawTimeline=function(){originalDraw();updateLayout()};
 addMedia=function(id,startAt){originalAdd(id,startAt);updateLayout()};
 addText=function(){originalText();updateLayout()};
 const style=document.createElement('style');
 style.textContent=[
 ':root{--dynamic-timeline-height:206px}',
 '.editor{grid-template-rows:minmax(250px,1fr) var(--dynamic-timeline-height)!important}',
 '.timeline-inner,.timeline-body .timeline-inner{min-height:0!important}',
 '.track-head{min-height:0!important}',
 '.dynamic-lanes-menu{position:relative;flex-shrink:0}',
 '#add-track{border:1px solid #4e4c62;border-radius:7px;background:#272833;font-weight:700;padding:7px 11px;color:#e5dcfa}',
 '.dynamic-lanes-popup{position:absolute;bottom:calc(100% + 6px);left:0;display:flex;flex-direction:column;gap:2px;min-width:195px;background:#262633;border:1px solid #575066;border-radius:9px;padding:6px;z-index:30;box-shadow:0 12px 45px #000a}',
 '.dynamic-lanes-popup button{color:#e7e5f5;border:0;text-align:left;background:none;padding:9px;border-radius:5px;white-space:nowrap}',
 '.dynamic-lanes-popup button:hover{background:#504966}',
 '.timeline-title .multitrack-tag,.timeline-title .v3-detail,#tab-media .lane-help,#tab-audio .wave-note,.statusbar>span:last-child{display:none}',
 '.timeline-tools{gap:10px}.timeline-title{white-space:nowrap}'
 ].join('\n');
 document.head.append(style);
 updateLayout();
 window.KorsanDynamicTimeline={updateLayout,chosen,lanes:nodes};
})();
