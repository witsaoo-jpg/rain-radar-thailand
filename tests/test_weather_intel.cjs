'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const intel=require('../docs/assets/weather-intel-core.js'),forecast=require('../docs/assets/forecast-core.js');
const at=Date.UTC(2026,8,29,9,0);
test('rain/heat/fog/cloud and wind stay model-labeled and use values',()=>{
 const w=intel.level({temperature:36,precipitation:2.2,cloudCover:88,visibility:800,wind:22,code:61,description:'มีฝน'}, {maxProbability:72});
 assert.match(w.rain,/2\.2 มม/);assert.match(w.temperature,/36\.0°C/);
 assert.match(w.temperature,/ร้อน/);assert.match(w.cloud,/88%/);assert.match(w.wind,/22\.0/);
 assert.match(w.fog,/ทัศนวิสัย/);assert.match(w.extra,/72%/);
});
test('fog is explicitly model-based, not deduced from radar',()=>{
 const w=intel.level({temperature:25,precipitation:0,cloudCover:90,visibility:400,wind:2,code:45,description:'มีหมอก'},{maxProbability:0});
 assert.equal(w.fog,'แบบจำลองระบุหมอก');assert.match(w.title,/หมอก/);
});
test('missing data does not turn into clear sky, zero rain or zero heat',()=>{
 const w=intel.level(null,{maxProbability:60});assert.match(w.title,/ยังไม่มี/);
 const partial=intel.level({temperature:null,precipitation:null,cloudCover:null,visibility:null,wind:null,code:null,description:'ไม่ทราบ'},{maxProbability:null});
 assert.match(partial.rain,/ไม่ทราบ/);assert.match(partial.temperature,/ไม่ทราบ/);assert.match(partial.extra,/ไม่มีข้อมูล/);
});
test('radar evidence states station availability without making location-specific claims',()=>{
 const valid='2026-09-29T08:40:00Z';
 assert.match(intel.radarStatus(true,'สัตหีบ',valid,at),/ไม่ยืนยันฝน ณ พิกัด/);
 assert.match(intel.radarStatus(false,'สัตหีบ',valid,at),/ไม่พร้อม/);
 assert.match(intel.radarStatus(true,'สัตหีบ','2026-09-29T04:00:00Z',at),/เก่า/);
});
test('forecast query requests additional fields and parser validates units',()=>{
 const url=new URL(forecast.buildUrl(13.36,100.99));
 for(const field of ['precipitation','cloud_cover','visibility'])assert.ok(url.searchParams.get('current').split(',').includes(field));
 const base={current_units:{temperature_2m:'°C',apparent_temperature:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h',precipitation:'mm',cloud_cover:'%',visibility:'m'},current:{time:Math.floor(at/1000),temperature_2m:32,apparent_temperature:36,relative_humidity_2m:75,wind_speed_10m:12,weather_code:61,precipitation:1.3,cloud_cover:70,visibility:8000}};
 const parsed=forecast.parseCurrent(base,at);assert.equal(parsed.precipitation,1.3);assert.equal(parsed.cloudCover,70);assert.equal(parsed.visibility,8000);
 base.current_units.visibility='miles';assert.equal(forecast.parseCurrent(base,at).visibility,null);
});
