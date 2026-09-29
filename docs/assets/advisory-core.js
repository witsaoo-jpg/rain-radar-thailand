/* Public guidance, not an official weather warning or radar-derived nowcast. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainAdvisoryCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function summarize(result,current){
  const p=result?.maxProbability;
  const amount=result?.sumPrecipitation;
  if(p===null||p===undefined||!Number.isFinite(p))return {level:'unknown',title:'ข้อมูลโอกาสฝนยังไม่เพียงพอ',message:'กรุณาดูเรดาร์และประกาศเตือนภัยทางการ'};
  let level='low',title='แบบจำลองให้โอกาสเกิดฝนไม่สูง',message='ยังมีฝนเฉพาะจุดได้ ตรวจสอบข้อมูลก่อนเดินทาง';
  if(p>=70){level='high';title='แบบจำลองให้โอกาสเกิดฝนสูงในบางชั่วโมง';message='ควรเตรียมร่มและตรวจประกาศเตือนภัยก่อนออกเดินทาง';}
  else if(p>=40){level='moderate';title='มีโอกาสเกิดฝนในบางชั่วโมง';message='ควรตรวจข้อมูลฝนอีกครั้งก่อนออกเดินทาง';}
  if(current?.code===95||current?.code===96||current?.code===99)message+=' • แบบจำลองแสดงสภาพอากาศแบบพายุฝนฟ้าคะนอง';
  return {level,title,message,probability:p,amount:Number.isFinite(amount)?amount:null};
 }
 return {summarize};
});
