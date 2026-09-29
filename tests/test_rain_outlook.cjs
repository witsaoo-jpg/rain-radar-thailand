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
 const u=new URL(core.url('ecmwf_ifs025',13.365,100.984));
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
