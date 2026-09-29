/* Favorite places: explicit device-only storage, no external geocoder. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainPlacesCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX=5,KEY='rainradar:favorite-places:v1';
 function validate(name,lat,lon){
  const title=typeof name==='string'?name.trim():'';
  const a=typeof lat==='number'?lat:Number(String(lat).trim()),b=typeof lon==='number'?lon:Number(String(lon).trim());
  if(!title||title.length>30||/[<>\x00-\x1f]/.test(title)||!Number.isFinite(a)||!Number.isFinite(b)||a < -90||a>90||b < -180||b>180)throw Error('Invalid place');
  if(String(lat).trim()===''||String(lon).trim()==='')throw Error('Missing coordinates');
  return {name:title,latitude:Number(a.toFixed(4)),longitude:Number(b.toFixed(4))};
 }
 function sanitize(records){
  if(!Array.isArray(records))return [];
  const seen=new Set(),out=[];
  for(const row of records){
   try{const p=validate(row?.name,row?.latitude,row?.longitude),key=p.name.toLowerCase();if(seen.has(key))continue;seen.add(key);out.push(p);if(out.length>=MAX)break;}catch(e){}
  }
  return out;
 }
 return {KEY,MAX,validate,sanitize};
});
