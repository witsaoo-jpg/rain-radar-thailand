'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/assets/near-me.js'), 'utf8');
function createHarness({ secure = true, geo = true } = {}) {
  const ids = ['gps-button','gps-clear-button','gps-map-button','gps-status','gps-details','gps-coordinates','gps-accuracy','gps-measured','gps-map-frame','gps-map-wrap','gps-map-link'];
  const nodes = Object.fromEntries(ids.map(id => [id, { hidden: true, disabled: false, textContent: '', href: '', attributes:{}, handlers:{}, addEventListener(name, fn){this.handlers[name]=fn;}, setAttribute(k,v){this.attributes[k]=v;}, removeAttribute(k){delete this.attributes[k]; if(k==='src') this.src=undefined; if(k==='href') this.href=undefined;} }]));
  nodes['gps-map-link'].removeAttribute('href');
  const requests=[];
  const navigator = geo ? {geolocation:{getCurrentPosition(ok,bad,options){requests.push({ok,bad,options});}}}:{};
  const context={document:{getElementById(id){return nodes[id];}},window:{isSecureContext:secure},navigator,Intl,URL,Number,Date,String,Math};
  vm.runInNewContext(source,context);
  const click = id => nodes[id].handlers.click();
  return { nodes, requests, click };
}
const result = (lat = 13.361,lon = 100.984) => ({coords:{latitude:lat, longitude:lon, accuracy:43.6},timestamp:Date.UTC(2026,8,29,7,30)});
test('does not access GPS or third party map before user action',()=>{
  const h=createHarness(); assert.equal(h.requests.length,0); assert.equal(h.nodes['gps-map-frame'].src,undefined); assert.equal(h.nodes['gps-details'].hidden,true);
});
test('permission granted shows coordinates and accuracy but does not load map automatically',()=>{
  const h=createHarness(); h.click('gps-button'); assert.equal(h.requests.length,1); assert.equal(h.requests[0].options.timeout,12000); h.requests[0].ok(result());
  assert.match(h.nodes['gps-coordinates'].textContent,/13\.36100, 100\.98400/); assert.match(h.nodes['gps-accuracy'].textContent,/44/); assert.equal(h.nodes['gps-map-wrap'].hidden,true); assert.equal(h.nodes['gps-map-frame'].src,undefined);
  assert.match(h.nodes['gps-map-link'].href,/openstreetmap\.org/);
});
test('map loads ONLY on explicit click and hide removes src',()=>{
  const h=createHarness();h.click('gps-button');h.requests[0].ok(result());h.click('gps-map-button');
  assert.equal(h.nodes['gps-map-wrap'].hidden,false);assert.match(h.nodes['gps-map-frame'].src,/marker=13\.361%2C100\.984/);
  h.click('gps-map-button');assert.equal(h.nodes['gps-map-frame'].src,undefined);assert.equal(h.nodes['gps-map-wrap'].hidden,true);
});
test('clear wipes location and invalidates late geolocation callbacks',()=>{
  const h=createHarness();h.click('gps-button');h.requests[0].ok(result());h.click('gps-button');const late=h.requests[1];h.click('gps-clear-button');
  late.ok(result(15,102));assert.equal(h.nodes['gps-details'].hidden,true);assert.equal(h.nodes['gps-map-frame'].src,undefined);assert.equal(h.nodes['gps-map-link'].href,undefined);
});
test('permission denied, timeout, insecure context and invalid positions fail safely',()=>{
  const h=createHarness();h.click('gps-button');h.requests[0].bad({code:1});assert.match(h.nodes['gps-status'].textContent,/ไม่ได้รับอนุญาต/);h.click('gps-button');h.requests[1].bad({code:3});assert.match(h.nodes['gps-status'].textContent,/ไม่ทันเวลา/);
  h.click('gps-button');h.requests[2].ok(result(200,100));assert.equal(h.nodes['gps-details'].hidden,true);
  const insecure=createHarness({secure:false});insecure.click('gps-button');assert.equal(insecure.requests.length,0);assert.match(insecure.nodes['gps-status'].textContent,/HTTPS/);
});
