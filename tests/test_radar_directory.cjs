'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('docs/assets/radar-directory.js','utf8');
function element(tag='div'){
 return {tag,children:[],hidden:false,open:false,dataset:{},listeners:{},textContent:'',value:'',attributes:{},
   append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},
   addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},
   querySelectorAll(selector){const all=[];const walk=n=>{for(const c of n.children){if(selector==='.radar-directory-region'&&c.className==='radar-directory-region')all.push(c);if(selector==='.radar-directory-item'&&String(c.className).includes('radar-directory-item'))all.push(c);walk(c);}};walk(this);return all;}
 };
}
function harness(){
 const nav=element('nav'),search=element('input'),status=element('p');
 const document={getElementById:id=>({'station-nav':nav,'radar-station-search':search,'radar-search-status':status})[id],createElement:element};
 const window={};vm.runInNewContext(source,{document,window});
 return {nav,search,status,items:window.RadarDirectory.items,groups:window.RadarDirectory.groups};
}
test('all entries have unique IDs, regional grouping and supported official URL host',()=>{
 const h=harness();assert.ok(h.items.length>=25);
 assert.equal(new Set(h.items.map(x=>x.id)).size,h.items.length);
 const native=h.items.filter(x=>x.kind==='snapshot').map(x=>x.id).sort();
 assert.deepEqual(Array.from(native),['cri','kkn','pkt','rayong','sattahip','suvarnabhumi','thailand','thailand-loop']);
 assert.ok(h.items.every(x=>new URL(x.url).origin==='https://weather.tmd.go.th'));
 assert.ok(h.items.filter(x=>x.kind==='official'&&!x.direct).every(x=>x.url==='https://weather.tmd.go.th/'));
 assert.ok(h.items.every(x=>x.kind==='snapshot'||x.url!=='https://weather.tmd.go.th/THA_Z.php'));
 assert.ok(h.items.every(x=>h.groups.some(([group])=>group===x.group)));
});
test('only known published-snapshot keys become in-app buttons, others stay external links',()=>{
 const h=harness();
 const regions=h.nav.querySelectorAll('.radar-directory-region');
 assert.equal(regions.length,h.groups.length);
 const entries=h.nav.querySelectorAll('.radar-directory-item');
 assert.equal(entries.length,h.items.length);
 assert.equal(entries.filter(x=>x.tag==='button').length,8);
 for(const entry of entries.filter(x=>x.tag==='a')){
   assert.equal(entry.target,'_blank');assert.equal(entry.rel,'noopener noreferrer');
   assert.equal(entry.dataset.station,undefined);
 }
});
test('search filters by regional station name without losing directory items',()=>{
 const h=harness();h.search.value='ภูเก็ต';h.search.listeners.input();
 const showing=h.nav.querySelectorAll('.radar-directory-item').filter(x=>!x.hidden);
 assert.equal(showing.length,1);assert.match(h.status.textContent,/พบ 1 รายการ/);
 h.search.value='ไม่มีสถานีแบบนี้';h.search.listeners.input();
 assert.match(h.status.textContent,/ไม่พบ/);
 h.search.value='';h.search.listeners.input();
 assert.equal(h.nav.querySelectorAll('.radar-directory-item').filter(x=>!x.hidden).length,h.items.length);
});
