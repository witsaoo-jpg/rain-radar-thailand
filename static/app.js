'use strict';
const stations = {
  thailand: {title:'เรดาร์ทั่วประเทศ',subtitle:'ภาพรวมประเทศไทย',label:'ทั่วประเทศ',source:'https://weather.tmd.go.th/THA_Z.php'},
  sattahip:{title:'สัตหีบ · ชลบุรี',subtitle:'ชลบุรีและพื้นที่ใกล้เคียง',label:'สัตหีบ',source:'https://weather.tmd.go.th/sattahip.php'},
  rayong:{title:'เรดาร์ระยอง',subtitle:'ชายฝั่งภาคตะวันออก',label:'ระยอง',source:'https://weather.tmd.go.th/ryg.php'},
  suvarnabhumi:{title:'เรดาร์สุวรรณภูมิ',subtitle:'กรุงเทพฯ และปริมณฑล',label:'สุวรรณภูมิ',source:'https://weather.tmd.go.th/svp120.php'},
  'thailand-loop':{title:'ภาพเคลื่อนไหวทั่วประเทศ',subtitle:'ภาพเคลื่อนไหวเรดาร์จาก TMD',label:'ทั่วประเทศ (Loop)',source:'https://weather.tmd.go.th/THA_loop.php'}
};
const $ = id => document.getElementById(id);
let selected = 'thailand', zoom = 100, requestNo = 0, refreshTimer;
const dt = value => { if(!value) return '—'; const d=new Date(value); return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)+' น.'; };
function updateClock(){ $('clock').textContent = 'เวลาไทย • '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' น.'; }
function status(kind,label,description){
  const pill=$('status-pill');pill.className='status-pill '+(kind==='available'?'':kind==='waiting'?'waiting':'error');pill.querySelector('span').textContent=kind==='available'?'พบข้อมูล':kind==='waiting'?'กำลังเชื่อมต่อ':'ไม่พร้อมใช้งาน';
  $('status-heading').textContent=label;$('status-description').textContent=description;
  $('status-orb').className='status-orb '+(kind==='available'?'live':kind==='unavailable'?'unavailable':'');
}
function showEmpty(title,desc){$('image-layer').hidden=true;$('radar-image').removeAttribute('src');$('radar-empty').hidden=false;$('empty-title').textContent=title;$('empty-desc').textContent=desc;}
function setZoom(value){zoom=Math.max(70,Math.min(250,value));$('zoom-percent').textContent=zoom+'%';$('radar-image').style.width=zoom+'%';}
async function loadRadar(force=false){
  const thisRequest=++requestNo, key=selected, station=stations[key];
  $('refresh-button').classList.add('spinning');$('refresh-button').disabled=true;
  status('waiting','กำลังตรวจสอบแหล่งข้อมูล','กำลังเชื่อมต่อเว็บต้นทางเพื่อค้นหาภาพเรดาร์');
  showEmpty('กำลังเรียกข้อมูลเรดาร์…','กำลังตรวจสอบภาพล่าสุดจากเว็บต้นทาง');
  $('fetched-time').textContent='กำลังโหลด…';
  try{
    const response=await fetch('/api/radar/'+encodeURIComponent(key)+(force?'?refresh=true':''),{cache:'no-store'});
    if(!response.ok) throw Error('HTTP '+response.status);
    const data=await response.json(); if(thisRequest!==requestNo) return;
    $('fetched-time').textContent=dt(data.fetched_at);
    if(!data.image_available){
      status('unavailable','ยังโหลดภาพไม่ได้','ระบบไม่พบภาพที่ใช้งานได้จากเว็บต้นทาง อาจมีการเปลี่ยนหน้าเว็บหรือไม่สามารถเข้าถึงได้');
      showEmpty('ไม่สามารถแสดงภาพในแอปได้','กรุณาเปิดภาพบนเว็บไซต์กรมอุตุนิยมวิทยาโดยตรง');return;
    }
    const image=$('radar-image');
    image.onload=()=>{if(thisRequest!==requestNo)return; $('image-layer').hidden=false;$('radar-empty').hidden=true;status('available','เชื่อมต่อข้อมูลเรดาร์แล้ว','ดึงภาพได้สำเร็จ โปรดดูเวลาตรวจวัด UTC ในภาพ (เวลาไทย = UTC + 7 ชั่วโมง)');};
    image.onerror=()=>{if(thisRequest!==requestNo)return;status('unavailable','ไฟล์ภาพใช้งานไม่ได้','พบหน้าต้นทาง แต่ไม่สามารถเปิดไฟล์ภาพได้');showEmpty('โหลดไฟล์ภาพไม่สำเร็จ','เปิดภาพโดยตรงจากเว็บไซต์กรมอุตุนิยมวิทยาได้ที่ปุ่มด้านล่าง');};
    image.src=data.image_url+'?v='+Math.floor(Date.now()/300000);setZoom(100);
  }catch(err){if(thisRequest!==requestNo)return;status('unavailable','เชื่อมต่อระบบไม่ได้','ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือดูภาพโดยตรงที่เว็บต้นทาง');showEmpty('ไม่สามารถเชื่อมต่อ Backend','โปรดตรวจสอบว่า FastAPI กำลังทำงานอยู่ แล้วลองรีเฟรชใหม่');$('fetched-time').textContent='—';}
  finally{if(thisRequest===requestNo){$('refresh-button').classList.remove('spinning');$('refresh-button').disabled=false;}}
}
function selectStation(key){if(!stations[key])return;selected=key;const data=stations[key];document.querySelectorAll('[data-station]').forEach(b=>{b.classList.toggle('selected',b.dataset.station===key);b.setAttribute('aria-current',b.dataset.station===key?'true':'false');});$('radar-title').textContent=data.title;$('radar-subtitle').textContent=data.subtitle;$('station-display').textContent=data.label;$('official-link').href=data.source;$('fallback-link').href=data.source;$('canvas-chip').textContent='● SOURCE: TMD / '+data.label.toUpperCase();setZoom(100);loadRadar();}
document.querySelectorAll('[data-station]').forEach(b=>b.addEventListener('click',()=>selectStation(b.dataset.station)));
$('refresh-button').addEventListener('click',()=>loadRadar(true));
$('zoom-in').addEventListener('click',()=>setZoom(zoom+25));$('zoom-out').addEventListener('click',()=>setZoom(zoom-25));$('zoom-reset').addEventListener('click',()=>setZoom(100));
$('fullscreen-button').addEventListener('click',()=>{if($('image-layer').hidden){window.open(stations[selected].source,'_blank','noopener,noreferrer');return;}$('lightbox-title').textContent=stations[selected].title;$('lightbox-image').src=$('radar-image').src;$('lightbox').hidden=false;document.body.classList.add('modal-open');});
function closeLightbox(){$('lightbox').hidden=true;document.body.classList.remove('modal-open');}
$('close-lightbox').addEventListener('click',closeLightbox);$('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox'))closeLightbox();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox();});
updateClock();setInterval(updateClock,30000);selectStation('thailand');
refreshTimer=setInterval(()=>{if(!document.hidden)loadRadar(true);},300000);
