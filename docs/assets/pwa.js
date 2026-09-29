'use strict';
(() => {
 const b=document.getElementById('install-app'),hint=document.getElementById('install-hint');
 let deferred=null;
 if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(()=>{hint.textContent='ไม่สามารถเปิดใช้งานโหมดติดตั้งได้';});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;b.hidden=false;});
 b.addEventListener('click',async()=>{if(!deferred)return;const pending=deferred;deferred=null;b.hidden=true;await pending.prompt();hint.textContent='สามารถเปิดแอปจากหน้าจอหลักได้หลังติดตั้ง';});
 window.addEventListener('appinstalled',()=>{b.hidden=true;hint.textContent='ติดตั้งเรียบร้อย';});
})();