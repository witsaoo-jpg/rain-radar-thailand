'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('docs/assets/home.js','utf8');
const core=require('../docs/assets/forecast-core.js');
function harness({stored=false,permission='prompt'}={}){
 const ids=['tab-home','tab-radar','tab-more','home-view','tools-view','home-place','home-icon','home-temperature','home-condition','home-feels','home-rain','home-meta','home-consent','home-actions','home-national','home-location','home-location-status','home-auto-toggle','home-refresh','home-forecast','home-hours','home-days','home-change','home-open-radar','home-open-places','gps-button','forecast-request','places-manage','radar-title'];
 const listeners={},nodes=Object.fromEntries(ids.map(id=>[id,{id,hidden:false,disabled:false,textContent:'',value:'',checked:false,open:false,attributes:{},listeners:{},children:[],addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},scrollIntoView(){this.scrolled=true;},click(){this.listeners.click?.();},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},classList:{toggle(){},add(){},remove(){}}}]));
 nodes['tools-view'].hidden=true;
 const classes={toggle(){}},store=new Map(stored?[['rainradar:auto-location:v1','yes']]:[]);
 let gpsCalls=0;nodes['gps-button'].click=()=>{gpsCalls++;};
 nodes['forecast-request'].disabled=false;
 const window={isSecureContext:true,RainForecastCore:core,addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatchEvent(e){for(const cb of listeners[e.type]||[])cb(e);}};
 const document={body:{classList:classes},getElementById:id=>nodes[id],createElement:tag=>({tag,textContent:'',className:'',children:[],append(...x){this.children.push(...x);}})};
 const navigator={geolocation:{},permissions:{query:async()=>({state:permission})}};
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 class Event{constructor(type,options){this.type=type;this.detail=options?.detail;}}
 vm.runInNewContext(source,{document,window,navigator,localStorage,Intl,CustomEvent:Event,Date,Number,Math});
 return {nodes,store,window,emit:(type,detail)=>window.dispatchEvent(new Event(type,{detail})),get gpsCalls(){return gpsCalls;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('first visit does not use GPS without affirmative choice',async()=>{
 const h=harness();await tick();
 assert.equal(h.gpsCalls,0);assert.equal(h.nodes['home-view'].hidden,false);assert.equal(h.nodes['tools-view'].hidden,true);
 assert.equal(h.store.size,0);
});
test('first explicit location choice saves preference only after GPS succeeds',async()=>{
 const h=harness();h.nodes['home-location'].click();assert.equal(h.gpsCalls,1);assert.equal(h.store.size,0);
 h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96}});
 assert.equal(h.store.get('rainradar:auto-location:v1'),'yes');
 assert.equal(h.nodes['home-auto-toggle'].checked,true);
});
test('return visit silently checks existing browser permission, never forces a new prompt',async()=>{
 const granted=harness({stored:true,permission:'granted'});await tick();assert.equal(granted.gpsCalls,1);
 const prompt=harness({stored:true,permission:'prompt'});await tick();assert.equal(prompt.gpsCalls,0);
 const denied=harness({stored:true,permission:'denied'});await tick();assert.equal(denied.gpsCalls,0);assert.equal(denied.store.size,0);
});
test('location denial does not store automatic access and manual toggle disables it',()=>{
 const h=harness();h.nodes['home-location'].click();h.emit('rainradar:gps-error',{message:'ไม่ได้รับอนุญาต'});
 assert.equal(h.store.size,0);assert.match(h.nodes['home-location-status'].textContent,/ไม่ได้รับอนุญาต/);
 h.nodes['home-location'].click();h.emit('rainradar:location',{coords:{latitude:13.33,longitude:100.96}});
 h.nodes['home-auto-toggle'].checked=false;h.nodes['home-auto-toggle'].listeners.change({target:h.nodes['home-auto-toggle']});
 assert.equal(h.store.size,0);
});
test('a forecast displays location, hourly and seven daily rows without invented weather',()=>{
 const h=harness();const clock=Date.UTC(2026,8,29,8);
 const rows=[{timestamp:clock,probability:30,precipitation:.2}];
 const daily=[{date:'2026-09-29',code:2,min:26,max:33,probability:55}];
 h.emit('rainradar:forecast',{selectedPlace:'บ้าน',retrievedAt:clock,coordinates:{latitude:13.33,longitude:100.96},result:{rows,maxProbability:30},currentWeather:{temperature:29.2,feelsLike:32,code:2,description:'มีเมฆบางส่วน'},daily});
 assert.equal(h.nodes['home-place'].textContent,'บ้าน');assert.match(h.nodes['home-temperature'].textContent,/29/);
 assert.equal(h.nodes['home-hours'].children.length,1);assert.equal(h.nodes['home-days'].children.length,1);
 assert.equal(h.nodes['home-consent'].hidden,true);
});
test('radar and menu tabs retain access to original tool panels',()=>{
 const h=harness();
 h.nodes['tab-radar'].click();assert.equal(h.nodes['tools-view'].hidden,false);assert.equal(h.nodes['home-view'].hidden,true);
 h.nodes['tab-more'].click();assert.equal(h.nodes['places-manage'].open,true);
 h.nodes['tab-home'].click();assert.equal(h.nodes['home-view'].hidden,false);
});
