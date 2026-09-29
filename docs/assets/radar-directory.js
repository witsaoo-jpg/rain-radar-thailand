/* TMD public radar directory. A directory listing is NOT a claim of a working live feed.
 * Only five validated snapshot sources are displayed inside our viewer.
 * Other station names link to the verified official TMD directory when a station URL
 * has not been independently verified. Separate Bangkok and Rainmaking operators.
 */
(() => {
 'use strict';
 const HUB='https://weather.tmd.go.th/THA_Z.php';
 const items=[
  ['thailand','ภาพรวมทั่วประเทศ','ภาพคอมโพสิต','main','snapshot','https://weather.tmd.go.th/THA_Z.php'],
  ['thailand-loop','ภาพเคลื่อนไหวทั่วประเทศ','ภาพย้อนหลังเมื่อมีข้อมูล','main','snapshot','https://weather.tmd.go.th/THA_loop.php'],
  ['mhs','แม่ฮ่องสอน','ภาคเหนือ','north','official','https://weather.tmd.go.th/mhs240_HQ_edit2.php'],
  ['cri','เชียงราย','ภาคเหนือ','north','official',HUB],
  ['lpn','ลำพูน','ภาคเหนือ','north','official',HUB],
  ['tak','ดอยมูเซอ · ตาก','ภาคเหนือ','north','official','https://weather.tmd.go.th/tak.php'],
  ['plk','พิษณุโลก','ภาคเหนือ','north','official',HUB],
  ['pnb','เพชรบูรณ์','ภาคเหนือ','north','official',HUB],
  ['kkn','ขอนแก่น','ภาคตะวันออกเฉียงเหนือ','northeast','official',HUB],
  ['skn','สกลนคร','ภาคตะวันออกเฉียงเหนือ','northeast','official',HUB],
  ['ubn','อุบลราชธานี','ภาคตะวันออกเฉียงเหนือ','northeast','official',HUB],
  ['srn','สุรินทร์','ภาคตะวันออกเฉียงเหนือ','northeast','official',HUB],
  ['chn','ชัยนาท','ภาคกลาง','central','official','https://weather.tmd.go.th/chn.php'],
  ['skm','สมุทรสงคราม','ภาคกลาง','central','official',HUB],
  ['suvarnabhumi','สุวรรณภูมิ','กรุงเทพฯ และปริมณฑล','central','snapshot','https://weather.tmd.go.th/svp120.php'],
  ['kkw','เขาเขียว · นครนายก','ภาคตะวันออก','east','official','https://weather.tmd.go.th/kkw240_edit2.php'],
  ['rayong','ระยอง','ภาคตะวันออก','east','snapshot','https://weather.tmd.go.th/ryg.php'],
  ['chp','ชุมพร','ภาคใต้','south','official',HUB],
  ['rng','ระนอง','ภาคใต้','south','official',HUB],
  ['srt','สุราษฎร์ธานี','ภาคใต้','south','official',HUB],
  ['pkt','ภูเก็ต','ภาคใต้','south','official',HUB],
  ['trg','ตรัง','ภาคใต้','south','official','https://weather.tmd.go.th/trg.php'],
  ['hy','หาดใหญ่','ภาคใต้','south','official',HUB],
  ['stp','สทิงพระ','ภาคใต้','south','official',HUB],
  ['nrt','นราธิวาส','ภาคใต้','south','official',HUB],
  ['bkk-nongchok','หนองจอก · กทม.','เรดาร์กรุงเทพมหานคร','bangkok','official',HUB],
  ['bkk-nongkhaem','หนองแขม · กทม.','เรดาร์กรุงเทพมหานคร','bangkok','official',HUB],
  ['sattahip','สัตหีบ · ชลบุรี','เรดาร์ฝนหลวง','rainmaking','snapshot','https://weather.tmd.go.th/sattahip.php'],
  ['rm-omkoi','อมก๋อย','เรดาร์ฝนหลวง','rainmaking','official',HUB],
  ['rm-takhli','ตาคลี','เรดาร์ฝนหลวง','rainmaking','official',HUB],
  ['rm-phimai','พิมาย','เรดาร์ฝนหลวง','rainmaking','official',HUB]
 ].map(([id,name,subtitle,group,kind,url])=>Object.freeze({id,name,subtitle,group,kind,url,direct:url!==HUB||id==='thailand'}));
 const groups=[
  ['main','ภาพรวมประเทศ'],
  ['north','ภาคเหนือ'],
  ['northeast','ภาคตะวันออกเฉียงเหนือ'],
  ['central','ภาคกลาง'],
  ['east','ภาคตะวันออก'],
  ['south','ภาคใต้'],
  ['bangkok','เรดาร์กรุงเทพมหานคร (คนละหน่วยงาน)'],
  ['rainmaking','เรดาร์ฝนหลวง (คนละหน่วยงาน)']
 ];
 function render(nav,search,report){
  if(!nav||!search||!report)return;
  nav.replaceChildren();
  const nodes=[];
  const record=item=>{
   const native=item.kind==='snapshot';
   const el=document.createElement(native?'button':'a');
   el.className='station-link radar-directory-item';
   if(native){el.type='button';el.dataset.station=item.id;el.dataset.radarKind='snapshot';}
   else{
    el.href=item.url;el.target='_blank';el.rel='noopener noreferrer';
    el.dataset.radarKind='external';
    el.setAttribute('aria-label',item.name+(item.direct?' เปิดเรดาร์ที่เว็บไซต์ต้นทาง':' เปิดสารบัญเรดาร์ TMD แล้วเลือกสถานี')+' แท็บใหม่');
   }
   const icon=document.createElement('span');icon.className='station-icon';icon.textContent=native?'◎':'↗';
   const name=document.createElement('span');name.textContent=item.name;
   const tip=document.createElement('small');tip.textContent=native?'ตรวจ Snapshot ในแอป':item.direct?'เปิดเว็บต้นทาง ↗':'เปิดสารบัญ TMD แล้วเลือกสถานี ↗';
   name.append(tip);
   const indicator=document.createElement('span');indicator.className='nav-indicator';
   el.append(icon,name,indicator);nodes.push({el,item});return el;
  };
  for(const [key,label] of groups){
   const entries=items.filter(x=>x.group===key);
   const section=document.createElement('details');
   section.className='radar-directory-region';section.open=key==='main'||key==='east';
   const heading=document.createElement('summary');heading.textContent=label+' ('+entries.length+')';
   const body=document.createElement('div');body.className='radar-directory-region-items';
   for(const item of entries)body.append(record(item));
   section.append(heading,body);nav.append(section);
  }
  function filter(){
   const needle=search.value.trim().toLocaleLowerCase('th');
   let shown=0;
   for(const {el,item} of nodes){
    const visible=(!needle||[item.name,item.subtitle,item.id].join(' ').toLocaleLowerCase('th').includes(needle));
    el.hidden=!visible;if(visible)shown++;
   }
   for(const section of nav.querySelectorAll('.radar-directory-region')){
    const any=Array.from(section.querySelectorAll('.radar-directory-item')).some(el=>!el.hidden);
    section.hidden=!any;if(needle&&any)section.open=true;
   }
   report.textContent=shown?'พบ '+shown+' รายการ • สถานีที่ไม่มี Snapshot เปิดเว็บไซต์ต้นทาง':'ไม่พบชื่อสถานีที่ค้นหา';
  }
  search.addEventListener('input',filter);filter();
 }
 window.RadarDirectory={items,groups,render};
 render(document.getElementById('station-nav'),document.getElementById('radar-station-search'),document.getElementById('radar-search-status'));
})();
