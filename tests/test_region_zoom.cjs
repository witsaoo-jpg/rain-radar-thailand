'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const radar=require('../docs/assets/radar-utils.js');
test('regional source snapshots are allowlisted while cross-station and untrusted paths are rejected',()=>{
 for(const id of ['cri','kkn','pkt']) {
   assert.equal(radar.safeImagePath('./data/images/'+id+'.png',id),'./data/images/'+id+'.png');
   assert.equal(radar.safeImagePath('./data/images/'+id+'.png','thailand'),null);
   assert.equal(radar.safeImagePath('./data/images/history/'+id+'/aaaaaaaaaaaaaaaaaaaa.png',id,true),'./data/images/history/'+id+'/aaaaaaaaaaaaaaaaaaaa.png');
 }
 assert.equal(radar.safeImagePath('https://evil.test/cri.png','cri'),null);
});
test('zoom uses scrollable enlarged image and user controls sit above bitmap',()=>{
 const app=fs.readFileSync('docs/assets/app.js','utf8');
 const css=fs.readFileSync('docs/assets/near-me.css','utf8');
 const html=fs.readFileSync('docs/index.html','utf8');
 assert.match(app,/style\.width=zoom\+'%'/);
 assert.match(app,/layer\.scrollLeft/);
 assert.match(css,/\.radar-canvas \.image-layer\{[^}]*overflow:auto/);
 assert.match(css,/\.radar-canvas \.zoom-tools\{z-index:5/);
 assert.match(html,/data-region-station="cri"/);
 assert.match(html,/data-region-station="kkn"/);
 assert.match(html,/data-region-station="pkt"/);
});

test('last verified regional snapshot is usable only inside the two-hour fallback window',()=>{
 const now=Date.UTC(2026,8,30,5,0);
 const entry={history:[
  {path:'./data/images/history/cri/aaaaaaaaaaaaaaaaaaaa.png',captured_at:new Date(now-150*60000).toISOString()},
  {path:'./data/images/history/cri/bbbbbbbbbbbbbbbbbbbb.png',captured_at:new Date(now-60*60000).toISOString()}
 ]};
 const latest=radar.latestVerifiedFrame(entry,'cri',now,120*60000);
 assert.equal(latest.path,'./data/images/history/cri/bbbbbbbbbbbbbbbbbbbb.png');
 assert.equal(radar.latestVerifiedFrame({history:[entry.history[0]]},'cri',now,120*60000),null);
});

test('app labels fallback as latest verified snapshot and not live',()=>{
 const app=fs.readFileSync('docs/assets/app.js','utf8');
 assert.match(app,/ภาพล่าสุดที่มี · ไม่ใช่ภาพสด/);
 assert.match(app,/latestVerifiedFrame/);
 assert.match(app,/120\*60000/);
});
