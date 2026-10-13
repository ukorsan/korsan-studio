'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../public/transitions.js');
const stock=require('../stock-library.js');
function fixture(){return [
 {id:'a',type:'video',track:'V1',start:0,in:0,out:3},
 {id:'b',type:'video',track:'V1',start:3,in:0,out:3},
 {id:'c',type:'video',track:'V1',start:6,in:0,out:3}
]}
test('twelve distinct transitions',()=>{assert.equal(T.TYPES.length,12);assert.equal(new Set(T.TYPES.map(t=>t.id)).size,12)});
test('transition overlaps adjacent clips and preserves later relative timings',()=>{
 const a=fixture();T.apply(a,a[1],'dissolve',.7);assert.ok(Math.abs(a[1].start-2.3)<.001);assert.ok(Math.abs(a[2].start-5.3)<.001);assert.equal(a[1].transition.type,'dissolve')
});
test('removing a transition restores original timeline positions',()=>{
 const a=fixture();T.apply(a,a[1],'wipe-right',.9);T.remove(a,a[1]);assert.deepEqual(a.map(x=>x.start),[0,3,6]);assert.equal(a[1].transition,undefined)
});
test('invalid effect or isolated clip is rejected',()=>{
 const a=fixture();assert.throws(()=>T.apply(a,a[1],'malicious-effect',1));assert.throws(()=>T.apply(a,a[0],'dissolve',1))
});
test('transition duration is bounded and fade progress is finite',()=>{
 const a=fixture();T.apply(a,a[1],'slide-left',100);assert.ok(a[1].transition.duration<=3);assert.equal(T.progress(a[1],a[1].start),0);assert.equal(T.progress(a[1],a[1].start+10),1)
});
test('all transitions have preview frames and usable alpha expressions',()=>{
 for(const t of T.TYPES){const p=T.preview(t.id,.5);assert.equal(typeof p,'object');assert.ok(Number.isFinite(.5));assert.ok(T.ffAlpha(t.id,'T',.7).length>0)}
});
test('vector library exposes known social brands',()=>{for(const name of ['youtube','twitch','discord'])assert.ok(stock.lookup('brands',name))});
test('vector lookup disallows traversal',()=>{assert.equal(stock.lookup('brands','../x'),null);assert.equal(stock.svgFor('brands','../../etc'),null)});
test('searches brand and shape catalog locally',()=>{
 const a=stock.search({kind:'brands',q:'youtube'}),b=stock.search({kind:'shapes',q:'subscribe'});
 assert.ok(a.total>=1);assert.ok(b.total>=1);assert.equal(b.items[0].id,'subscribe')
});
test('SVGs generate from known source or shapes',()=>{
 assert.ok(stock.svgFor('brands','youtube').includes('<svg'));assert.ok(stock.svgFor('shapes','circle').includes('<svg'))
});
