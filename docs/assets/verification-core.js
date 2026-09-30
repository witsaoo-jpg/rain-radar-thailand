/* v1.16 Forecast Verification: local-only comparison of saved 24h forecasts with user-entered observed rainfall.
   This module never treats radar pixels or model output as observed rainfall. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RainVerificationCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DAY=24*60*60*1000,HOUR=60*60*1000,RAIN_THRESHOLD=0.1;
 const MODELS=[
  {id:'ecmwf_ifs025',label:'ECMWF IFS 0.25°'},
  {id:'ncep_gfs_global',label:'NOAA GFS Global'},
  {id:'icon_global',label:'DWD ICON Global'}
 ];
 function amount(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000?Math.round(v*10)/10:null;}
 function rainLevel(v){
  const n=amount(v);if(n===null)return null;
  if(n<0.1)return {key:'trace',label:'ฝนวัดจำนวนไม่ได้'};
  if(n<=10)return {key:'light',label:'ฝนเล็กน้อย'};
  if(n<=35)return {key:'moderate',label:'ฝนปานกลาง'};
  if(n<=90)return {key:'heavy',label:'ฝนหนัก'};
  return {key:'very-heavy',label:'ฝนหนักมาก'};
 }
 function outcome(predicted,observed){
  if(predicted&&observed)return 'hit';
  if(predicted&&!observed)return 'false-alarm';
  if(!predicted&&observed)return 'miss';
  return 'correct-negative';
 }
 function createSnapshot(detail){
  const createdAt=Number(detail?.capturedAt),modelStart=Number(detail?.start);
  if(!Number.isFinite(createdAt)||!Number.isFinite(modelStart)||modelStart<=0)throw new Error('Invalid forecast time');
  const models={};
  for(const meta of MODELS){
   const n=amount(detail?.models?.[meta.id]?.total24);
   if(n!==null)models[meta.id]={label:meta.label,total24:n};
  }
  if(!Object.keys(models).length)throw new Error('No validated 24h forecast');
  const place=String(detail?.place||'พื้นที่ที่เลือก').trim().slice(0,80)||'พื้นที่ที่เลือก';
  const periodStart=modelStart-HOUR,periodEnd=periodStart+DAY;
  return {
   version:1,
   id:String(Math.trunc(createdAt))+'-'+String(Math.trunc(periodStart)),
   createdAt:Math.trunc(createdAt),place,periodStart,periodEnd,models,observation:null
  };
 }
 function evaluate(record,observedMm,source,recordedAt=Date.now()){
  if(!record||!record.models)throw new Error('Invalid record');
  const mm=amount(Number(observedMm));if(mm===null)throw new Error('Invalid observed rainfall');
  if(!Number.isFinite(recordedAt)||recordedAt<record.periodEnd)throw new Error('Forecast window not complete');
  const observedRain=mm>=RAIN_THRESHOLD,observedLevel=rainLevel(mm),evaluations={};
  for(const meta of MODELS){
   const forecast=amount(record.models?.[meta.id]?.total24);if(forecast===null)continue;
   const forecastLevel=rainLevel(forecast);
   evaluations[meta.id]={
    label:meta.label,forecastMm:forecast,absError:Math.round(Math.abs(forecast-mm)*10)/10,
    outcome:outcome(forecast>=RAIN_THRESHOLD,observedRain),
    forecastLevel:forecastLevel.label,observedLevel:observedLevel.label,
    levelMatch:forecastLevel.key===observedLevel.key
   };
  }
  return {...record,observation:{
   mm,source:String(source||'').trim().slice(0,120),recordedAt:Math.trunc(recordedAt),
   level:observedLevel.label,evaluations
  }};
 }
 function summarize(records){
  const stats={};
  for(const meta of MODELS)stats[meta.id]={label:meta.label,evaluated:0,hit:0,miss:0,falseAlarm:0,correctNegative:0,errorSum:0,levelMatches:0};
  for(const r of Array.isArray(records)?records:[]){
   const ev=r?.observation?.evaluations;if(!ev)continue;
   for(const meta of MODELS){
    const x=ev[meta.id];if(!x)continue;
    const s=stats[meta.id];s.evaluated++;s.errorSum+=x.absError;
    if(x.outcome==='hit')s.hit++;
    else if(x.outcome==='miss')s.miss++;
    else if(x.outcome==='false-alarm')s.falseAlarm++;
    else if(x.outcome==='correct-negative')s.correctNegative++;
    if(x.levelMatch)s.levelMatches++;
   }
  }
  for(const s of Object.values(stats)){
   s.mae=s.evaluated?Math.round((s.errorSum/s.evaluated)*10)/10:null;
   s.levelMatchRate=s.evaluated?Math.round((s.levelMatches/s.evaluated)*100):null;
   delete s.errorSum;
  }
  return stats;
 }
 function validRecord(r){
  return !!r&&r.version===1&&typeof r.id==='string'&&Number.isFinite(r.createdAt)&&Number.isFinite(r.periodStart)&&Number.isFinite(r.periodEnd)&&r.periodEnd>r.periodStart&&r.models&&typeof r.models==='object';
 }
 return {DAY,HOUR,RAIN_THRESHOLD,MODELS,amount,rainLevel,outcome,createSnapshot,evaluate,summarize,validRecord};
});