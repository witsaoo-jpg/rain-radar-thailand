'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('docs/assets/easy-refresh.js','utf8');
function harness(){
 const listeners={},events=[],button={disabled:false,textContent:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},click(){this.listeners.click?.();}},status={textContent:''},request={disabled:true};
 const window={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},dispatchEvent(e){events.push(e.type);for(const fn of listeners[e.type]||[])fn(e);}};
 const document={getElementById(id){return id==='easy-refresh-button'?button:id==='easy-refresh-status'?status:id==='forecast-request'?request:null;}};
 class Event{constructor(type,options){this.type=type;this.detail=options?.detail;}}
 vm.runInNewContext(source,{window,document,CustomEvent:Event});
 const emit=(name,detail)=>window.dispatchEvent(new Event(name,{detail}));
 return {window,button,status,request,events,emit};
}
test('opening webpage does not refresh or send location',()=>{
 const h=harness();assert.equal(h.events.length,0);assert.equal(h.button.disabled,false);
});
test('with no location refreshes only radar, not forecast',()=>{
 const h=harness();h.button.click();
 assert.deepEqual(h.events,['rainradar:refresh-radar']);assert.equal(h.button.disabled,true);
 h.emit('rainradar:radar-refresh-finished');
 assert.equal(h.button.disabled,false);assert.match(h.status.textContent,/เลือกพื้นที่/);
});
test('selected place triggers radar and forecast only after deliberate click',()=>{
 const h=harness();h.request.disabled=false;h.emit('rainradar:location',{coords:{latitude:13.36,longitude:100.98},name:'บ้าน'});
 assert.equal(h.events.includes('rainradar:refresh-forecast'),false);
 h.button.click();
 assert.equal(h.events.includes('rainradar:refresh-radar'),true);
 assert.equal(h.events.includes('rainradar:refresh-forecast'),true);
 h.emit('rainradar:forecast');assert.equal(h.button.disabled,true);
 h.emit('rainradar:radar-refresh-finished');assert.equal(h.button.disabled,false);
 assert.match(h.status.textContent,/รายงานอากาศอัปเดต/);
});
test('failed forecast does not claim successful update',()=>{
 const h=harness();h.request.disabled=false;h.emit('rainradar:location',{coords:{latitude:13.36,longitude:100.98}});
 h.button.click();h.emit('rainradar:forecast-cleared');h.emit('rainradar:radar-refresh-finished');
 assert.match(h.status.textContent,/ยังไม่พร้อม/);
});
test('cleared location prevents subsequent forecast request',()=>{
 const h=harness();h.request.disabled=false;h.emit('rainradar:location',{coords:{latitude:13.36,longitude:100.98}});
 h.emit('rainradar:location',{coords:null});h.button.click();
 assert.equal(h.events.filter(x=>x==='rainradar:refresh-forecast').length,0);
});
test('source contains no reload or GPS reacquisition',()=>{
 assert.doesNotMatch(source,/location\.reload|getCurrentPosition|localStorage/);
});
