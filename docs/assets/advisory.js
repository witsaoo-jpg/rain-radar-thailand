/* On-page advisories and optional in-session browser notifications. No background push. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),core=window.RainAdvisoryCore;
 const head=$('advisory-heading'),copy=$('advisory-message'),meta=$('advisory-meta'),choice=$('notify-enable'),stop=$('notify-disable'),state=$('notify-status');
 if(!core||!head)return;
 let enabled=false,lastKey='',latest=null;
 function clear(){
  latest=null;lastKey='';head.textContent='คำแนะนำสภาพอากาศตามพื้นที่';copy.textContent='เลือกตำแหน่งและกดดึงพยากรณ์เพื่อดูคำแนะนำ';meta.textContent='ผลจากแบบจำลอง Open-Meteo ไม่ใช่ประกาศเตือนภัยทางการ';
 }
 window.addEventListener('rainradar:forecast-cleared',clear);
 window.addEventListener('rainradar:forecast',event=>{
  const detail=event.detail;if(!detail?.result)return;
  const value=core.summarize(detail.result,detail.currentWeather);latest={...value,place:detail.selectedPlace||'ตำแหน่งที่เลือก'};
  head.textContent=latest.place+' · '+value.title;
  copy.textContent=value.message;
  meta.textContent='โอกาสฝนสูงสุดใน 3 ชั่วโมงที่แสดง '+(value.probability===undefined?'ไม่ทราบ':Math.round(value.probability)+'%')+' • ประเมินจากแบบจำลอง ไม่ใช่ข้อมูลเรดาร์หรือคำเตือนทางการ';
  if(!enabled || value.level!=='high')return;
  const hour=Math.floor(detail.retrievedAt/3600000),key=latest.place+':'+hour;
  if(key===lastKey)return;
  lastKey=key;
  state.textContent='พบช่วงพยากรณ์ฝนโอกาสสูงสำหรับ '+latest.place+' (แจ้งเมื่อเปิดหน้านี้เท่านั้น)';
  if('Notification' in window && Notification.permission==='granted' && document.visibilityState==='visible'){
   try{new Notification('Rain Radar: ข้อมูลพยากรณ์ฝน',{body:latest.place+' — '+value.title+' • ไม่ใช่ประกาศเตือนภัยทางการ',tag:'rainradar-model-advisory'});}catch(e){}
  }
 });
 choice.addEventListener('click',async()=>{
  enabled=true;choice.hidden=true;stop.hidden=false;
  state.textContent='เปิดการแจ้งเตือนในหน้านี้แล้ว เมื่อผู้ใช้ขอพยากรณ์ใหม่ และพบโอกาสฝนสูง';
  if(!('Notification' in window) || !window.isSecureContext){state.textContent+=' • เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนระบบ';return;}
  if(Notification.permission==='default'){
   try{const permission=await Notification.requestPermission();state.textContent=permission==='granted'?'อนุญาตแจ้งเตือนจากเบราว์เซอร์แล้ว (เฉพาะขณะเปิดเว็บและขอพยากรณ์ใหม่)':'แสดงข้อความเตือนภายในเว็บไซต์เท่านั้น';}
   catch(e){state.textContent='แสดงข้อความเตือนภายในเว็บไซต์เท่านั้น';}
  }else if(Notification.permission==='denied')state.textContent='เบราว์เซอร์ปฏิเสธสิทธิ์แจ้งเตือน — จะแสดงข้อความบนเว็บไซต์เท่านั้น';
 });
 stop.addEventListener('click',()=>{enabled=false;choice.hidden=false;stop.hidden=true;state.textContent='ปิดการแจ้งเตือนสำหรับหน้านี้แล้ว';});
 clear();
})();
