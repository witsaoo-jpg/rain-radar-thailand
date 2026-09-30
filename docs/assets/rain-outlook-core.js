/* Rainfall outlook: comparisons are forecast model guidance, never a flood warning.
   Open-Meteo precipitation = preceding-hour millimetres. Unix timestamps are UTC. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainOutlookCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MODELS=[
  {id:'ecmwf_ifs025',label:'ECMWF IFS 0.25°'},
  {id:'ncep_gfs_global',label:'NOAA GFS Global'},
  {id:'icon_global',label:'DWD ICON Global'}
 ];
 const WINDOWS=[24,72,120],STEP=3600;
 const RAIN_24_CRITERIA=[
  {key:'trace',label:'ฝนวัดจำนวนไม่ได้',display:'< 0.1 มม.'},
  {key:'light',label:'ฝนเล็กน้อย',display:'0.1–10.0 มม.'},
  {key:'moderate',label:'ฝนปานกลาง',display:'10.1–35.0 มม.'},
  {key:'heavy',label:'ฝนหนัก',display:'35.1–90.0 มม.'},
  {key:'very-heavy',label:'ฝนหนักมาก',display:'≥ 90.1 มม.'}
 ];
 function rain24Level(amount){
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0)return null;
  if(amount<0.1)return RAIN_24_CRITERIA[0];
  if(amount<=10.0)return RAIN_24_CRITERIA[1];
  if(amount<=35.0)return RAIN_24_CRITERIA[2];
  if(amount<=90.0)return RAIN_24_CRITERIA[3];
  return RAIN_24_CRITERIA[4];
 }
 function rain24Range(min,max){
  if(typeof min!=='number'||typeof max!=='number'||!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min)return null;
  const low=rain24Level(min),high=rain24Level(max);
  return {low,high,label:low.key===high.key?low.label:low.label+' ถึง '+high.label};
 }
 function location(lat,lon){
  if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new Error('Invalid location');
  return {lat:Number(lat.toFixed(2)),lon:Number(lon.toFixed(2))};
 }
 function url(model,lat,lon){
  if(!MODELS.some(m=>m.id===model))throw new Error('Unapproved model');
  const p=location(lat,lon),u=new URL('https://api.open-meteo.com/v1/forecast');
  for(const [k,v] of Object.entries({latitude:p.lat,longitude:p.lon,hourly:'precipitation',models:model,forecast_days:7,timeformat:'unixtime',timezone:'Asia/Bangkok',precipitation_unit:'mm'}))u.searchParams.set(k,String(v));
  return u.toString();
 }
 function ensembleUrl(lat,lon){
  const p=location(lat,lon),u=new URL('https://ensemble-api.open-meteo.com/v1/ensemble');
  for(const [k,v] of Object.entries({latitude:p.lat,longitude:p.lon,hourly:'precipitation',models:'ecmwf_ifs025_ensemble',forecast_days:7,timeformat:'unixtime',timezone:'Asia/Bangkok',precipitation_unit:'mm'}))u.searchParams.set(k,String(v));
  return u.toString();
 }
 function precipitation(v){return typeof v==='number'&&!Number.isNaN(v)&&Number.isFinite(v)&&v>=0&&v<=1000?v:null;}
 function validate(data, values, now){
  if(!data||data.error||data.timezone!=='Asia/Bangkok'||data.hourly_units?.precipitation!=='mm'||!Array.isArray(data.hourly?.time)||!Array.isArray(values)||values.length!==data.hourly.time.length)throw new Error('Invalid units or hourly data');
  const times=data.hourly.time;
  let previous=-Infinity;
  for(const t of times){if(!Number.isSafeInteger(t)||t<=previous)throw new Error('Invalid hourly timestamps');previous=t;}
  const next=Math.ceil(now/3600000)*STEP;
  const index=times.indexOf(next);
  // Model data must cover precisely the next 120 completed hourly intervals.
  if(index<0)return null;
  const rows=[];
  for(let i=0;i<120;i++){
   const x=index+i;
   if(times[x]!==next+i*STEP)return null;
   rows.push(precipitation(values[x]));
  }
  return {start:next*1000,rows,grid:typeof data.latitude==='number'&&typeof data.longitude==='number'?{lat:data.latitude,lon:data.longitude}:null};
 }
 function totals(rows){
  const result={};
  for(const n of WINDOWS){
   const values=rows.slice(0,n);
   result[n]=values.length===n&&values.every(v=>v!==null)?
      Math.round(values.reduce((a,b)=>a+b,0)*10)/10:null;
  }
  return result;
 }
 function parseModel(data,now){
  const series=validate(data,data?.hourly?.precipitation,Number.isFinite(now)?now:Date.now());
  return series?{...series,totals:totals(series.rows)}:null;
 }
 function quantile(sorted,p){const v=(sorted.length-1)*p,lo=Math.floor(v),hi=Math.ceil(v);return sorted[lo]+(sorted[hi]-sorted[lo])*(v-lo);}
 function parseEnsemble(data,now){
  if(!data||data.error||data.timezone!=='Asia/Bangkok'||!data.hourly||!data.hourly_units)return null;
  const keys=Object.keys(data.hourly).filter(k=>/^precipitation_member\d+$/.test(k)&&data.hourly_units[k]==='mm').sort();
  const amounts=[];
  for(const key of keys){
   let r;
   try{r=validate({...data,hourly_units:{precipitation:'mm'}},data.hourly[key],Number.isFinite(now)?now:Date.now());}catch(_){continue;}
   if(r&&r.rows.every(v=>v!==null))amounts.push(totals(r.rows)[120]);
  }
  if(amounts.length<10)return null; // never assert ensemble confidence on a tiny/unverified subset
  amounts.sort((a,b)=>a-b);
  return {members:amounts.length,p10:Math.round(quantile(amounts,.1)*10)/10,median:Math.round(quantile(amounts,.5)*10)/10,p90:Math.round(quantile(amounts,.9)*10)/10};
 }
 function interpretation(models){
  const available=MODELS.map(m=>models[m.id]).filter(m=>m&&m.totals[120]!==null);
  if(available.length<2)return 'ยังมีข้อมูลจากแบบจำลองไม่เพียงพอสำหรับเปรียบเทียบ โปรดตรวจประกาศทางการ';
  const values=available.map(m=>m.totals[120]);
  const min=Math.min(...values),max=Math.max(...values);
  return 'แบบจำลอง '+available.length+' ชุดให้ฝนสะสม 120 ชั่วโมงระหว่าง '+min.toFixed(1)+'–'+max.toFixed(1)+' มม. ค่าต่างกัน '+(max-min).toFixed(1)+' มม. เป็นข้อมูลพยากรณ์ ไม่ใช่ระดับน้ำหรือการยืนยันน้ำท่วม';
 }
 function publicSummary(models){
   const byWindow={};const n=MODELS.length;
   for(const hours of WINDOWS){
     const values=MODELS.map(m=>models[m.id]?.totals?.[hours]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
     byWindow[hours]={count:values.length,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null};
   }
   const five=byWindow[120],one=byWindow[24],three=byWindow[72];
   if(five.count===0)return {available:false,title:'ยังสรุปแนวโน้มฝน 5 วันไม่ได้',lead:'ข้อมูลฝนสะสม 120 ชั่วโมงยังไม่พร้อม กรุณาลองอัปเดตอีกครั้ง',windows:byWindow,agreement:'ยังเปรียบเทียบแบบจำลองไม่ได้',advice:'ตรวจสอบประกาศกรมอุตุนิยมวิทยาและข้อมูลสถานการณ์น้ำจากแหล่งทางการ'};
   const range=x=>x.count===0?'ไม่มีข้อมูลครบช่วง':x.min.toFixed(1)+(x.min===x.max?'':'–'+x.max.toFixed(1))+' มม. ('+x.count+'/'+n+' แบบจำลอง)';
   let title='แนวโน้มฝนสะสมในพื้นที่ที่เลือก';
   let lead='แบบจำลองที่มีข้อมูลครบ '+five.count+' จาก '+n+' ชุด คาดฝนสะสม 5 วัน '+range(five)+' โดยยังไม่ใช่ฝนตรวจวัดจริง';
   let agreement='มีเพียงแบบจำลองเดียวที่มีข้อมูลครบ จึงยังเปรียบเทียบความแตกต่างไม่ได้';
   if(five.count>=2){
     const spread=five.max-five.min;
     agreement='ผลพยากรณ์ 5 วันแตกต่างกัน '+spread.toFixed(1)+' มม. ควรตรวจดูข้อมูลรอบใหม่ เพราะแนวโน้มยังมีความไม่แน่นอน';
   }
   const level24=one.count?rain24Range(one.min,one.max):null;
   const criterion24=level24?'ฝน 24 ชั่วโมง '+range(one)+' • เมื่อเทียบช่วงเกณฑ์ปริมาณฝน 24 ชม. ของ TMD อยู่ในช่วง “'+level24.label+'” (ใช้ช่วยอ่านค่าพยากรณ์ ไม่ใช่รายงานฝนตรวจวัด)':'ยังเทียบเกณฑ์ฝน 24 ชั่วโมงไม่ได้ เพราะข้อมูลไม่ครบ';
   return {available:true,title,lead,windows:byWindow,labels:{24:range(one),72:range(three),120:range(five)},criterion24,agreement,advice:'ตรวจพยากรณ์รายวันและภาพเรดาร์ก่อนเดินทาง หากพื้นที่มีประกาศเตือนภัยให้ปฏิบัติตามหน่วยงานทางการ'};
 }
 function rainPattern(models){
   const complete=MODELS.map(m=>models[m.id]).filter(r=>r&&Array.isArray(r.rows)&&r.rows.slice(0,24).length===24&&r.rows.slice(0,24).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0));
   if(!complete.length)return 'ยังไม่มีข้อมูลรายชั่วโมงครบ 24 ชั่วโมง จึงยังบอกลักษณะช่วงที่อาจมีฝนไม่ได้';
   const wet=complete.filter(r=>r.rows.slice(0,24).some(v=>v>=0.1));
   const label=wet.length===0?
    'แบบจำลองที่มีข้อมูลครบ '+complete.length+' ชุดยังไม่แสดงฝนที่วัดเป็นจำนวนได้ใน 24 ชั่วโมงข้างหน้า แต่ไม่ได้รับประกันว่าฝนจะไม่ตก':
    wet.length===complete.length&&complete.length>=2?
    'แบบจำลองที่มีข้อมูลครบทั้ง '+complete.length+' ชุดคาดว่ามีฝนอย่างน้อยบางชั่วโมงใน 24 ชั่วโมงข้างหน้า ไม่ได้หมายความว่าฝนจะตกตลอดวัน':
    wet.length+' จาก '+complete.length+' แบบจำลองคาดว่ามีฝนอย่างน้อยบางชั่วโมงใน 24 ชั่วโมงข้างหน้า ผลแบบจำลองยังแตกต่างกัน';
   const max=Math.max(...complete.map(r=>Math.max(...r.rows.slice(0,24))));
   return label+' • ปริมาณฝนสูงสุดในหนึ่งชั่วโมงจากชุดที่มีข้อมูล '+max.toFixed(1)+' มม. เป็นค่าพยากรณ์ ไม่ใช่ปริมาณฝนตรวจวัดจริง';
 }
 return {MODELS,WINDOWS,RAIN_24_CRITERIA,rain24Level,rain24Range,location,url,ensembleUrl,parseModel,parseEnsemble,interpretation,publicSummary,rainPattern};
});
