/* Optional rain outlook, triggered only by a user action after their location forecast.
   Model rain totals are not TMD radar observations or official flood forecasts. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),core=window.RainOutlookCore;
 if(!core||!$('outlook-request'))return;
 const status=$('outlook-status'),summary=$('outlook-summary'),grid=$('outlook-models');
 const table=$('outlook-compare'),ensembleBox=$('outlook-ensemble-result');
 let coords=null,name='',sequence=0,controller=null,results={},lastRequest=0,latestChance=null;
 const fmt=ms=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms)+' น.';
 const value=n=>n===null||n===undefined||!Number.isFinite(n)?'ไม่มีข้อมูล':n.toFixed(1)+' มม.';
 function abort(){
   sequence++;if(controller)controller.abort();controller=null;
   results={};lastRequest=0;grid.replaceChildren();table.replaceChildren();
   $('outlook-rain-pattern').textContent='';$('outlook-rain-chance').textContent='';$('outlook-rain-criterion').textContent='';
   ensembleBox.hidden=true;$('outlook-ensemble').disabled=true;
   $('outlook-request').disabled=!coords;
   $('outlook-request').textContent='วิเคราะห์ฝนสะสม 5 วัน';
   summary.textContent='ยังไม่ได้ขอข้อมูลแบบจำลอง';
   $('outlook-public').hidden=true;$('outlook-public-periods').replaceChildren();
 }
 function reset(message){coords=null;name='';latestChance=null;abort();status.textContent=message||'เลือก GPS หรือสถานที่โปรดก่อน แล้วกดวิเคราะห์เพื่อขอข้อมูล';}
 window.addEventListener('rainradar:location',event=>{
   const next=event.detail?.coords;
   if(!next){reset('ล้างพื้นที่แล้ว ข้อมูลพยากรณ์ฝนเดิมถูกลบจากหน้านี้');return;}
   try{
     const p=core.location(next.latitude,next.longitude);
     coords={latitude:p.lat,longitude:p.lon};latestChance=null;name=String(event.detail?.name||'ตำแหน่งปัจจุบัน').slice(0,50);
     abort();status.textContent='พร้อมวิเคราะห์ฝนสะสมสำหรับ '+name+' • กดปุ่มเพื่อส่งพิกัดโดยประมาณไป Open-Meteo';
   }catch(_){reset('พิกัดพื้นที่ไม่ถูกต้อง');}
 });
 window.addEventListener('rainradar:forecast',event=>{
   const d=event.detail;if(!coords||!d?.coordinates)return;
   try{const p=core.location(d.coordinates.latitude,d.coordinates.longitude);
     if(p.lat!==coords.latitude||p.lon!==coords.longitude)return;
     const n=d.result?.maxProbability;
     latestChance=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100?{percent:n,time:Date.now()}:null;
   }catch(_){}
 });
 window.addEventListener('rainradar:forecast-cleared',()=>{latestChance=null;if(coords){abort();status.textContent='เปลี่ยนหรืออัปเดตพยากรณ์แล้ว กดวิเคราะห์ฝนสะสมใหม่ได้';}});
 function cell(text,klass=''){
   const el=document.createElement('span');el.textContent=text;if(klass)el.className=klass;return el;
 }
 function render(){
   grid.replaceChildren();table.replaceChildren();
   const available=core.MODELS.filter(m=>results[m.id]&&results[m.id].totals[120]!==null);
   for(const model of core.MODELS){
     const item=document.createElement('div');item.className='outlook-card';
     item.append(cell(model.label,'outlook-name'));
     const r=results[model.id],totals=r?.totals;
     if(!totals){item.append(cell('ข้อมูลไม่พร้อม • ไม่ใช้ค่าจำลอง'));grid.append(item);continue;}
     for(const n of core.WINDOWS)item.append(cell(n+' ชม. '+value(totals[n])));
     grid.append(item);
   }
   summary.textContent=core.interpretation(results);
   const publicReport=core.publicSummary(results),publicBox=$('outlook-public');
   publicBox.hidden=false;
   $('outlook-public-title').textContent=publicReport.title;
   $('outlook-public-lead').textContent=publicReport.lead;
   $('outlook-rain-pattern').textContent=core.rainPattern(results);
   $('outlook-rain-chance').textContent=latestChance&&Date.now()-latestChance.time<45*60000?
     'โอกาสเกิดฝนสูงสุดใน 3 ชั่วโมงที่แสดงจากพยากรณ์พื้นที่ (Open-Meteo แยกจากการเปรียบเทียบ ECMWF/GFS/ICON): '+Math.round(latestChance.percent)+'% • ไม่ใช่โอกาสฝนตลอด 5 วัน':
     'ยังไม่มีเปอร์เซ็นต์โอกาสฝนที่ตรวจสอบได้สำหรับช่วงสั้น • ตัวเลข มม. ด้านล่างคือปริมาณฝน ไม่ใช่เปอร์เซ็นต์โอกาสเกิดฝน';
   const periods=$('outlook-public-periods');periods.replaceChildren();
   for(const hours of core.WINDOWS){
     const item=document.createElement('div');item.className='outlook-period';
     item.append(cell(hours===24?'24 ชั่วโมง':hours===72?'3 วัน':'5 วัน','outlook-period-label'),
       cell(publicReport.labels?.[hours]||'ข้อมูลไม่พร้อม','outlook-period-value'));
     periods.append(item);
   }
   $('outlook-rain-criterion').textContent=publicReport.criterion24||'ยังเทียบเกณฑ์ฝน 24 ชั่วโมงไม่ได้';
   $('outlook-public-agreement').textContent=publicReport.agreement;
   $('outlook-public-advice').textContent=publicReport.advice;
   for(const m of available){
     const row=document.createElement('div');row.className='outlook-compare-row';
     row.append(cell(m.label),cell(value(results[m.id].totals[24])),cell(value(results[m.id].totals[72])),cell(value(results[m.id].totals[120])));
     table.append(row);
   }
   $('outlook-source').textContent='Open-Meteo • ดึงข้อมูลเมื่อ '+fmt(lastRequest)+
     ' • ฝนสะสมจากช่วงเวลารายชั่วโมงต่อเนื่อง • ไม่ยืนยันเวลารันแบบจำลองต้นฉบับ • พิกัดอาจต่างจากกริดจริง';
   $('outlook-ensemble').disabled=!results['ecmwf_ifs025'];
 }
 async function getJson(url,signal){
   const r=await fetch(url,{cache:'no-store',signal,headers:{Accept:'application/json'}});
   if(!r.ok)throw new Error('API '+r.status);
   return r.json();
 }
 $('outlook-request').addEventListener('click',async()=>{
   if(!coords)return;
   abort();const id=++sequence;controller=new AbortController();const signal=controller.signal;
   $('outlook-request').disabled=true;$('outlook-request').textContent='กำลังวิเคราะห์…';
   status.textContent='กำลังอ่านแบบจำลอง ECMWF / GFS / ICON สำหรับ '+name;
   const now=Date.now();lastRequest=now;
   const settled=await Promise.allSettled(core.MODELS.map(async m=>{
     const data=await getJson(core.url(m.id,coords.latitude,coords.longitude),signal);
     return {id:m.id,result:core.parseModel(data,now)};
   }));
   if(id!==sequence||signal.aborted)return;
   for(const result of settled)if(result.status==='fulfilled'&&result.value.result)results[result.value.id]=result.value.result;
   render();
   const count=Object.keys(results).length;
   status.textContent=count?'ได้รับข้อมูล '+count+' จาก 3 แบบจำลอง บางชุดอาจยังไม่มีข้อมูลที่สมบูรณ์':'ข้อมูลแบบจำลองไม่พร้อม กรุณาลองใหม่ภายหลัง';
   $('outlook-request').disabled=false;$('outlook-request').textContent='↻ วิเคราะห์ใหม่';
 });
 $('outlook-ensemble').addEventListener('click',async()=>{
   if(!coords||!results['ecmwf_ifs025'])return;
   const id=sequence;const p={...coords};
   $('outlook-ensemble').disabled=true;ensembleBox.hidden=false;
   ensembleBox.textContent='กำลังตรวจสอบ ECMWF Ensemble…';
   try{
     const data=await getJson(core.ensembleUrl(p.latitude,p.longitude),controller?.signal);
     if(id!==sequence)return;
     const e=core.parseEnsemble(data,Date.now());
     ensembleBox.textContent=e?
      'ECMWF Ensemble '+e.members+' สมาชิก • ฝนสะสม 120 ชม. P10: '+value(e.p10)+' • ค่ามัธยฐาน: '+value(e.median)+' • P90: '+value(e.p90)+' (เป็นช่วงการกระจายของแบบจำลอง ไม่ใช่ความน่าจะเป็นเกิดน้ำท่วม)':
      'ข้อมูลสมาชิก Ensemble ยังไม่ครบตามเกณฑ์ จึงไม่แสดงการกระจายค่า';
   }catch(_){if(id===sequence)ensembleBox.textContent='ไม่สามารถดึง Ensemble ได้ โปรดลองอีกครั้ง';}
   finally{if(id===sequence)$('outlook-ensemble').disabled=false;}
 });
 reset();
})();
