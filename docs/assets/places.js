/* Device-only favorite places. Saving and selecting are explicit user actions. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),core=window.RainPlacesCore;
 const root=$('places-heading'),list=$('places-list'),form=$('places-form'),notice=$('places-status');
 if(!core||!root||!list||!form||!notice)return;
 let places=[];
 function message(x){notice.textContent=x;}
 function load(){try{places=core.sanitize(JSON.parse(localStorage.getItem(core.KEY)||'[]'));}catch(e){places=[];message('เบราว์เซอร์ไม่สามารถอ่านสถานที่ที่บันทึกไว้ได้');}}
 function persist(){
  try{localStorage.setItem(core.KEY,JSON.stringify(places));return true;}
  catch(e){message('ไม่สามารถบันทึกข้อมูลบนอุปกรณ์นี้ได้ ตรวจสอบการตั้งค่าความเป็นส่วนตัว');return false;}
 }
 function render(){
  list.replaceChildren();
  if(!places.length){const p=document.createElement('p');p.textContent='ยังไม่มีสถานที่โปรด';list.append(p);}
  for(const item of places){
   const row=document.createElement('div');row.className='place-item';
   const info=document.createElement('span');info.textContent=item.name+' · '+item.latitude.toFixed(4)+', '+item.longitude.toFixed(4);
   const choose=document.createElement('button');choose.type='button';choose.textContent='ดูพยากรณ์';choose.addEventListener('click',()=>{
     window.dispatchEvent(new CustomEvent('rainradar:location',{detail:{coords:{latitude:item.latitude,longitude:item.longitude},source:'favorite',name:item.name}}));
     $('weather-banner')?.scrollIntoView({behavior:'smooth',block:'center'});
     message('เลือก '+item.name+' แล้ว — กดดึงพยากรณ์เพื่อยินยอมส่งพิกัดโดยประมาณไป Open-Meteo');
   });
   const remove=document.createElement('button');remove.type='button';remove.className='place-delete';remove.textContent='ลบ';remove.setAttribute('aria-label','ลบสถานที่ '+item.name);remove.addEventListener('click',()=>{
    const old=places;places=places.filter(p=>p.name!==item.name);
    if(!persist()){places=old;return;}render();message('ลบสถานที่ '+item.name+' จากอุปกรณ์แล้ว');
   });
   row.append(info,choose,remove);list.append(row);
  }
  $('places-count').textContent=places.length+'/'+core.MAX;
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const item=core.validate($('place-name').value,$('place-lat').value,$('place-lon').value);
   if(places.some(p=>p.name.toLowerCase()===item.name.toLowerCase()))throw Error('Duplicate name');
   if(places.length>=core.MAX)throw Error('Limit reached');
   const old=places;places=[...places,item];
   if(!persist()){places=old;return;}render();form.reset();message('บันทึก '+item.name+' ไว้บนอุปกรณ์แล้ว');
  }catch(error){message(error.message==='Duplicate name'?'ชื่อสถานที่นี้ถูกบันทึกแล้ว':error.message==='Limit reached'?'บันทึกได้ไม่เกิน 5 สถานที่':'กรุณาระบุชื่อและพิกัด Latitude/Longitude ให้ถูกต้อง');}
 });
 $('places-use-gps').addEventListener('click',()=>{
  if(!latestGPS){message('ยังไม่มีค่าพิกัดในหน้านี้ กรุณากดอัปเดตพิกัดที่แผงฝนใกล้ฉันก่อน');return;}
  $('place-lat').value=latestGPS.latitude.toFixed(4);
  $('place-lon').value=latestGPS.longitude.toFixed(4);
  message('ใส่พิกัด GPS ในช่องแล้ว กรุณาตั้งชื่อสถานที่และกดบันทึก');
 });
 let latestGPS=null;
 window.addEventListener('rainradar:location',event=>{
  if(event.detail?.source==='favorite')return;
  latestGPS=event.detail?.coords||null;
 });
 $('places-clear-all').addEventListener('click',()=>{
  if(!places.length)return;
  if(!window.confirm('ลบสถานที่โปรดทั้งหมดจากอุปกรณ์นี้?'))return;
  const old=places;places=[];if(!persist()){places=old;return;}render();message('ลบสถานที่โปรดทั้งหมดแล้ว');
 });
 load();render();
})();
