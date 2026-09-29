/* Current-device browser reverse-geocoding only. No stored/favorite coordinates or IP fallback. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainPlaceNameCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function valid(lat,lon){
  if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new Error('Invalid live GPS');
  return {latitude:lat,longitude:lon};
 }
 function url(lat,lon){
  const p=valid(lat,lon),u=new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  u.searchParams.set('latitude',p.latitude.toFixed(4));
  u.searchParams.set('longitude',p.longitude.toFixed(4));
  u.searchParams.set('localityLanguage','th');
  return u.toString();
 }
 const clean=x=>typeof x==='string'?x.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,70):'';
 function parse(data,lat,lon){
  const p=valid(lat,lon);
  if(!data||typeof data!=='object'||/ip/i.test(String(data.lookupSource||'')))return null;
  if(!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)||Math.abs(data.latitude-p.latitude)>.02||Math.abs(data.longitude-p.longitude)>.02)return null;
  const locality=clean(data.locality),city=clean(data.city),province=clean(data.principalSubdivision);
  const country=clean(data.countryName),isThai=String(data.countryCode||'').toUpperCase()==='TH';
  const parts=[];for(const value of [locality,city,province]){
   if(value&&!parts.some(x=>x.toLocaleLowerCase()===value.toLocaleLowerCase()))parts.push(value);
  }
  if(!isThai&&country&&!parts.includes(country))parts.push(country);
  if(!parts.length)return null;
  return {title:'บริเวณ'+parts[0],detail:parts.slice(1).join(' · '),label:parts.join(' · '),provider:'BigDataCloud'};
 }
 return {valid,url,parse};
});
