'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('docs/assets/public-overview.js','utf8');
function harness({response=true,age=0}={}){
 const ids=['public-weather-headline','public-weather-description','public-weather-meta','public-weather-cities','public-weather-refresh'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{textContent:'',disabled:false,listeners:{},children:[],addEventListener(type,cb){this.listeners[type]=cb;},click(){this.listeners.click?.();},replaceChildren(...xs){this.children=xs;},append(...xs){this.children.push(...xs);}}]));
 const callbacks={},calls=[];
 const now=Date.UTC(2026,8,29,12,0);
 const data={status:'available',generated_at:new Date(now-age).toISOString(),cities:[
 {city:'เชียงใหม่',region:'เหนือ',temperature_c:31,weather_code:3,rain_probability_3h_max:70},
 {city:'ขอนแก่น',region:'อีสาน',temperature_c:30,weather_code:61,rain_probability_3h_max:60},
 {city:'กรุงเทพมหานคร',region:'กลาง',temperature_c:32,weather_code:2,rain_probability_3h_max:10}
 ]};
 const document={getElementById:id=>nodes[id],createElement:tag=>({tag,textContent:'',className:'',children:[],append(...xs){this.children.push(...xs);}})};
 const window={addEventListener:(type,fn)=>{callbacks[type]=fn;}};
 class DateFake extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const fetch=async url=>{calls.push(url);return response?{ok:true,json:async()=>data}:{ok:false};};
 vm.runInNewContext(source,{document,window,Date:DateFake,Intl,fetch,Number,Math});
 return {nodes,calls,callbacks};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('home page loads public weather without asking GPS or any visitor coordinates',async()=>{
 const h=harness();await tick();
 assert.equal(h.calls.length,1);assert.match(h.calls[0],/^\.\/data\/public-overview.json/);
 assert.equal(source.includes('getCurrentPosition'),false);
 assert.match(h.nodes['public-weather-headline'].textContent,/บางพื้นที่เสี่ยงฝน/);
 assert.equal(h.nodes['public-weather-cities'].children.length,3);
});
test('old, missing or invalid data never becomes current public report',async()=>{
 const old=harness({age:3*3600000});await tick();
 assert.match(old.nodes['public-weather-headline'].textContent,/ยังไม่สามารถ/);
 assert.equal(old.nodes['public-weather-cities'].children.length,0);
 const error=harness({response:false});await tick();
 assert.match(error.nodes['public-weather-headline'].textContent,/ยังไม่สามารถ/);
});
test('manual refresh is available without location permission',async()=>{
 const h=harness();await tick();h.nodes['public-weather-refresh'].click();await tick();
 assert.equal(h.calls.length,2);assert.equal(h.nodes['public-weather-refresh'].disabled,false);
});
