'use strict';
/**
 * KORSAN Video Editor — GIPHY discovery only.
 * Direct browser -> api.giphy.com and media.giphy.com traffic.
 * No cache, proxy, URL rewriting, saved media, or timeline import.
 * The key lives in sessionStorage, not the editor project or local server.
 */
(function(){
 const root=document.querySelector('#tab-giphy');
 if(!root)return;
 const $=s=>root.querySelector(s);
 const state={key:sessionStorage.getItem('korsan-giphy-beta-key')||'',type:'gifs',search:'',offset:0,count:0,busy:false,token:0,controller:null};
 const API='https://api.giphy.com/v1/';
 const safePage=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(['giphy.com','www.giphy.com'].includes(u.hostname))?u.href:''}catch{return ''}};
 const safeMedia=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(/^media\d*\.giphy\.com$/.test(u.hostname)||u.hostname==='i.giphy.com')?u.href:''}catch{return ''}};
 const setMessage=(value,invalid=false)=>{const t=$('#giphy-status');t.textContent=value;t.style.color=invalid?'#f6a5a5':''};
 const keyInput=$('#giphy-key');keyInput.value=state.key;
 $('#giphy-save-key').addEventListener('click',()=>{
  const key=keyInput.value.trim();
  if(!/^[a-zA-Z0-9_-]{12,200}$/.test(key)){setMessage('Introduz uma chave API GIPHY válida.',true);return}
  state.key=key;sessionStorage.setItem('korsan-giphy-beta-key',key);
  setMessage('Chave configurada para esta sessão. A carregar tendências…');
  search(false);
 });
 $('#giphy-clear-key').addEventListener('click',()=>{
  state.key='';keyInput.value='';sessionStorage.removeItem('korsan-giphy-beta-key');
  state.controller?.abort();state.token++;
  $('#giphy-results').replaceChildren();$('#giphy-more').hidden=true;
  setMessage('Chave desligada. Não é guardada no projeto.');
 });
 $('#giphy-kind').addEventListener('change',e=>{
  state.type=e.target.value;state.search=$('#giphy-query').value.trim();search(false);
 });
 $('#giphy-search').addEventListener('submit',e=>{e.preventDefault();state.search=$('#giphy-query').value.trim();search(false)});
 $('#giphy-trending').addEventListener('click',()=>{$('#giphy-query').value='';state.search='';search(false)});
 $('#giphy-more').addEventListener('click',()=>search(true));
 const renderItem=item=>{
  const card=document.createElement('article');card.className='giphy-card';
  const preview=safeMedia(item?.images?.fixed_width?.webp||item?.images?.fixed_width?.url||item?.images?.fixed_height?.url);
  if(!preview)return null;
  const img=document.createElement('img');img.loading='lazy';img.alt=String(item?.title||'GIF GIPHY').slice(0,200);img.src=preview;card.appendChild(img);
  const footer=document.createElement('div');footer.className='giphy-item-meta';
  const title=document.createElement('span');title.textContent=(item?.title||'GIF / Sticker').slice(0,90);
  footer.appendChild(title);
  const creator=item?.user?.display_name||item?.username;
  if(creator){const by=document.createElement('small');by.textContent='Por '+String(creator).slice(0,70);footer.appendChild(by)}
  card.appendChild(footer);
  const actions=document.createElement('div');actions.className='giphy-actions';
  const page=safePage(item?.url);
  if(page){
   const link=document.createElement('a');link.className='giphy-link';link.href=page;link.rel='noopener noreferrer';link.target='_blank';link.textContent='Ver na GIPHY';actions.appendChild(link);
  }
  const hint=document.createElement('span');hint.textContent='Pré-visualização';hint.className='giphy-only-preview';actions.appendChild(hint);
  card.appendChild(actions);
  return card;
 };
 async function search(append=false){
  if(!state.key){setMessage('Cria uma chave GIPHY API e introduz-a acima.',true);return}
  if(state.busy&&append)return;
  state.controller?.abort();
  const abort=new AbortController();state.controller=abort;
  const seq=++state.token;
  const query=$('#giphy-query').value.trim();
  const type=state.type;
  if(!append){state.offset=0;state.search=query;$('#giphy-results').replaceChildren()}
  const offset=append?state.offset:0;
  const endpoint=query?'search':'trending';
  const url=new URL(API+type+'/'+endpoint);
  url.searchParams.set('api_key',state.key);
  url.searchParams.set('limit','16');
  url.searchParams.set('offset',String(offset));
  url.searchParams.set('rating','g');
  if(query)url.searchParams.set('q',query);
  url.searchParams.set('lang','en');
  state.busy=true;$('#giphy-more').disabled=true;
  setMessage('A pesquisar diretamente na GIPHY…');
  try{
   const response=await fetch(url.href,{signal:abort.signal,cache:'no-store',referrerPolicy:'no-referrer'});
   if(!response.ok){
    if(response.status===429)throw Error('Limite da chave Beta atingido. Aguarda antes de pesquisar novamente.');
    if(response.status===401||response.status===403)throw Error('Chave recusada pela GIPHY. Confirma-a no Dashboard.');
    throw Error('A GIPHY respondeu com HTTP '+response.status);
   }
   const data=await response.json();
   if(seq!==state.token)return;
   const list=Array.isArray(data?.data)?data.data:[];
   const fragment=document.createDocumentFragment();
   for(const item of list){const card=renderItem(item);if(card)fragment.appendChild(card)}
   $('#giphy-results').appendChild(fragment);
   state.offset=offset+list.length;
   state.count=Number(data?.pagination?.total_count)||0;
   $('#giphy-more').hidden=list.length<16||(state.count>0&&state.offset>=state.count);
   setMessage(list.length?'Resultados: '+$('#giphy-results').children.length+' · '+(query?'Pesquisa':'Tendências'):'Sem resultados. Experimenta outra pesquisa.');
  }catch(e){
   if(e.name!=='AbortError')setMessage(e.message||'Não foi possível contactar a GIPHY.',true);
  }finally{
   if(seq===state.token){state.busy=false;$('#giphy-more').disabled=false}
  }
 }
 if(state.key)setMessage('Chave disponível nesta sessão. Pesquisa ou abre tendências.');
 // Do not fetch GIPHY or its media without explicit user action or key submission.
 window.KorsanGiphy={search,version:'preview-only'};
})();
