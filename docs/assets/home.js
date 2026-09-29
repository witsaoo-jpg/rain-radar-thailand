/* Opt-in Location First home: no stored GPS coordinates and no unexpected first-use request. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const core=window.RainForecastCore;
 const key='rainradar:auto-location:v1';
 const navigation={home:$('tab-home'),radar:$('tab-radar'),more:$('tab-more')};
 if(!core||!navigation.home||!$('home-view'))return;
 let preference=false,pendingConsent=false,autoRequest=false,currentPlace=null;
 function readPreference(){try{return localStorage.getItem(key)==='yes';}catch(_){return false;}}
 function storePreference(value){
   preference=!!value;
   try{if(preference)localStorage.setItem(key,'yes');else localStorage.removeItem(key);}
   catch(_){preference=false;}
   $('home-auto-toggle').checked=preference;
 }
 preference=readPreference();
 $('home-auto-toggle').checked=preference;
 const iconFor=code=>{
   if([45,48].includes(code))return '🌫️';
   if([95,96,99].includes(code))return '⛈️';
   if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return '🌧️';
   if(code===0)return '☀️';if([1,2].includes(code))return '⛅';
   if(code===3)return '☁️';return '☁';
 };
 const fmtTime=ts=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(ts)+' น.';
 function switchView(view){
   const home=view==='home';
   $('home-view').hidden=!home;$('tools-view').hidden=home;
   document.body.classList.toggle('tools-mode',!home);
   Object.entries(navigation).forEach(([id,button])=>{
     const selected=id===view;button.classList.toggle('active',selected);
     if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
   });
   if(!home){
     const target=view==='more'?'places-manage':'radar-heading';
     if(view==='more')$('places-manage').open=true;
     (document.getElementById(target)||$('tools-view')).scrollIntoView({behavior:'smooth',block:'start'});
   }else $('home-view').scrollIntoView({behavior:'smooth',block:'start'});
 }
 Object.entries(navigation).forEach(([key,button])=>button.addEventListener('click',()=>switchView(key)));
 $('home-open-radar').addEventListener('click',()=>switchView('radar'));
 $('home-open-places').addEventListener('click',()=>switchView('more'));
 $('home-change').addEventListener('click',()=>switchView('more'));
 function showIdle(message){
   $('home-place').textContent='สภาพอากาศพื้นที่ของคุณ';
   $('home-icon').textContent='☁';
   $('home-temperature').textContent='—';
   $('home-condition').textContent=message||'อนุญาตตำแหน่งเพื่อดูสภาพอากาศที่คุณอยู่';
   $('home-feels').textContent='';
   $('home-rain').textContent='ยังไม่มีข้อมูลพยากรณ์เฉพาะพื้นที่';
   $('home-meta').textContent='ข้อมูลจะปรากฏหลังได้รับความยินยอมและตรวจสอบข้อมูลจริง';
   $('home-forecast').hidden=true;$('home-actions').hidden=true;$('home-consent').hidden=false;
   $('home-national').open=true;
 }
 function requestLocation(){
   pendingConsent=true;autoRequest=true;
   $('home-location').disabled=true;$('home-location').textContent='กำลังขอตำแหน่ง…';
   $('home-location-status').textContent='รอการอนุญาต GPS จากเบราว์เซอร์';
   $('gps-button').click();
 }
 $('home-location').addEventListener('click',requestLocation);
 $('home-auto-toggle').addEventListener('change',event=>{
   storePreference(event.target.checked);
   $('home-meta').textContent=preference
    ?'เปิดการขออากาศตาม GPS ครั้งต่อไป • ปิดได้จากช่องนี้ • ไม่เก็บพิกัดถาวร'
    :'ปิดการขอตำแหน่งอัตโนมัติแล้ว • ข้อมูลปัจจุบันยังแสดงจนกว่าจะเปลี่ยนพื้นที่';
 });
 $('home-refresh').addEventListener('click',()=>{
   if(currentPlace&& !$('forecast-request').disabled){
     $('home-refresh').disabled=true;$('home-refresh').textContent='กำลังอัปเดต…';
     window.dispatchEvent(new CustomEvent('rainradar:refresh-forecast'));
   }
 });
 window.addEventListener('rainradar:location',event=>{
   const d=event.detail||{};
   if(!d.coords){currentPlace=null;autoRequest=false;if(!pendingConsent)showIdle();return;}
   currentPlace={...d.coords};
   const name=d.name||'ตำแหน่งปัจจุบัน';
   $('home-place').textContent=name+(d.name?'':' · '+d.coords.latitude.toFixed(2)+', '+d.coords.longitude.toFixed(2));
   if(pendingConsent){
     pendingConsent=false;storePreference(true);
     $('home-location').disabled=false;$('home-location').textContent='📍 ใช้สภาพอากาศตำแหน่งของฉัน';
     $('home-location-status').textContent='ได้รับ GPS แล้ว กำลังโหลดพยากรณ์…';
   }
   // Automatic request only after the user's explicit prior opt-in. Favorite buttons separately initiate their own request.
   if(autoRequest && preference){
     autoRequest=false;
     if(!$('forecast-request').disabled)window.dispatchEvent(new CustomEvent('rainradar:refresh-forecast'));
   }
 });
 window.addEventListener('rainradar:gps-error',event=>{
   pendingConsent=false;autoRequest=false;
   $('home-location').disabled=false;$('home-location').textContent='📍 ลองใช้ตำแหน่งอีกครั้ง';
   $('home-location-status').textContent=event.detail?.message||'ค้นหาตำแหน่งไม่สำเร็จ';
   if(preference)storePreference(false);
 });
 window.addEventListener('rainradar:forecast-cleared',()=>{
   $('home-refresh').disabled=false;$('home-refresh').textContent='↻ อัปเดตอากาศ';
   $('home-forecast').hidden=true;
 });
 window.addEventListener('rainradar:forecast',event=>{
   const d=event.detail;if(!d?.result)return;
   const c=d.currentWeather;
   $('home-place').textContent=d.selectedPlace==='ตำแหน่งของคุณ'?
     'ตำแหน่งปัจจุบัน · '+d.coordinates.latitude.toFixed(2)+', '+d.coordinates.longitude.toFixed(2):d.selectedPlace;
   $('home-icon').textContent=iconFor(c?.code);
   $('home-temperature').textContent=c?.temperature!==null&&c?' '+Math.round(c.temperature)+'°':'—';
   $('home-condition').textContent=c?.description||'สภาพอากาศปัจจุบันไม่มีข้อมูล';
   $('home-feels').textContent=c?.feelsLike!==null&&c?'รู้สึกเหมือน '+Math.round(c.feelsLike)+'°C':'';
   $('home-rain').textContent=d.result.maxProbability!==null?
     'โอกาสฝนสูงสุดใน 3 ชั่วโมงที่แสดง '+Math.round(d.result.maxProbability)+'%':
     'ข้อมูลโอกาสเกิดฝนยังไม่พร้อม';
   $('home-meta').textContent='แบบจำลอง Open-Meteo • ดึงข้อมูล '+fmtTime(d.retrievedAt)+' • ไม่ใช่ผลตรวจอากาศ ณ จุด GPS';
   $('home-consent').hidden=true;$('home-actions').hidden=false;
   $('home-refresh').disabled=false;$('home-refresh').textContent='↻ อัปเดตอากาศ';
   $('home-auto-toggle').checked=preference;
   $('home-hours').replaceChildren();$('home-days').replaceChildren();
   for(const row of d.result.rows){
     const card=document.createElement('div');card.className='home-hour';
     const time=document.createElement('strong');time.textContent=fmtTime(row.timestamp);
     const rain=document.createElement('span');rain.textContent=row.probability===null?'ฝน: ไม่มีข้อมูล':'โอกาสฝน '+Math.round(row.probability)+'%';
     const amount=document.createElement('small');amount.textContent=row.precipitation===null?'ปริมาณฝน: ไม่มีข้อมูล':row.precipitation.toFixed(1)+' มม.';
     card.append(time,rain,amount);$('home-hours').append(card);
   }
   for(const day of d.daily||[]){
     const card=document.createElement('div');card.className='home-day';
     const date=document.createElement('strong');date.textContent=day.date.slice(8,10)+'/'+day.date.slice(5,7);
     const condition=document.createElement('span');condition.textContent=iconFor(day.code)+' '+core.weatherDescription(day.code);
     const p=document.createElement('span');p.textContent=day.probability===null?'ฝน: —':'ฝน '+Math.round(day.probability)+'%';
     const temps=document.createElement('strong');temps.textContent=day.min===null||day.max===null?'—':Math.round(day.min)+'–'+Math.round(day.max)+'°';
     card.append(date,condition,p,temps);$('home-days').append(card);
   }
   $('home-forecast').hidden=false;$('home-national').open=false;
 });
 async function tryAutomaticLocation(){
   if(!preference||!navigator.geolocation||!navigator.permissions?.query||!window.isSecureContext)return;
   try{
     const status=await navigator.permissions.query({name:'geolocation'});
     if(status.state!=='granted'){if(status.state==='denied')storePreference(false);return;}
     autoRequest=true; $('home-location-status').textContent='กำลังดึงสภาพอากาศตาม GPS ที่เคยอนุญาต…';
     $('gps-button').click();
   }catch(_){/* Require the visible button on browsers without reliable permission introspection. */}
 }
 showIdle();
 tryAutomaticLocation();
})();