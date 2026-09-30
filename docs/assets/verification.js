/* v1.16 Forecast Verification UI.
   Forecast snapshots and user-entered observations are stored only in this browser's localStorage. */
(() => {
 'use strict';
 const core=window.RainVerificationCore,$=id=>document.getElementById(id);
 if(!core||!$('verification-list'))return;
 const KEY='rainradar:forecast-verification:v1',MAX=20;
 const list=$('verification-list'),summary=$('verification-summary'),status=$('verification-status');
 const fmt=ms=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms)+' น.';
 const outcomeLabel={hit:'Hit · พยากรณ์ฝนและมีฝนจริง',miss:'Miss · ไม่พยากรณ์ฝนแต่มีฝนจริง','false-alarm':'False alarm · พยากรณ์ฝนแต่ไม่พบฝน','correct-negative':'Correct negative · ไม่พยากรณ์ฝนและไม่พบฝน'};
 function load(){
  try{
   const x=JSON.parse(localStorage.getItem(KEY)||'[]');
   return Array.isArray(x)?x.filter(core.validRecord).slice(0,MAX):[];
  }catch(_){return [];}
 }
 function save(records){try{localStorage.setItem(KEY,JSON.stringify(records.slice(0,MAX)));return true;}catch(_){return false;}}
 let records=load();
 function el(tag,text,klass=''){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(klass)x.className=klass;return x;}
 function modelForecasts(r){
  const wrap=el('div',undefined,'verification-models');
  for(const meta of core.MODELS){
   const m=r.models?.[meta.id];if(!m)continue;
   wrap.append(el('span',meta.label+' · '+m.total24.toFixed(1)+' มม.'));
  }
  return wrap;
 }
 function statsView(){
  const stats=core.summarize(records),valid=Object.values(stats).filter(x=>x.evaluated);
  summary.replaceChildren();
  if(!valid.length){summary.append(el('p','ยังไม่มีรายการที่มีฝนตรวจวัดจริงสำหรับเปรียบเทียบ'));return;}
  for(const s of valid){
   const card=el('div',undefined,'verification-stat');
   card.append(el('strong',s.label),el('span','ตรวจแล้ว '+s.evaluated+' ครั้ง · MAE '+s.mae.toFixed(1)+' มม.'),el('span','Hit '+s.hit+' · Miss '+s.miss+' · False alarm '+s.falseAlarm+' · Correct negative '+s.correctNegative),el('span','ระดับฝนตรงกัน '+s.levelMatchRate+'%'));
   summary.append(card);
  }
 }
 function render(){
  statsView();list.replaceChildren();
  if(!records.length){list.append(el('p','ยังไม่มีบันทึก • เมื่อกด “วิเคราะห์ฝนสะสม 5 วัน” ระบบจะบันทึกค่าพยากรณ์ 24 ชั่วโมงไว้ในเบราว์เซอร์เครื่องนี้','verification-empty'));return;}
  const now=Date.now();
  for(const r of records){
   const card=el('article',undefined,'verification-item');
   const head=el('div',undefined,'verification-item-head');
   head.append(el('strong',r.place),el('span','บันทึกพยากรณ์ '+fmt(r.createdAt)));
   card.append(head,el('p','ช่วงที่ตรวจสอบ: '+fmt(r.periodStart)+' → '+fmt(r.periodEnd),'verification-period'),modelForecasts(r));
   if(r.observation){
    const obs=el('div',undefined,'verification-result');
    obs.append(el('strong','ฝนตรวจวัดจริง '+r.observation.mm.toFixed(1)+' มม. · '+r.observation.level));
    if(r.observation.source)obs.append(el('span','แหล่งที่ผู้ใช้ระบุ: '+r.observation.source));
    for(const meta of core.MODELS){
     const x=r.observation.evaluations?.[meta.id];if(!x)continue;
     const row=el('div',undefined,'verification-eval');
     row.append(el('b',meta.label),el('span',outcomeLabel[x.outcome]||x.outcome),el('span','คลาดเคลื่อน '+x.absError.toFixed(1)+' มม. · ระดับฝน '+(x.levelMatch?'ตรง':'ต่าง')));
     obs.append(row);
    }
    card.append(obs);
   }else if(now<r.periodEnd){
    card.append(el('p','รอตรวจหลัง '+fmt(r.periodEnd)+' เพื่อให้ช่วงพยากรณ์ 24 ชั่วโมงครบก่อน','verification-pending'));
   }else{
    const form=el('form',undefined,'verification-form');
    const amount=el('input');amount.type='number';amount.min='0';amount.max='1000';amount.step='0.1';amount.required=true;amount.placeholder='ฝนจริง (มม.)';amount.setAttribute('aria-label','ปริมาณฝนตรวจวัดจริง หน่วยมิลลิเมตร');
    const source=el('input');source.type='text';source.maxLength=120;source.placeholder='แหล่งข้อมูล เช่น TMD AWS';source.setAttribute('aria-label','แหล่งข้อมูลฝนตรวจวัด');
    const confirm=el('label',undefined,'verification-confirm');const box=el('input');box.type='checkbox';box.required=true;confirm.append(box,document.createTextNode(' ยืนยันว่าค่าฝนจริงครอบคลุมช่วงเวลา 24 ชั่วโมงเดียวกับที่แสดงด้านบน'));
    const submit=el('button','บันทึกผลตรวจสอบ');submit.type='submit';
    form.append(amount,source,confirm,submit);
    form.addEventListener('submit',event=>{
     event.preventDefault();if(!box.checked)return;
     try{
      const index=records.findIndex(x=>x.id===r.id);if(index<0)return;
      records[index]=core.evaluate(records[index],Number(amount.value),source.value,Date.now());
      save(records);status.textContent='บันทึกผลตรวจสอบแล้ว';render();
     }catch(_){status.textContent='บันทึกไม่ได้ กรุณาตรวจค่าฝนและช่วงเวลา';}
    });
    card.append(form);
   }
   list.append(card);
  }
 }
 window.addEventListener('rainradar:rain-outlook-snapshot',event=>{
  try{
   const fresh=core.createSnapshot(event.detail);
   records=[fresh,...records.filter(r=>r.id!==fresh.id)].slice(0,MAX);
   if(save(records))status.textContent='บันทึกค่าพยากรณ์ 24 ชั่วโมงไว้สำหรับตรวจสอบย้อนหลังแล้ว';
   else status.textContent='เบราว์เซอร์ไม่อนุญาตให้บันทึกประวัติในเครื่อง';
   render();
  }catch(_){}
 });
 $('verification-clear').addEventListener('click',()=>{
  records=[];save(records);status.textContent='ล้างประวัติการตรวจสอบในเครื่องแล้ว';render();
 });
 render();
})();