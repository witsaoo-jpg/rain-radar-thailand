/* Opt-in local weather forecast; no automatic third-party location request. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const core=window.RainForecastCore;
 const banner=$('weather-banner'),headline=$('weather-headline'),summary=$('weather-summary'),detail=$('weather-detail'),action=$('weather-banner-action');
 const request=$('forecast-request'),cancel=$('forecast-clear'),notice=$('forecast-consent'),status=$('forecast-status'),content=$('forecast-result'),hourly=$('forecast-hours');
 if(!core||!request)return;
 let location=null,seq=0,controller=null;
 const bannerMessage=(heading,message,more='')=>{if(!banner)return;headline.textContent=heading;summary.textContent=message;detail.textContent=more;};
 const fmtTime=ms=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms)+' น.';
 function reset(message) {
   seq++;
   if(controller)controller.abort();
   controller=null;location=null;
   request.disabled=true;request.textContent='ดึงพยากรณ์พื้นที่ของฉัน';
   cancel.hidden=true;notice.hidden=true;content.hidden=true;
   hourly.replaceChildren();
   status.textContent=message||'กดอนุญาต GPS ด้านบนก่อน จากนั้นเลือกส่งพิกัดโดยประมาณเพื่อขอพยากรณ์';
   bannerMessage('สภาพอากาศใกล้คุณ','เปิด GPS และกดดึงพยากรณ์เพื่อดูสภาพอากาศในพื้นที่','ไม่ส่งพิกัดไปยังบริการพยากรณ์โดยอัตโนมัติ');
   action.textContent='ไปที่ฝนใกล้ฉัน';
 }
 function setLocation(coords){
   if(!coords||!core.roundedLocation){reset();return;}
   try{location=core.roundedLocation(coords.latitude,coords.longitude);}
   catch(e){reset('พิกัดไม่ถูกต้อง ไม่สามารถขอพยากรณ์ได้');return;}
   seq++;if(controller)controller.abort();controller=null;
   content.hidden=true;hourly.replaceChildren();
   request.disabled=false;cancel.hidden=false;notice.hidden=false;
   status.textContent='พร้อมขอพยากรณ์ ต้องกดปุ่มด้านล่างก่อนส่งพิกัดไป Open-Meteo';
   bannerMessage('พบตำแหน่งของคุณแล้ว','กดดึงพยากรณ์ด้านล่างเพื่อรับรายงานสภาพอากาศตามพื้นที่','ต้องยินยอมส่งพิกัดโดยประมาณไปยัง Open-Meteo ก่อน');
 }
 const onGPS=event=>{if(event.detail?.coords)setLocation(event.detail.coords);else reset('ล้างข้อมูลพยากรณ์แล้ว กรุณาอนุญาต GPS หากต้องการใช้งานอีกครั้ง');};
 window.addEventListener('rainradar:location',onGPS);
 request.addEventListener('click',async()=>{
   if(!location)return;
   const current=++seq;
   if(controller)controller.abort();
   controller=new AbortController();
   const signal=controller.signal;
   request.disabled=true;request.textContent='กำลังโหลด…';content.hidden=true;
   status.textContent='กำลังติดต่อ Open-Meteo โดยใช้พิกัดปัดเศษสองตำแหน่ง';
   bannerMessage('กำลังตรวจสอบสภาพอากาศ','กำลังอ่านข้อมูลแบบจำลองตามตำแหน่งที่คุณยินยอม','ไม่ใช่เรดาร์ตรวจวัดฝน ณ จุด GPS');
   try{
     const url=core.buildUrl(location.latitude,location.longitude);
     const response=await fetch(url,{signal,cache:'no-store',headers:{Accept:'application/json'}});
     if(!response.ok)throw new Error('API HTTP '+response.status);
     const data=await response.json();
     if(current!==seq)return;
     const result=core.parseForecast(data,Date.now());
     const currentWeather=core.parseCurrent(data,Date.now());
     $('forecast-probability').textContent=result.maxProbability===null?'ไม่มีข้อมูล':result.maxProbability.toFixed(0)+'%';
     $('forecast-amount').textContent=result.sumPrecipitation===null?'ข้อมูลไม่ครบ':result.sumPrecipitation.toFixed(1)+' มม.';
     $('forecast-advice').textContent=core.advisory(result.maxProbability);
     $('forecast-updated').textContent='ขอข้อมูลเมื่อ '+fmtTime(Date.now())+' • เวลาพยากรณ์คือชั่วโมงสิ้นสุดช่วงสะสม • ข้อมูลแบบจำลอง ไม่ใช่เรดาร์ตรวจฝน ณ จุดนี้';
     $('forecast-grid').textContent=result.grid ? 'จุดกริดแบบจำลอง: '+result.grid.latitude.toFixed(2)+', '+result.grid.longitude.toFixed(2)+' (อาจไม่ตรงกับ GPS)' : 'ไม่ทราบจุดกริดแบบจำลอง';
     hourly.replaceChildren();
     for(const row of result.rows){
       const item=document.createElement('div');item.className='forecast-hour';
       const t=document.createElement('strong');t.textContent=fmtTime(row.timestamp);
       const p=document.createElement('span');p.textContent='โอกาสฝน '+(row.probability===null?'—':row.probability.toFixed(0)+'%');
       const a=document.createElement('span');a.textContent='ปริมาณฝน '+(row.precipitation===null?'—':row.precipitation.toFixed(1)+' มม.');
       item.append(t,p,a);hourly.append(item);
     }
     content.hidden=false;status.textContent='ได้รับข้อมูลพยากรณ์ตามตำแหน่งโดยประมาณแล้ว';
     const max=result.maxProbability===null?'ไม่ทราบ':result.maxProbability.toFixed(0)+'%';
     const temp=currentWeather?.temperature===null || !currentWeather?'ไม่ทราบอุณหภูมิ':currentWeather.temperature.toFixed(1)+'°C';
     const condition=currentWeather?.description||'ไม่มีข้อมูลสภาพอากาศปัจจุบัน';
     bannerMessage('สภาพอากาศใกล้คุณ · '+condition, temp+' | โอกาสเกิดฝนสูงสุดใน 3 ชั่วโมงที่แสดง '+max,
       (currentWeather ? 'แบบจำลองเวลา '+fmtTime(currentWeather.timestamp)+' • ' : 'ข้อมูลสภาพอากาศปัจจุบันไม่พร้อม • ') +
       'ดึงข้อมูลเมื่อ '+fmtTime(Date.now())+' • Open-Meteo • ไม่ใช่ประกาศเตือนภัย');
     action.textContent='ดูรายละเอียดรายชั่วโมง';
   }catch(error){
     if(current!==seq||signal.aborted)return;
     status.textContent='ไม่สามารถดึงข้อมูลพยากรณ์ได้ โปรดลองใหม่ภายหลัง และดูข้อมูลจากกรมอุตุนิยมวิทยาโดยตรง';
     bannerMessage('ยังไม่สามารถรายงานสภาพอากาศได้','ข้อมูลตามพิกัดยังไม่พร้อม กรุณาลองอีกครั้ง','ตรวจสอบเรดาร์และประกาศจากกรมอุตุนิยมวิทยาโดยตรง');
   }finally{
     if(current===seq){request.disabled=false;request.textContent='อัปเดตพยากรณ์';}
   }
 });
 cancel.addEventListener('click',()=>reset('ล้างพิกัดจากโมดูลพยากรณ์แล้ว (หากต้องการล้าง GPS ด้วย ให้กดล้างพิกัดด้านบน)'));
 action.addEventListener('click',()=>document.getElementById('near-me-title')?.scrollIntoView({behavior:'smooth',block:'start'}));
 reset();
})();