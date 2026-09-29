/* Public, source-labelled weather report after explicit forecast request. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),core=window.RainWeatherIntel;
 if(!core||!$('weather-intel'))return;
 let radar={available:false,station:'ทั่วประเทศ',generatedAt:null},forecast=null;
 const fmt=ms=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms)+' น.';
 function renderRadar(){
   $('intel-radar').textContent=core.radarStatus(radar.available,radar.station,radar.generatedAt,Date.now());
   $('intel-radar-source').textContent=radar.generatedAt?'บันทึก Snapshot: '+fmt(Date.parse(radar.generatedAt))+' • ไม่ใช่เวลาตรวจวัดจริง':'ยังไม่มีเวลาบันทึกภาพ';
 }
 function clear(){
   forecast=null;
   $('intel-grid').hidden=true;
   $('intel-place').textContent='เลือกตำแหน่งและกดดึงพยากรณ์เพื่ออ่านรายงาน';
   $('intel-condition').textContent='ยังไม่มีข้อมูลสภาพอากาศเฉพาะพื้นที่';
   for(const id of ['intel-rain','intel-temperature','intel-fog','intel-cloud','intel-wind'])$(id).textContent='—';
   $('intel-forecast').textContent='ไม่มีข้อมูลพยากรณ์';
   $('intel-model-time').textContent='แหล่งข้อมูลอุณหภูมิ/ฝน/หมอก/ลม: Open-Meteo (แบบจำลอง) • ยังไม่ได้รับข้อมูล';
 }
 window.addEventListener('rainradar:forecast-cleared',clear);
 window.addEventListener('rainradar:forecast',event=>{
   const d=event.detail;if(!d?.result)return;
   forecast=d; const w=core.level(d.currentWeather,d.result);
   $('intel-grid').hidden=false;
   $('intel-place').textContent='รายงานสำหรับ '+String(d.selectedPlace||'ตำแหน่งที่เลือก');
   $('intel-condition').textContent=w.title;
   $('intel-rain').textContent=w.rain;
   $('intel-temperature').textContent=w.temperature;
   $('intel-fog').textContent=w.fog;
   $('intel-cloud').textContent=w.cloud;
   $('intel-wind').textContent=w.wind;
   $('intel-forecast').textContent=w.extra;
   $('intel-model-time').textContent=(d.currentWeather?'แบบจำลองเวลา '+fmt(d.currentWeather.timestamp)+' • ':'ข้อมูลปัจจุบันไม่พร้อม • ')+'ดึงข้อมูลเมื่อ '+fmt(d.retrievedAt)+' • Open-Meteo ไม่ใช่ผลตรวจอากาศ ณ จุด GPS';
 });
 window.addEventListener('rainradar:radar',event=>{
   const d=event.detail||{};
   radar={available:!!d.available,station:d.station||'สถานีที่เลือก',generatedAt:d.generatedAt||null};
   renderRadar();
 });
 clear();renderRadar();
})();
