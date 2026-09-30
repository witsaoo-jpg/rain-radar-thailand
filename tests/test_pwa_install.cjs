'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('docs/assets/pwa.js','utf8');

function node(id){
 return {id,hidden:false,disabled:false,textContent:'',dataset:{},attributes:{},children:[],open:false,listeners:{},
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},
  dispatch(type,event={}){for(const fn of this.listeners[type]||[])fn({target:this,...event});},
  replaceChildren(...x){this.children=x;},append(...x){this.children.push(...x);},
  setAttribute(k,v){this.attributes[k]=v;if(k==='open')this.open=true;},removeAttribute(k){delete this.attributes[k];if(k==='open')this.open=false;},
  showModal(){this.open=true;},close(){this.open=false;}
 };
}
function harness({ua='',platform='',touch=0,standalone=false,secure=true,userChoice='accepted'}={}){
 const ids=['install-app','install-guide','install-guide-close','install-guide-body','install-hint'];
 const nodes=Object.fromEntries(ids.map(id=>[id,node(id)]));
 const created=[];
 const document={getElementById:id=>nodes[id],createElement:tag=>{const n=node(tag);n.tag=tag;created.push(n);return n;}};
 const windowListeners={};
 const media={matches:standalone,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const window={isSecureContext:secure,matchMedia:()=>media,addEventListener(type,fn){(windowListeners[type]??=[]).push(fn);}};
 const swCalls=[];
 const navigator={userAgent:ua,platform,maxTouchPoints:touch,standalone,
  serviceWorker:{register:async path=>{swCalls.push(path);}}
 };
 vm.runInNewContext(source,{document,window,navigator,Promise});
 const emit=(type,event={})=>{for(const fn of windowListeners[type]||[])fn(event);};
 const makePrompt=()=>({preventDefaultCalled:false,promptCalls:0,preventDefault(){this.preventDefaultCalled=true;},async prompt(){this.promptCalls++;},userChoice:Promise.resolve({outcome:userChoice})});
 return {nodes,created,window,navigator,media,emit,makePrompt,swCalls};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('installed standalone app hides install action',async()=>{
 const h=harness({ua:'Mozilla/5.0 (Linux; Android 15)',standalone:true});await tick();
 assert.equal(h.nodes['install-app'].hidden,true);
});

test('iPhone browser shows Add to Home Screen guidance without fake native install prompt',async()=>{
 const h=harness({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari'});
 await tick();
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'ios');
 assert.match(h.nodes['install-app'].textContent,/หน้าจอโฮม/);
 h.nodes['install-app'].dispatch('click');
 assert.equal(h.nodes['install-guide'].open,true);
 assert.ok(h.nodes['install-guide-body'].children.length>=4);
 const combined=h.nodes['install-guide-body'].children.flatMap(x=>[x.textContent,...(x.children||[]).map(y=>y.textContent)]).join(' ');
 assert.match(combined,/Safari|Share|หน้าจอโฮม/);
});

test('Android always shows an install route and upgrades to real browser prompt when available',async()=>{
 const h=harness({ua:'Mozilla/5.0 (Linux; Android 15) Chrome/140',userChoice:'accepted'});await tick();
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'guide');
 assert.match(h.nodes['install-app'].textContent,/วิธีติดตั้ง/);
 const prompt=h.makePrompt();h.emit('beforeinstallprompt',prompt);
 assert.equal(prompt.preventDefaultCalled,true);
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'prompt');
 h.nodes['install-app'].dispatch('click');await tick();await tick();
 assert.equal(prompt.promptCalls,1);
 assert.equal(h.nodes['install-app'].hidden,true);
});

test('dismissed Android browser prompt exposes honest manual-install guide',async()=>{
 const h=harness({ua:'Mozilla/5.0 (Linux; Android 15) Chrome/140',userChoice:'dismissed'});await tick();
 const prompt=h.makePrompt();h.emit('beforeinstallprompt',prompt);
 h.nodes['install-app'].dispatch('click');await tick();await tick();
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'guide');
 assert.match(h.nodes['install-app'].textContent,/วิธีติดตั้ง/);
 h.nodes['install-app'].dispatch('click');
 assert.equal(h.nodes['install-guide'].open,true);
});

test('appinstalled hides action and closes instructions',async()=>{
 const h=harness({ua:'Mozilla/5.0 (iPhone)'});await tick();
 h.nodes['install-app'].dispatch('click');assert.equal(h.nodes['install-guide'].open,true);
 h.emit('appinstalled');
 assert.equal(h.nodes['install-app'].hidden,true);
 assert.equal(h.nodes['install-guide'].open,false);
 assert.match(h.nodes['install-hint'].textContent,/เรียบร้อย/);
});

test('service worker registers only in secure context',async()=>{
 const secure=harness({secure:true});await tick();assert.deepEqual(secure.swCalls,['./sw.js']);
 const insecure=harness({secure:false});await tick();assert.deepEqual(insecure.swCalls,[]);
});


test('Android without beforeinstallprompt still shows manual installation instructions',async()=>{
 const h=harness({ua:'Mozilla/5.0 (Linux; Android 15) Chrome/140'});await tick();
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'guide');
 h.nodes['install-app'].dispatch('click');
 assert.equal(h.nodes['install-guide'].open,true);
 const combined=h.nodes['install-guide-body'].children.flatMap(x=>[x.textContent,...(x.children||[]).map(y=>y.textContent)]).join(' ');
 assert.match(combined,/Chrome|ติดตั้งแอป|หน้าจอหลัก/);
});

test('generic browser also keeps an installation help action visible',async()=>{
 const h=harness({ua:'Mozilla/5.0 Chrome/140'});await tick();
 assert.equal(h.nodes['install-app'].hidden,false);
 assert.equal(h.nodes['install-app'].dataset.mode,'guide');
 assert.match(h.nodes['install-app'].textContent,/ติดตั้งแอป/);
});
