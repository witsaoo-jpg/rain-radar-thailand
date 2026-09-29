/* Optional reverse geocoding of live GPS. Never run on saved places or before explicit consent. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),core=window.RainPlaceNameCore;
 const key='rainradar:locality-consent:v1';
 const button=$('home-place-lookup'),status=$('home-place-status'),details=$('home-place-detail');
 if(!core||!button||!status||!details)return;
 let current=null,serial=0,controller=null,consented=false,liveName=null,lastKey='';
 const read=()=>{try{return localStorage.getItem(key)==='yes';}catch(_){return false;}};
 const save=value=>{try{if(value)localStorage.setItem(key,'yes');else localStorage.removeItem(key);}catch(_){}};
 consented=read();
 const close=()=>{serial++;if(controller)controller.abort();controller=null;liveName=null;lastKey='';};
 function showResult(d){
   liveName=d;
   const head=$('home-place');
   if(head)head.textContent=d.title;
   details.textContent=d.detail||'ชื่อพื้นที่ใกล้เคียงจากฐานข้อมูลแผนที่';
   status.textContent='ชื่อพื้นที่ใกล้เคียงจาก BigDataCloud • ไม่ยืนยันตำแหน่งบ้านเลขที่';
 }
 async function lookup(){
   if(!consented||!current)return;
   const serialNo=++serial;
   if(controller)controller.abort();
   controller=new AbortController();
   const p={...current},code=p.latitude.toFixed(4)+':'+p.longitude.toFixed(4);
   if(code===lastKey&&liveName){showResult(liveName);return;}
   status.textContent='กำลังค้นหาชื่อพื้นที่ใกล้เคียง…';
   try{
     const r=await fetch(core.url(p.latitude,p.longitude),{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
     if(!r.ok)throw new Error('Reverse geocoding unavailable');
     const data=await r.json();
     if(serialNo!==serial||!current||current.latitude!==p.latitude||current.longitude!==p.longitude)return;
     const parsed=core.parse(data,p.latitude,p.longitude);
     if(!parsed)throw new Error('Unknown area');
     lastKey=code;showResult(parsed);
   }catch(e){
     if(serialNo!==serial||e.name==='AbortError')return;
     liveName=null;
     details.textContent='';
     status.textContent='ยังไม่สามารถระบุชื่อพื้นที่ได้ • ใช้พิกัด GPS แทนได้';
   }
 }
 function reset(){
   close();current=null;
   button.hidden=false;
   button.textContent=consented?'↻ ค้นหาชื่อพื้นที่จาก GPS':'📍 แสดงชื่อพื้นที่จาก GPS';
   status.textContent=consented?'รอข้อมูล GPS ปัจจุบัน':'กดเพื่อยินยอมส่งพิกัดโดยประมาณไป BigDataCloud เพื่อค้นหาชื่อพื้นที่';
   details.textContent='';
 }
 window.addEventListener('rainradar:location',event=>{
   const d=event.detail||{};
   // Favorites provide a name and must never leak their coordinates to this provider.
   if(!d.coords||d.source==='favorite'||d.name){reset();return;}
   try{current=core.valid(d.coords.latitude,d.coords.longitude);}catch(_){reset();return;}
   close();button.hidden=false;
   if(consented)lookup();
   else status.textContent='กด “แสดงชื่อพื้นที่จาก GPS” เพื่ออนุญาตส่งพิกัดโดยประมาณไป BigDataCloud';
 });
 window.addEventListener('rainradar:forecast',event=>{
   const d=event.detail||{};
   if(!current||d.selectedPlace!=='ตำแหน่งของคุณ'||!liveName)return;
   if(Math.abs(d.coordinates?.latitude-current.latitude)>.02||Math.abs(d.coordinates?.longitude-current.longitude)>.02)return;
   showResult(liveName);
 });
 button.addEventListener('click',()=>{
   if(!current){status.textContent='กรุณากดอนุญาต GPS ก่อน';return;}
   consented=true;save(true);button.textContent='↻ ค้นหาชื่อพื้นที่จาก GPS';lookup();
 });
 $('home-place-revoke').addEventListener('click',()=>{
   consented=false;save(false);close();
   status.textContent='ปิดการค้นหาชื่อพื้นที่อัตโนมัติแล้ว';details.textContent='';
   button.textContent='📍 แสดงชื่อพื้นที่จาก GPS';
 });
 reset();
})();
