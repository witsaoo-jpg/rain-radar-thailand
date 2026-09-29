'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm');
const core=require('../docs/assets/forecast-core.js');
const script=fs.readFileSync('docs/assets/forecast.js','utf8');
function harness(){
 const ids=['weather-banner','weather-headline','weather-summary','weather-detail','weather-banner-action','weather-hourly-link','forecast-request','forecast-clear','forecast-consent','forecast-status','forecast-result','forecast-hours','forecast-probability','forecast-amount','forecast-advice','forecast-updated','forecast-grid','near-me-title'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{id,hidden:false,disabled:false,textContent:'',listeners:{},children:[],addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.();},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},scrollIntoView(){this.scrolled=true;}}]));
 const callbacks={};let calls=[];
 const win={RainForecastCore:core,addEventListener(type,fn){callbacks[type]=fn;},dispatchEvent(e){callbacks[e.type]?.(e);}};
 const doc={getElementById:id=>nodes[id],createElement:tag=>({tag,children:[],append(...x){this.children.push(...x);},textContent:''})};
 const clock=Date.UTC(2026,8,29,8,12);
 const hours=Array.from({length:9},(_,i)=>Math.floor((Math.floor(clock/3600000)+i)*3600));
 const data={timezone:'Asia/Bangkok',latitude:13.37,longitude:100.99,hourly_units:{precipitation_probability:'%',precipitation:'mm'},hourly:{time:hours,precipitation_probability:[0,15,40,70,20,0,10,20,0],precipitation:[0,0,1,2,0,0,0,0,0]},current_units:{temperature_2m:'°C',apparent_temperature:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h'},current:{time:Math.floor(clock/1000),temperature_2m:31,apparent_temperature:34,relative_humidity_2m:75,wind_speed_10m:8,weather_code:2}};
 class DateFake extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const context={document:doc,window:win,URL,AbortController,Intl,CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts?.detail;}},Date:DateFake,fetch:async url=>{calls.push(url);return {ok:true,json:async()=>data};}};
 vm.runInNewContext(script,context);
 return {nodes,callbacks,calls,win,emit:(type,detail)=>win.dispatchEvent({type,detail})};
}
test('top action never calls third-party forecast before separately selecting and clicking',()=>{
 const h=harness();
 assert.equal(h.calls.length,0);assert.equal(h.nodes['forecast-request'].disabled,true);
 h.nodes['weather-banner-action'].click();
 assert.equal(h.calls.length,0);assert.equal(h.nodes['near-me-title'].scrolled,true);
});
test('selected favorite shows explicit transfer notice and top action requests data',async()=>{
 const h=harness();h.emit('rainradar:location',{name:'บ้าน',coords:{latitude:13.361,longitude:100.984}});
 assert.match(h.nodes['weather-detail'].textContent,/ส่งพิกัดโดยประมาณ/);
 assert.match(h.nodes['weather-banner-action'].textContent,/ส่งพิกัดโดยประมาณ/);
 assert.equal(h.calls.length,0);
 h.nodes['weather-banner-action'].click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls.length,1);
 assert.match(h.calls[0],/latitude=13\.36/);
 assert.equal(h.nodes['weather-hourly-link'].hidden,false);
});
test('clearing selected location hides weather details and prevents new forecast calls',async()=>{
 const h=harness();h.emit('rainradar:location',{name:'บ้าน',coords:{latitude:13.361,longitude:100.984}});
 h.emit('rainradar:location',{coords:null});
 h.nodes['weather-banner-action'].click();
 assert.equal(h.calls.length,0);assert.equal(h.nodes['weather-hourly-link'].hidden,true);
 assert.equal(h.nodes['forecast-request'].disabled,true);
});
test('empty results are not exposed as weather cards',()=>{
 const html=fs.readFileSync('docs/index.html','utf8');
 const intel=fs.readFileSync('docs/assets/weather-intel.js','utf8');
 const css=fs.readFileSync('docs/assets/near-me.css','utf8');
 assert.match(html,/id="intel-grid" hidden/);
 assert.match(intel,/\$\('intel-grid'\)\.hidden=true/);
 assert.match(intel,/\$\('intel-grid'\)\.hidden=false/);
 assert.match(css,/#intel-grid\[hidden\]/);
});
