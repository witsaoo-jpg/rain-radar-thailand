'use strict';
(() => {
  const button=document.getElementById('install-app');
  const dialog=document.getElementById('install-guide');
  const close=document.getElementById('install-guide-close');
  const body=document.getElementById('install-guide-body');
  const hint=document.getElementById('install-hint');
  if(!button||!dialog||!close||!body||!hint)return;

  let deferredPrompt=null;
  let dismissedPrompt=false;

  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches===true || navigator.standalone===true;
  const ua=String(navigator.userAgent||'');
  const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);

  function clearBody(){body.replaceChildren();}
  function paragraph(text,klass=''){
    const p=document.createElement('p');p.textContent=text;if(klass)p.className=klass;return p;
  }
  function step(number,title,detail){
    const row=document.createElement('div');row.className='install-step';
    const n=document.createElement('span');n.className='install-step-number';n.textContent=String(number);
    const copy=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=title;
    const small=document.createElement('span');small.textContent=detail;
    copy.append(strong,small);row.append(n,copy);return row;
  }
  function openGuide(type){
    clearBody();
    if(type==='ios'){
      body.append(
        paragraph('บน iPhone / iPad ให้เพิ่มเว็บไซต์ไปยังหน้าจอโฮมจากเมนู Share ของ Safari','install-guide-lead'),
        step(1,'เปิดหน้านี้ด้วย Safari','หากกำลังใช้เบราว์เซอร์อื่น ให้เปิดลิงก์นี้ใน Safari ก่อน'),
        step(2,'แตะปุ่ม Share ⬆','ปุ่มแชร์อยู่ในแถบเครื่องมือของ Safari'),
        step(3,'เลือก “เพิ่มไปยังหน้าจอโฮม”','Add to Home Screen'),
        step(4,'แตะ “เพิ่ม”','Rain Radar จะปรากฏเป็นไอคอนบนหน้าจอโฮม')
      );
    }else{
      body.append(
        paragraph('เบราว์เซอร์นี้ยังไม่เปิดหน้าต่างติดตั้งอัตโนมัติ','install-guide-lead'),
        step(1,'เปิดเมนูของเบราว์เซอร์','บน Chrome มักเป็นเมนู ⋮'),
        step(2,'เลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”','ชื่อเมนูอาจต่างกันตามเบราว์เซอร์และรุ่นของอุปกรณ์'),
        step(3,'ยืนยันการติดตั้ง','จากนั้นเปิด Rain Radar ได้จากหน้าจอโฮม')
      );
    }
    hint.textContent='ติดตั้งฟรี • ไม่ต้องสมัครสมาชิก • ข้อมูลอากาศล่าสุดยังต้องใช้อินเทอร์เน็ต';
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }
  function closeGuide(){
    if(typeof dialog.close==='function'&&dialog.open)dialog.close();
    else dialog.removeAttribute('open');
  }
  function refreshButton(){
    if(standalone()){button.hidden=true;return;}
    if(ios){
      button.hidden=false;button.textContent='＋ เพิ่มไปหน้าจอโฮม';button.dataset.mode='ios';return;
    }
    if(deferredPrompt){
      button.hidden=false;button.textContent='＋ ติดตั้งแอป';button.dataset.mode='prompt';return;
    }
    if(android&&dismissedPrompt){
      button.hidden=false;button.textContent='＋ วิธีติดตั้ง';button.dataset.mode='guide';return;
    }
    button.hidden=true;delete button.dataset.mode;
  }

  if('serviceWorker' in navigator&&window.isSecureContext){
    navigator.serviceWorker.register('./sw.js').catch(()=>{hint.textContent='เบราว์เซอร์นี้ไม่สามารถเปิดใช้โหมดติดตั้งได้ในขณะนี้';});
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    dismissedPrompt=false;
    refreshButton();
  });

  button.addEventListener('click',async()=>{
    if(standalone()){refreshButton();return;}
    if(button.dataset.mode==='ios'){openGuide('ios');return;}
    if(button.dataset.mode==='prompt'&&deferredPrompt){
      const pending=deferredPrompt;
      deferredPrompt=null;
      button.disabled=true;button.textContent='กำลังเปิดหน้าติดตั้ง…';
      try{
        await pending.prompt();
        const choice=await pending.userChoice;
        if(choice?.outcome==='accepted'){
          hint.textContent='ยืนยันการติดตั้งแล้ว • หลังติดตั้งสามารถเปิดจากหน้าจอโฮมได้';
          button.hidden=true;
        }else{
          dismissedPrompt=true;
          hint.textContent='ยังไม่ได้ติดตั้ง • คุณสามารถลองใหม่จากเมนูของเบราว์เซอร์';
        }
      }catch(_){
        dismissedPrompt=true;
        hint.textContent='ไม่สามารถเปิดหน้าติดตั้งอัตโนมัติได้ • ใช้เมนูของเบราว์เซอร์แทน';
      }finally{
        button.disabled=false;refreshButton();
      }
      return;
    }
    openGuide('generic');
  });

  close.addEventListener('click',closeGuide);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeGuide();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeGuide();});
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;dismissedPrompt=false;button.hidden=true;
    hint.textContent='ติดตั้ง Rain Radar Thailand เรียบร้อยแล้ว';
    closeGuide();
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change',refreshButton);
  refreshButton();
})();