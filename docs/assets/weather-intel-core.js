/* Model weather summary and independently labelled TMD radar evidence.
 * No PNG georeferencing, pixel classification, or radar-derived GPS rainfall claims.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainWeatherIntel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function level(current,forecast){
   if(!current)return {title:'ยังไม่มีข้อมูลสภาพอากาศปัจจุบัน',rain:'ไม่ทราบข้อมูลฝนจากแบบจำลอง',temperature:'ไม่ทราบอุณหภูมิ',fog:'ไม่ทราบข้อมูลหมอก',cloud:'ไม่ทราบเมฆ',wind:'ไม่ทราบลม',extra:'ยังไม่มีข้อมูลที่ตรวจสอบได้'};
   const code=current.code;
   const rainy=[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code);
   const foggy=[45,48].includes(code);
   const temp=current.temperature;
   let heat='ไม่ทราบอุณหภูมิ';
   if(temp!==null&&Number.isFinite(temp)){
     heat=temp.toFixed(1)+'°C';
     if(temp>=35)heat+=' • อากาศร้อนตามเกณฑ์แสดงผลของแอป';
     else if(temp>=30)heat+=' • ค่อนข้างร้อนตามเกณฑ์แสดงผลของแอป';
   }
   let rain='ไม่ทราบข้อมูลฝนจากแบบจำลอง';
   if(current.precipitation!==null&&Number.isFinite(current.precipitation)){
      rain=current.precipitation.toFixed(1)+' มม. ในช่วงข้อมูลปัจจุบันของแบบจำลอง';
      if(rainy)rain+=' • ลักษณะอากาศเป็นฝน';
   }else if(rainy)rain='แบบจำลองระบุสภาพอากาศมีฝน แต่ไม่มีค่าปริมาณฝนที่ตรวจสอบได้';
   let fog='ไม่ทราบข้อมูลหมอก';
   if(foggy)fog='แบบจำลองระบุหมอก';
   else if(current.visibility!==null&&Number.isFinite(current.visibility)){
      fog='ทัศนวิสัยจากแบบจำลอง '+(current.visibility/1000).toFixed(1)+' กม. • ยังยืนยันหมอกจริงไม่ได้';
   }else if(code!==null)fog='รหัสสภาพอากาศไม่ระบุหมอก • ไม่ใช่การยืนยันว่าไม่มีหมอกจริง';
   const cloud=current.cloudCover!==null&&Number.isFinite(current.cloudCover)?'เมฆปกคลุมตามแบบจำลอง '+Math.round(current.cloudCover)+'%':'ไม่ทราบปริมาณเมฆ';
   const wind=current.wind!==null&&Number.isFinite(current.wind)?'ลมตามแบบจำลอง '+current.wind.toFixed(1)+' กม./ชม.':'ไม่ทราบลม';
   const max=forecast?.maxProbability;
   const extra=max!==null&&Number.isFinite(max)?'โอกาสฝนสูงสุดใน 3 ชั่วโมงที่แสดง '+Math.round(max)+'%':'โอกาสฝน 3 ชั่วโมง: ไม่มีข้อมูล';
   return {title:current.description,rain,temperature:heat,fog,cloud,wind,extra};
 }
 function radarStatus(available,station,generatedAt,now){
   if(!available)return 'ภาพเรดาร์ TMD ของสถานีที่เลือกไม่พร้อมใช้งาน';
   const stamp=typeof generatedAt==='string'?Date.parse(generatedAt):NaN;
   if(!Number.isFinite(stamp)||now-stamp>90*60000||stamp-now>5*60000)return 'ภาพเรดาร์มีเวลาบันทึกเก่าหรือไม่ทราบเวลา — ไม่ใช้ยืนยันสภาพปัจจุบัน';
   return 'มีภาพเรดาร์ TMD สถานี '+String(station||'ที่เลือก')+' • เป็นภาพรวมพื้นที่ ไม่ยืนยันฝน ณ พิกัดที่เลือก';
 }
 return {level,radarStatus};
});
