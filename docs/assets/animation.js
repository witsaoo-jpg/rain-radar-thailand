'use strict';
/* Replay verified captures; capture time is not scan time. Do not infer direction or speed. */
(() => {
 const el=id=>document.getElementById(id);
 const play=el('history-play'),slider=el('history-slider'),label=el('history-frame-label'),note=el('history-direction');
 let frames=[],index=0,timer=null,entry=null;
 const validPath=path=>typeof path==='string' && /^\.\/data\/images\/history\/(thailand|sattahip|rayong|suvarnabhumi)\/[a-f0-9]{20}\.(png|jpg|gif|webp)$/.test(path);
 function stop(){if(timer!==null)clearInterval(timer);timer=null;play.textContent='▶ เล่นภาพย้อนหลัง';play.setAttribute('aria-pressed','false');}
 function show(i){
  if(!frames.length)return;
  index=i;slider.value=String(i);
  const f=frames[i];
  label.textContent='บันทึกภาพ '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short',hour12:false}).format(new Date(f.captured_at))+' น. • เวลาตรวจวัดจริงไม่ยืนยัน';
  showSnapshot(f.path,entry);
 }
 window.radarHistoryUpdate=(current,station)=>{
  stop();entry=current;index=0;
  frames=(Array.isArray(current?.history)?current.history:[]).filter(f=>validPath(f.path)&&typeof f.captured_at==='string'&&!Number.isNaN(Date.parse(f.captured_at))).slice(-6);
  if(station==='thailand-loop')frames=[];
  slider.max=String(Math.max(0,frames.length-1));slider.value=String(Math.max(0,frames.length-1));
  play.disabled=frames.length<2;slider.disabled=frames.length<2;
  note.textContent=frames.length<2?'ยังไม่มีภาพที่ต่างเวลากันเพียงพอสำหรับเปรียบเทียบทิศทาง':'เปรียบเทียบภาพต่อเนื่องด้วยสายตาเท่านั้น • ยังไม่คำนวณทิศทาง/ความเร็ว เนื่องจากไม่มีข้อมูลพิกัดอ้างอิงภาพที่ยืนยันได้';
  label.textContent=frames.length?frames.length+' ภาพที่ตรวจสอบแล้ว (เวลาบันทึก Snapshot)':'ยังไม่มีภาพย้อนหลังที่ยืนยันได้';
  if(frames.length)index=frames.length-1;
 };
 play.addEventListener('click',()=>{
  if(frames.length<2)return;
  if(timer!==null){stop();return;}
  play.textContent='Ⅱ หยุดชั่วคราว';play.setAttribute('aria-pressed','true');
  show(0);timer=setInterval(()=>show((index+1)%frames.length),900);
 });
 slider.addEventListener('input',()=>{stop();show(Number(slider.value));});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
