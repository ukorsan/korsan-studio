'use strict';
/* Trusted local SVG catalog. Does not fetch logos from the internet. */
const brands=require('simple-icons'),lucide=require('lucide-static');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug=s=>String(s).replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase();
const color=s=>/^[0-9A-Fa-f]{6}$/.test(String(s||'').replace(/^#/,''))?'#'+String(s).replace('#','').toUpperCase():null;
const brandMap=new Map();
for(const b of Object.values(brands))if(b&&typeof b==='object'&&b.slug&&b.svg)brandMap.set(b.slug,{id:b.slug,name:b.title,kind:'brands',color:'#'+b.hex,svg:b.svg,source:'Simple Icons · marcas registadas dos respetivos titulares'});
const iconMap=new Map();
for(const [key,svg] of Object.entries(lucide)){
 if(typeof svg!=='string'||!svg.includes('<svg'))continue;
 const id=slug(key);if(!iconMap.has(id))iconMap.set(id,{id,name:key.replace(/([a-z])([A-Z])/g,'$1 $2'),kind:'icons',color:'#E8E0FF',svg,source:'Lucide · ISC'});
}
const featuredBrands='youtube twitch tiktok discord instagram x facebook reddit spotify telegram whatsapp kick steam epicgames obsstudio github nvidia playstation xbox snapchat pinterest linkedin patreon apple android openai soundcloud'.split(' ');
const featuredIcons='arrow-right arrow-left arrow-up arrow-down chevron-right play pause bell thumbs-up message-circle camera mic gamepad-2 flame star heart triangle-alert circle-check mouse-pointer-click send share-2 volume-2 volume-x sparkles clapperboard video radio download upload smile clock eye gift rocket target trophy circle-help users search'.split(' ');
const groups={
 social:'youtube twitch tiktok discord instagram x facebook reddit telegram whatsapp snapchat linkedin pinterest',
 gaming:'twitch kick steam epicgames discord playstation xbox nvidia obsstudio',
 creator:'youtube twitch tiktok instagram kick obsstudio patreon reddit discord',
 music:'spotify soundcloud applemusic shazam'
};
for(const b of brandMap.values()){
 b.featured=featuredBrands.includes(b.id);
 b.tags=Object.keys(groups).filter(k=>groups[k].split(' ').includes(b.id));
 b.alias=b.id==='youtube'?'YT shorts subscribe':b.id==='x'?'twitter':b.id==='twitch'?'stream streaming':b.id==='kick'?'stream streaming':'';
}
for(const a of iconMap.values())a.featured=featuredIcons.includes(a.id);
const shapes=[
 ['rounded-rectangle','Retângulo arredondado','shapes'],
 ['circle','Círculo','shapes'],['outline-frame','Moldura retangular','frames'],
 ['circle-frame','Moldura circular','frames'],['pointer-arrow','Seta destaque','shapes'],
 ['speech-bubble','Balão de conversa','shapes'],['neon-underline','Linha neon','frames'],
 ['lower-third','Lower third','overlays'],['subscribe','SUBSCRIBE','social'],
 ['live','LIVE','social'],['follow','FOLLOW','social'],['new','NEW','social'],
 ['trending','TRENDING','social'],['like','LIKE','social'],['share','SHARE','social'],
 ['comment','COMMENT','social'],['progress','Barra de progresso','overlays'],
 ['focus-corners','Cantos de foco','frames'],['neon-pill','Etiqueta neon','overlays']
].map(([id,name,category])=>({id,name,kind:'shapes',color:'#9B83FF',source:'KORSAN · MIT',tags:[category],featured:true}));
const shapeMap=new Map(shapes.map(s=>[s.id,s]));
const catalogs={brands:brandMap,icons:iconMap,shapes:shapeMap};
const base=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+body+'</svg>';
function shapeSVG(id,c){
 const stroke='stroke="'+c+'" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"';
 const textNames={subscribe:'SUBSCRIBE',live:'LIVE',follow:'FOLLOW',new:'NEW',trending:'TRENDING',like:'LIKE',share:'SHARE',comment:'COMMENT'};
 if(textNames[id]){
  const label=textNames[id],font=label.length>8?50:label.length>6?65:95,bg=id==='live'?'#EC2355':c;
  return base('<rect x="23" y="180" width="466" height="152" rx="42" fill="'+bg+'"/><text x="256" y="278" font-family="Arial,sans-serif" font-weight="900" fill="#fff" font-size="'+font+'" text-anchor="middle">'+label+'</text>');
 }
 const parts={
  'rounded-rectangle':'<rect x="40" y="135" width="432" height="242" rx="60" fill="'+c+'"/>',
  circle:'<circle cx="256" cy="256" r="198" fill="'+c+'"/>',
  'outline-frame':'<rect x="40" y="40" width="432" height="432" rx="34" '+stroke+'/>',
  'circle-frame':'<circle cx="256" cy="256" r="208" '+stroke+'/>',
  'pointer-arrow':'<path d="M55 345 L340 85 L330 220 L462 252 L77 427 Z" fill="'+c+'"/>',
  'speech-bubble':'<path d="M65 80 H447 Q482 80 482 115 V348 Q482 383 447 383 H220 L87 463 V383 H65 Q30 383 30 348 V115 Q30 80 65 80 Z" fill="'+c+'"/>',
  'neon-underline':'<path d="M40 274 H472" stroke="'+c+'" stroke-width="25" stroke-linecap="round"/>',
  'lower-third':'<rect x="20" y="242" width="472" height="125" rx="18" fill="#171923"/><rect x="20" y="242" width="20" height="125" rx="5" fill="'+c+'"/><path d="M54 346 H455" stroke="'+c+'" stroke-width="5"/>',
  progress:'<rect x="30" y="225" width="452" height="60" rx="30" fill="#eee" opacity=".4"/><rect x="30" y="225" width="280" height="60" rx="30" fill="'+c+'"/>',
  'focus-corners':'<path d="M50 186 V72 H182 M330 72 H462 V186 M462 324 V440 H330 M182 440 H50 V324" '+stroke+'/>',
  'neon-pill':'<rect x="34" y="190" width="444" height="130" rx="65" fill="#121626" stroke="'+c+'" stroke-width="12"/>'
 };
 return base(parts[id]||'');
}
function lookup(kind,id){
 if(!catalogs[kind]||!/^[a-z0-9-]{1,100}$/.test(String(id||'')))return null;
 return catalogs[kind].get(id)||null;
}
function svgFor(kind,id,tint){
 const asset=lookup(kind,id);if(!asset)return null;
 const c=color(tint)||asset.color;
 if(kind==='shapes')return shapeSVG(id,c);
 if(kind==='icons')return asset.svg.replace(/currentColor/g,c);
 return asset.svg.replace(/<svg\b/,'<svg fill="'+c+'"');
}
function search({kind='brands',q='',category='',offset=0,limit=48}={}){
 if(!catalogs[kind])return null;
 const needle=normalize(String(q).slice(0,100).trim());
 let list=[...catalogs[kind].values()];
 if(category)list=list.filter(x=>(x.tags||[]).includes(normalize(category)));
 if(needle)list=list.filter(x=>normalize(x.name+' '+x.id+' '+(x.alias||'')).includes(needle));
 list.sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||a.name.localeCompare(b.name));
 return {total:list.length,items:list.slice(offset,offset+limit).map(({id,name,kind,color,source,tags})=>({id,name,kind,color,source,tags}))};
}
module.exports={lookup,svgFor,search,catalogs};
