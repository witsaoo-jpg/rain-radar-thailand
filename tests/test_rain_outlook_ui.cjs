'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../docs/assets/rain-outlook-core.js');
const source=fs.readFileSync('docs/assets/rain-outlook.js','utf8');
const now=Date.UTC(2026,8,29,8,12);
const start=Math.ceil(now/3600000)*3600;
function harness({error=false}={}){
 const ids=['outlook-request','outlook-status','outlook-summary','outlook-models','outlook-compare','outlook-ensemble','outlook-ensemble-result','outlook-source','outlook-public','outlook-public-title','outlook-public-lead','outlook-public-periods','outlook-public-agreement','outlook-public-advice','outlook-rain-pattern','outlook-rain-chance','outlook-rain-criterion'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{textContent:'',disabled:id==='outlook-request'||id==='outlook-ensemble',hidden:true,children:[],listeners:{},replaceChildren(...a){this.children=a;},append(...a){this.children.push(...a);},addEventListener(k,fn){this.listeners[k]=fn;},click(){return this.listeners.click?.();}}]));
 const listeners={},calls=[];
 const window={RainOutlookCore:core,addEventListener(k,fn){(listeners[k]??=[]).push(fn);},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e);}};
 const document={getElementById:id=>nodes[id],createElement:type=>({type,textContent:'',className:'',children:[],append(...a){this.children.push(...a);}})};
 const data={timezone:'Asia/Bangkok',hourly_units:{precipitation:'mm'},hourly:{time:Array.from({length:168},(_,i)=>start+i*3600),precipitation:Array.from({length:168},()=>2)}};
 class DateFake extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
 class Event{constructor(type,options){this.type=type;this.detail=options?.detail;}}
 const fetch=async(url,opts)=>{calls.push({url,signal:opts.signal});return error?{ok:false,status:503}:{ok:true,json:async()=>data};};
 vm.runInNewContext(source,{document,window,Date:DateFake,Intl,AbortController,fetch,CustomEvent:Event,URL,Number,Math});
 const emit=(type,detail)=>window.dispatchEvent(new Event(type,{detail}));
 return {nodes,calls,emit};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('first render does not ask for location or contact model APIs',()=>{
 const h=harness();assert.equal(h.calls.length,0);assert.equal(h.nodes['outlook-request'].disabled,true);
});
test('explicit click sends only approximate GPS and requests three documented models',async()=>{
 const h=harness();h.emit('rainradar:location',{coords:{latitude:13.367,longitude:100.984},name:'บ้าน'});
 assert.equal(h.calls.length,0);assert.equal(h.nodes['outlook-request'].disabled,false);
 h.nodes['outlook-request'].click();await tick();await tick();
 assert.equal(h.calls.length,3);
 assert.deepEqual(h.calls.map(x=>new URL(x.url).searchParams.get('models')).sort(),core.MODELS.map(x=>x.id).sort());
 assert.ok(h.calls.every(x=>new URL(x.url).searchParams.get('latitude')==='13.37'));
 assert.equal(h.nodes['outlook-models'].children.length,3);
 assert.match(h.nodes['outlook-summary'].textContent,/240\.0/);
});
test('network failure remains unavailable, never fills a fake rain amount',async()=>{
 const h=harness({error:true});h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96}});
 h.nodes['outlook-request'].click();await tick();await tick();
 assert.match(h.nodes['outlook-status'].textContent,/ไม่พร้อม/);
 assert.match(h.nodes['outlook-summary'].textContent,/ไม่เพียงพอ/);
 assert.equal(h.nodes['outlook-ensemble'].disabled,true);
});
test('clearing location aborts current outlook and disables further requests',async()=>{
 const h=harness();h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96}});
 h.emit('rainradar:location',{coords:null});
 assert.equal(h.nodes['outlook-request'].disabled,true);
 assert.equal(h.calls.length,0);
});
test('official warning and water links remain independent of forecast model report',()=>{
 const html=fs.readFileSync('docs/index.html','utf8');
 assert.match(html,/id="rain-outlook"/);
 assert.match(html,/tmd\.go\.th\/warning-and-events\/warning-storm/);
 assert.match(html,/thaiwater\.net/);
 assert.doesNotMatch(source,/มหาอุทกภัย/);
});

test('summarized public card appears from real model results and resets on location change',async()=>{
 const h=harness();h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96},name:'บ้าน'});
 h.nodes['outlook-request'].click();await tick();await tick();
 assert.equal(h.nodes['outlook-public'].hidden,false);
 assert.match(h.nodes['outlook-public-lead'].textContent,/ฝนสะสม 5 วัน/);
 assert.equal(h.nodes['outlook-public-periods'].children.length,3);
 h.emit('rainradar:location',{coords:null});
 assert.equal(h.nodes['outlook-public'].hidden,true);
 assert.equal(h.nodes['outlook-public-periods'].children.length,0);
});

test('public report labels short-term rain chance only from its separate forecast event',async()=>{
 const h=harness();
 const location={latitude:13.33,longitude:100.96};
 h.emit('rainradar:location',{coords:location,name:'บ้าน'});
 h.emit('rainradar:forecast',{coordinates:location,result:{maxProbability:35}});
 h.nodes['outlook-request'].click();await tick();await tick();
 assert.match(h.nodes['outlook-rain-pattern'].textContent,/แบบจำลอง/);
 assert.match(h.nodes['outlook-rain-chance'].textContent,/35%/);
 assert.match(h.nodes['outlook-rain-chance'].textContent,/ไม่ใช่โอกาสฝนตลอด 5 วัน/);
 h.emit('rainradar:location',{coords:{latitude:15,longitude:101}});
 assert.equal(h.nodes['outlook-rain-pattern'].textContent,'');
 assert.equal(h.nodes['outlook-rain-chance'].textContent,'');
});


test('public rainfall card exposes 24-hour millimetre criterion interpretation',async()=>{
 const h=harness();h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96},name:'บ้าน'});
 h.nodes['outlook-request'].click();await tick();await tick();
 assert.match(h.nodes['outlook-rain-criterion'].textContent,/24 ชั่วโมง/);
 assert.match(h.nodes['outlook-rain-criterion'].textContent,/มม/);
 assert.match(h.nodes['outlook-rain-criterion'].textContent,/ฝนหนักมาก/);
 const html=fs.readFileSync('docs/index.html','utf8');
 assert.match(html,/0\.1–10\.0 มม/);
 assert.match(html,/10\.1–35\.0 มม/);
 assert.match(html,/35\.1–90\.0 มม/);
 assert.match(html,/≥ 90\.1 มม/);
 assert.match(html,/ไม่ใช้กับยอดสะสม 3 หรือ 5 วันโดยตรง/);
});
