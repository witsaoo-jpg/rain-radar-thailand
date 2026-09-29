/* Senior-friendly explicit refresh. Does not reload the page or reacquire GPS. */
(() => {
 'use strict';
 const button=document.getElementById('easy-refresh-button');
 const status=document.getElementById('easy-refresh-status');
 if(!button||!status)return;
 let selected=false,busy=false,pendingRadar=false,pendingForecast=false,forecastOutcome='';
 function update(){
   if(!busy)return;
   if(pendingRadar||pendingForecast)return;
   busy=false;button.disabled=false;button.textContent='↻ อัปเดตสภาพอากาศและเรดาร์';
   status.textContent=forecastOutcome==='ok'
      ?'ตรวจสอบข้อมูลแล้ว • รายงานอากาศอัปเดต และตรวจสอบสถานะภาพเรดาร์แล้ว'
      :forecastOutcome==='error'
      ?'ตรวจสอบเรดาร์แล้ว แต่ข้อมูลพยากรณ์ยังไม่พร้อม กรุณาลองใหม่'
      :'ตรวจสอบภาพเรดาร์แล้ว • เลือกพื้นที่เพื่อรับรายงานอากาศตามตำแหน่ง';
 }
 window.addEventListener('rainradar:location',event=>{
   selected=!!event.detail?.coords;
   if(!busy)status.textContent=selected
     ?'เลือกพื้นที่แล้ว • กดอัปเดตเพื่อขอข้อมูลใหม่โดยใช้พิกัดโดยประมาณ'
     :'ยังไม่ได้เลือกพื้นที่ • กดอัปเดตเพื่อดูเรดาร์ หรือเลือก GPS/สถานที่โปรดก่อน';
 });
 window.addEventListener('rainradar:radar-refresh-finished',()=>{
   if(!busy)return;
   pendingRadar=false;update();
 });
 window.addEventListener('rainradar:forecast',()=>{
   if(!busy||!pendingForecast)return;
   forecastOutcome='ok';pendingForecast=false;update();
 });
 window.addEventListener('rainradar:forecast-cleared',()=>{
   if(!busy||!pendingForecast)return;
   forecastOutcome='error';pendingForecast=false;update();
 });
 button.addEventListener('click',()=>{
   if(busy)return;
   busy=true;pendingRadar=true;
   pendingForecast=selected&&!document.getElementById('forecast-request').disabled;
   forecastOutcome='';
   button.disabled=true;button.textContent='กำลังอัปเดตข้อมูล…';
   status.textContent=pendingForecast
     ?'กำลังตรวจสอบเรดาร์และดึงรายงานตามพิกัดที่คุณเลือก…'
     :'กำลังตรวจสอบภาพเรดาร์… หากต้องการรายงานตามพื้นที่ กรุณาเลือก GPS หรือสถานที่โปรด';
   window.dispatchEvent(new CustomEvent('rainradar:refresh-radar'));
   if(pendingForecast)window.dispatchEvent(new CustomEvent('rainradar:refresh-forecast'));
 });
})();