/* Public forecast overview: six fixed representative cities, never the visitor's GPS. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const title=$('public-weather-headline'),description=$('public-weather-description');
  const detail=$('public-weather-meta'),grid=$('public-weather-cities');
  const refresh=$('public-weather-refresh');
  if(!title||!description||!detail||!grid||!refresh)return;
  const iconFor=code=>{
    if([45,48].includes(code))return '🌫️';
    if([95,96,99].includes(code))return '⛈️';
    if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return '🌧️';
    if(code===0||code===1)return '☀️';
    if(code===2||code===3)return '⛅';
    return '☁️';
  };
  const labelFor=code=>{
    if([45,48].includes(code))return 'มีหมอก';
    if([95,96,99].includes(code))return 'มีพายุฝนฟ้าคะนองตามแบบจำลอง';
    if([51,53,55,56,57].includes(code))return 'ฝนละออง';
    if([61,63,65,66,67,80,81,82].includes(code))return 'มีฝนตามแบบจำลอง';
    if(code===0)return 'ท้องฟ้าแจ่มใส';
    if(code===1)return 'ท้องฟ้าโปร่งเป็นส่วนใหญ่';
    if(code===2)return 'มีเมฆบางส่วน';
    if(code===3)return 'เมฆมาก';
    return 'ไม่มีข้อมูลสภาพท้องฟ้า';
  };
  const format=iso=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))+' น.';
  let sequence=0;
  async function load(){
    const current=++sequence;
    refresh.disabled=true;refresh.textContent='กำลังตรวจสอบ…';
    title.textContent='กำลังตรวจสอบสภาพอากาศ';
    description.textContent='อ่านข้อมูลพยากรณ์จาก 6 เมืองตัวแทน โดยไม่ใช้ GPS ของคุณ';
    detail.textContent='ข้อมูลแบบจำลอง Open-Meteo • ไม่ใช่การตรวจวัดทั้งประเทศ';
    grid.replaceChildren();
    try{
      const response=await fetch('./data/public-overview.json?v='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('Overview unavailable');
      const data=await response.json();
      if(current!==sequence)return;
      const captured=Date.parse(data.generated_at);
      if(data.status!=='available'||!Array.isArray(data.cities)||data.cities.length<3||
         !Number.isFinite(captured)||Date.now()-captured>120*60000||captured-Date.now()>5*60000)throw new Error('Unverified or stale overview');
      const valid=data.cities.filter(city=>city&&typeof city.city==='string'&&typeof city.region==='string'&&
        (city.temperature_c===null||(typeof city.temperature_c==='number'&&Number.isFinite(city.temperature_c)))&&
        (city.rain_probability_3h_max===null||(typeof city.rain_probability_3h_max==='number'&&Number.isFinite(city.rain_probability_3h_max)&&city.rain_probability_3h_max>=0&&city.rain_probability_3h_max<=100))&&
        (city.weather_code===null||(Number.isInteger(city.weather_code)&&city.weather_code>=0&&city.weather_code<=99)));
      if(valid.length<3)throw new Error('Insufficient valid places');
      const rainy=valid.filter(c=>c.rain_probability_3h_max!==null&&c.rain_probability_3h_max>=50).length;
      title.textContent=rainy>0?'วันนี้มีบางพื้นที่เสี่ยงฝน':'ภาพรวมพยากรณ์อากาศล่าสุด';
      description.textContent=rainy>0
        ?'พบ '+rainy+' จาก '+valid.length+' เมืองตัวแทนที่มีโอกาสเกิดฝนตั้งแต่ 50% ในช่วง 3 ชั่วโมงถัดไป'
        :'แสดงสภาพอากาศจาก '+valid.length+' เมืองตัวแทน โปรดเลือกพื้นที่เพื่อดูรายละเอียดเฉพาะจุด';
      detail.textContent='ข้อมูล Open-Meteo • สร้างข้อมูลเมื่อ '+format(data.generated_at)+' • เป็นเมืองตัวแทน ไม่ใช่พยากรณ์ครอบคลุมทุกพื้นที่ของประเทศ';
      for(const city of valid){
        const card=document.createElement('div');card.className='public-city';
        const place=document.createElement('strong');place.textContent=city.city;
        const region=document.createElement('small');region.textContent=city.region;
        const condition=document.createElement('span');condition.className='public-city-condition';condition.textContent=iconFor(city.weather_code)+' '+labelFor(city.weather_code);
        const values=document.createElement('span');values.className='public-city-values';
        const temp=city.temperature_c===null?'ไม่ทราบอุณหภูมิ':city.temperature_c.toFixed(0)+'°C';
        const probability=city.rain_probability_3h_max===null?'โอกาสฝน: ไม่มีข้อมูล':'โอกาสฝนสูงสุด 3 ชม. '+Math.round(city.rain_probability_3h_max)+'%';
        values.textContent=temp+' • '+probability;
        card.append(place,region,condition,values);grid.append(card);
      }
    }catch(error){
      if(current!==sequence)return;
      title.textContent='ยังไม่สามารถแสดงพยากรณ์ภาพรวมได้';
      description.textContent='ข้อมูลต้นทางไม่พร้อมหรือเก่าเกินกำหนด กรุณาลองใหม่ หรือดูประกาศทางการ';
      detail.textContent='จะไม่แสดงข้อมูลจำลองหรือข้อมูลเก่าเป็นสภาพอากาศปัจจุบัน';
    }finally{
      if(current===sequence){refresh.disabled=false;refresh.textContent='↻ อัปเดตภาพรวม';}
    }
  }
  refresh.addEventListener('click',load);
  window.addEventListener('rainradar:refresh-public-overview',load);
  load();
})();
