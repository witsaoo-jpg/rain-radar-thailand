'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../docs/assets/forecast-core.js');
const H=3600000;
const now=Date.UTC(2026,8,29,8,12);
const times=Array.from({length:9},(_,i)=>Math.floor((Math.floor(now/H)+i)*H/1000));
function fixture(){return {timezone:'Asia/Bangkok',latitude:13.375,longitude:101,hourly_units:{precipitation_probability:'%',precipitation:'mm'},hourly:{time:times,precipitation_probability:[5,10,30,65,80,20,0,15,25],precipitation:[0,0,1.2,2.4,3.5,.1,0,0,0]}};}
test('rounded coordinates, HTTPS, expected timezone and fields',()=>{
 const u=new URL(core.buildUrl(13.36572,100.98765));
 assert.equal(u.origin,'https://api.open-meteo.com');
 assert.equal(u.searchParams.get('latitude'),'13.37');
 assert.equal(u.searchParams.get('longitude'),'100.99');
 assert.equal(u.searchParams.get('timezone'),'Asia/Bangkok');
 assert.equal(u.searchParams.get('timeformat'),'unixtime');
 assert.throws(()=>core.buildUrl(200,0));
});
test('hourly values refer to preceding interval and omit current incomplete hour',()=>{
 const x=core.parseForecast(fixture(),now);
 assert.equal(x.rows.length,6);assert.equal(x.rows[0].timestamp,Math.ceil(now/H)*H);
 assert.equal(x.maxProbability,65);
 assert.ok(Math.abs(x.sumPrecipitation-3.6)<1e-9);
 assert.equal(x.grid.latitude,13.375);
});
test('null probability and rain remain unknown rather than becoming 0',()=>{
 const f=fixture();f.hourly.precipitation_probability[1]=null;f.hourly.precipitation[2]=null;
 const x=core.parseForecast(f,now);
 assert.equal(x.rows[0].probability,null);
 assert.equal(x.sumPrecipitation,null);
});
test('reject malformed timezone units arrays and unsorted times',()=>{
 const f=fixture();f.timezone='UTC';assert.throws(()=>core.parseForecast(f,now));f.timezone='Asia/Bangkok';
 f.hourly_units.precipitation='inches';assert.throws(()=>core.parseForecast(f,now));f.hourly_units.precipitation='mm';
 f.hourly.time=[1,2];assert.throws(()=>core.parseForecast(f,now));
});
test('missing hourly values and out-of-range probabilities are null',()=>{
 const f=fixture();f.hourly.precipitation_probability[1]=120;f.hourly.precipitation[1]=-1;
 const x=core.parseForecast(f,now);assert.equal(x.rows[0].probability,null);assert.equal(x.rows[0].precipitation,null);
 assert.equal(core.advisory(null).includes('ไม่มีข้อมูล'),true);
});

test('model current conditions require correct units and a recent timestamp',()=>{
 const base={current_units:{temperature_2m:'°C',apparent_temperature:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h'},
 current:{time:Math.floor(now/1000),temperature_2m:30.4,apparent_temperature:35,relative_humidity_2m:70,wind_speed_10m:9,weather_code:61}};
 const got=core.parseCurrent(base,now);
 assert.equal(got.temperature,30.4);
 assert.equal(got.description,'มีฝน');
 assert.equal(got.humidity,70);
 base.current.time=Math.floor((now-3*H)/1000);
 assert.equal(core.parseCurrent(base,now),null);
 base.current.time=Math.floor(now/1000);base.current_units.temperature_2m='°F';
 assert.equal(core.parseCurrent(base,now),null);
});
test('unknown current fields do not masquerade as measured zero and model wording is explicit',()=>{
 const data={current_units:{temperature_2m:'°C',apparent_temperature:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h'},current:{time:Math.floor(now/1000),temperature_2m:null,apparent_temperature:null,relative_humidity_2m:null,wind_speed_10m:null,weather_code:null}};
 assert.equal(core.parseCurrent(data,now),null);
 assert.equal(core.weatherDescription(95),'มีพายุฝนฟ้าคะนองตามแบบจำลอง');
 assert.match(core.buildUrl(13.3,100.9),/current=/);
});
