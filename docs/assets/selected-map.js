/* Interactive geography for a selected position, never maps un-georeferenced TMD PNG. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),open=$('selected-map-open'),close=$('selected-map-close'),frame=$('selected-map-iframe'),panel=$('selected-map-panel'),label=$('selected-map-location');
 if(!open||!close||!frame||!panel)return;
 let coords=null,name='';
 function clear(){
  coords=null;name='';open.disabled=true;open.textContent='เลือกตำแหน่งเพื่อเปิดแผนที่';frame.removeAttribute('src');panel.hidden=true;label.textContent='ยังไม่ได้เลือกพิกัด';
 }
 window.addEventListener('rainradar:location',event=>{
  const next=event.detail?.coords;
  if(!next || !Number.isFinite(next.latitude)||!Number.isFinite(next.longitude)){clear();return;}
  coords={latitude:next.latitude,longitude:next.longitude};name=String(event.detail?.name||'พิกัด GPS');
  frame.removeAttribute('src');panel.hidden=true;open.disabled=false;open.textContent='เปิดแผนที่ตำแหน่งที่เลือก';
  label.textContent=name+' • '+coords.latitude.toFixed(4)+', '+coords.longitude.toFixed(4);
 });
 open.addEventListener('click',()=>{
  if(!coords)return;
  const {latitude:lat,longitude:lon}=coords, u=new URL('https://www.openstreetmap.org/export/embed.html');
  u.searchParams.set('bbox',[lon-.045,lat-.035,lon+.045,lat+.035].join(','));u.searchParams.set('layer','mapnik');u.searchParams.set('marker',lat+','+lon);
  frame.src=u.toString();panel.hidden=false;
 });
 close.addEventListener('click',()=>{frame.removeAttribute('src');panel.hidden=true;});
 clear();
})();
