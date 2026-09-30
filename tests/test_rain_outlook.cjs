'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../docs/assets/rain-outlook-core.js');
const now=Date.UTC(2026,8,29,8,12);
const start=Math.ceil(now/3600000)*3600;
function fixture(value=2){
 const times=Array.from({length:168},(_,i)=>start+i*3600);
 return {timezone:'Asia/Bangkok',latitude:13.37,longitude:100.99,hourly_units:{precipitation:'mm'},hourly:{time:times,precipitation:times.map(()=>value)}};
}
test('only approved model identifiers and rounded approximate coordinates',()=>{
 const u=new URL(core.url('ecmwf_ifs025',13.367,100.984));
 assert.equal(u.hostname,'api.open-meteo.com');
 assert.equal(u.searchParams.get('latitude'),'13.37');
 assert.equal(u.searchParams.get('longitude'),'100.98');
 assert.equal(u.searchParams.get('hourly'),'precipitation');
 assert.equal(u.searchParams.get('forecast_days'),'7');
 assert.throws(()=>core.url('made_up_model',13,100));
 assert.throws(()=>core.url('ecmwf_ifs025',NaN,100));
 assert.match(core.ensembleUrl(13.3,100.9),/ensemble-api\.open-meteo\.com/);
});
test('24h, 72h, 120h precipitation totals use exactly full next 120 hours',()=>{
 const result=core.parseModel(fixture(2),now);
 assert.deepEqual(result.totals,{'24':48,'72':144,'120':240});
 assert.equal(result.rows.length,120);
 assert.equal(result.start,start*1000);
});
test('null or invalid data cannot silently turn into zero or a disaster warning',()=>{
 const f=fixture(2);f.hourly.precipitation[25]=null;
 const x=core.parseModel(f,now);
 assert.equal(x.totals[24],48);assert.equal(x.totals[72],null);assert.equal(x.totals[120],null);
 f.hourly_units.precipitation='inch';assert.throws(()=>core.parseModel(f,now));
 const missing=fixture(1);missing.hourly.time.splice(45,1);missing.hourly.precipitation.splice(45,1);
 assert.equal(core.parseModel(missing,now),null);
 assert.match(core.interpretation({}),/ไม่เพียงพอ/);
});
test('multi-model comparison reports values not an event probability',()=>{
 const a=core.parseModel(fixture(1),now),b=core.parseModel(fixture(3),now);
 const comparison=core.interpretation({ecmwf_ifs025:a,ncep_gfs_global:b});
 assert.match(comparison,/120\.0–360\.0/);
 assert.match(comparison,/ไม่ใช่ระดับน้ำ/);
});
test('ensemble needs at least ten complete validated members',()=>{
 const f=fixture(1);
 f.hourly_units={};
 for(let i=0;i<12;i++){
  f.hourly['precipitation_member'+(i+1).toString().padStart(2,'0')]=f.hourly.time.map(()=>i+1);
  f.hourly_units['precipitation_member'+(i+1).toString().padStart(2,'0')]='mm';
 }
 const result=core.parseEnsemble(f,now);
 assert.equal(result.members,12);
 assert.ok(result.p10<=result.median&&result.median<=result.p90);
 delete f.hourly_units.precipitation_member12;
 delete f.hourly_units.precipitation_member11;
 delete f.hourly_units.precipitation_member10;
 assert.equal(core.parseEnsemble(f,now),null);
});

test('public explanation reports only validated forecast windows and never declares flooding',()=>{
 const a=core.parseModel(fixture(.1),now),b=core.parseModel(fixture(.2),now),c=core.parseModel(fixture(.3),now);
 const report=core.publicSummary({ecmwf_ifs025:a,ncep_gfs_global:b,icon_global:c});
 assert.equal(report.available,true);assert.equal(report.windows[120].count,3);
 assert.match(report.labels[120],/12\.0–36\.0 มม/);
 assert.match(report.agreement,/24\.0 มม/);
 assert.doesNotMatch(report.lead,/จะเกิดน้ำท่วม|ปลอดภัยแน่นอน/);
 const missing=core.publicSummary({});assert.equal(missing.available,false);
 const partial=core.parseModel(fixture(.2),now);partial.totals[72]=null;partial.totals[120]=null;
 const one=core.publicSummary({ecmwf_ifs025:a,ncep_gfs_global:partial});
 assert.equal(one.windows[120].count,1);assert.match(one.agreement,/เพียงแบบจำลองเดียว/);
});

test('plain rain pattern uses validated next 24 hourly values, not an invented five-day chance',()=>{
 const wet=core.parseModel(fixture(.2),now),dry=core.parseModel(fixture(0),now);
 const all=core.rainPattern({ecmwf_ifs025:wet,ncep_gfs_global:wet});
 assert.match(all,/ทั้ง 2 ชุดคาดว่ามีฝน/);
 assert.match(all,/ไม่.*ฝนจะตกตลอดวัน/);
 assert.match(all,/0\.2 มม/);
 const different=core.rainPattern({ecmwf_ifs025:wet,ncep_gfs_global:dry});
 assert.match(different,/1 จาก 2 แบบจำลอง/);
 assert.match(core.rainPattern({}),/ข้อมูลรายชั่วโมงครบ 24 ชั่วโมง/);
 const incomplete=core.parseModel(fixture(.2),now);
 incomplete.rows[6]=null;
 assert.match(core.rainPattern({ecmwf_ifs025:incomplete}),/ข้อมูลรายชั่วโมงครบ 24 ชั่วโมง/);
});


test('TMD-aligned 24-hour rainfall criteria use millimetre thresholds without applying them to 3-day or 5-day totals',()=>{
 assert.equal(core.rain24Level(0).label,'ฝนวัดจำนวนไม่ได้');
 assert.equal(core.rain24Level(0.1).label,'ฝนเล็กน้อย');
 assert.equal(core.rain24Level(10).label,'ฝนเล็กน้อย');
 assert.equal(core.rain24Level(10.1).label,'ฝนปานกลาง');
 assert.equal(core.rain24Level(35).label,'ฝนปานกลาง');
 assert.equal(core.rain24Level(35.1).label,'ฝนหนัก');
 assert.equal(core.rain24Level(90).label,'ฝนหนัก');
 assert.equal(core.rain24Level(90.1).label,'ฝนหนักมาก');
 assert.equal(core.rain24Range(8,40).label,'ฝนเล็กน้อย ถึง ฝนหนัก');
 assert.equal(core.rain24Level(null),null);
 const a=core.parseModel(fixture(.2),now),b=core.parseModel(fixture(.5),now);
 const report=core.publicSummary({ecmwf_ifs025:a,ncep_gfs_global:b});
 assert.match(report.criterion24,/24 ชั่วโมง/);
 assert.match(report.criterion24,/4\.8–12\.0 มม/);
 assert.match(report.criterion24,/ฝนเล็กน้อย ถึง ฝนปานกลาง/);
 assert.match(report.criterion24,/ไม่ใช่รายงานฝนตรวจวัด/);
});
