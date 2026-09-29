'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const radar=require('../docs/assets/radar-utils.js');
const places=require('../docs/assets/places-core.js');
const hash='a'.repeat(20);
test('radar paths are station-specific and history snapshots are not current images',()=>{
 assert.equal(radar.safeImagePath('./data/images/thailand.png','thailand',false),'./data/images/thailand.png');
 assert.equal(radar.safeImagePath('./data/images/history/thailand/'+hash+'.png','thailand',false),null);
 assert.equal(radar.safeImagePath('./data/images/history/thailand/'+hash+'.png','thailand',true),'./data/images/history/thailand/'+hash+'.png');
 assert.equal(radar.safeImagePath('./data/images/history/rayong/'+hash+'.png','thailand',true),null);
 assert.equal(radar.safeImagePath('../secrets.png','thailand',true),null);
});
test('history deduplicates and chronological sort respects ISO zone and station',()=>{
 const rows=[
 {path:'./data/images/history/thailand/'+ 'b'.repeat(20)+'.png',captured_at:'2026-09-29T15:00:00+07:00'},
 {path:'./data/images/history/thailand/'+ 'a'.repeat(20)+'.png',captured_at:'2026-09-29T07:30:00Z'},
 {path:'./data/images/history/thailand/'+ 'a'.repeat(20)+'.png',captured_at:'2026-09-29T07:30:00Z'},
 {path:'./data/images/history/rayong/'+ 'c'.repeat(20)+'.png',captured_at:'2026-09-29T07:30:00Z'}
 ];
 const frames=radar.historyFrames({history:rows},'thailand');
 assert.equal(frames.length,2);assert.ok(frames[0].path.includes('/a'));assert.ok(frames[1].path.includes('/b'));
});
test('old, future or missing manifests cannot masquerade as latest radar',()=>{
 const now=Date.parse('2026-09-29T08:00:00Z');
 assert.equal(radar.freshManifest('2026-09-29T07:00:00Z',now),true);
 assert.equal(radar.freshManifest('2026-09-29T05:00:00Z',now),false);
 assert.equal(radar.freshManifest('2026-09-29T09:00:00Z',now),false);
 assert.equal(radar.freshManifest('2026-09-29',now),false);
});
test('favorite coordinates validate and names cannot inject HTML',()=>{
 const p=places.validate(' บ้าน ',13.36125,'100.98426');
 assert.equal(p.name,'บ้าน');assert.equal(p.latitude,13.3613);
 assert.throws(()=>places.validate('<script>',13,100));
 assert.throws(()=>places.validate(' ',13,100));
 assert.throws(()=>places.validate('บ้าน',91,100));
 assert.throws(()=>places.validate('บ้าน','',''));
});
test('saved records sanitize with five-place limit, name deduplication and bad entries',()=>{
 const rows=Array.from({length:6},(_,i)=>({name:'Place '+i,latitude:13+i*.01,longitude:100}));
 rows.splice(1,0,{name:'place 0',latitude:13,longitude:100});
 rows.splice(2,0,{name:'Invalid',latitude:500,longitude:0});
 const result=places.sanitize(rows);
 assert.equal(result.length,5);assert.equal(result[0].name,'Place 0');
 assert.equal(result[1].name,'Place 1');
});
