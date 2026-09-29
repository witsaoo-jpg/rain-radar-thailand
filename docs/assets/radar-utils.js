/* Only allow trusted local imagery. Capture time != observation time. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RadarUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STATIONS=new Set(['thailand','sattahip','rayong','suvarnabhumi','thailand-loop']);
 function safeImagePath(value, station, history=false){
   if(typeof value!=='string'||!STATIONS.has(station))return null;
   if(history){
     if(station==='thailand-loop')return null;
     const m=/^\.\/data\/images\/history\/(thailand|sattahip|rayong|suvarnabhumi)\/[a-f0-9]{20}\.(png|jpg|gif|webp)$/.exec(value);
     return m&&m[1]===station?value:null;
   }
   const m=/^\.\/data\/images\/(thailand|sattahip|rayong|suvarnabhumi|thailand-loop)\.(png|jpg|gif|webp)$/.exec(value);
   return m&&m[1]===station?value:null;
 }
 function parsedUTC(value){
   if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return null;
   const timestamp=Date.parse(value);
   return Number.isFinite(timestamp)?timestamp:null;
 }
 function freshManifest(generatedAt, now=Date.now()){
   const ts=parsedUTC(generatedAt);
   return ts!==null&&Number.isFinite(now)&&now-ts>=-5*60000&&now-ts<=90*60000;
 }
 function historyFrames(entry, station){
   if(!entry||!Array.isArray(entry.history))return [];
   const unique=new Set();
   return entry.history.filter(f=>{
     if(!f||!safeImagePath(f.path,station,true)||parsedUTC(f.captured_at)===null||unique.has(f.path))return false;
     unique.add(f.path);return true;
   }).sort((a,b)=>parsedUTC(a.captured_at)-parsedUTC(b.captured_at)).slice(-6);
 }
 return {safeImagePath,parsedUTC,freshManifest,historyFrames};
});
