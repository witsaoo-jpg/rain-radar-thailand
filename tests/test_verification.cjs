'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../docs/assets/verification-core.js');

test('creates a local verification snapshot only from validated 24h forecasts',()=>{
 const r=core.createSnapshot({
  capturedAt:Date.UTC(2026,8,30,4,0),
  start:Date.UTC(2026,8,30,5,0),
  place:'ชลบุรี',
  models:{ecmwf_ifs025:{total24:12.4},ncep_gfs_global:{total24:0},icon_global:{total24:null}}
 });
 assert.equal(r.place,'ชลบุรี');
 assert.equal(r.models.ecmwf_ifs025.total24,12.4);
 assert.equal(r.models.ncep_gfs_global.total24,0);
 assert.equal(r.models.icon_global,undefined);
 assert.equal(r.periodStart,Date.UTC(2026,8,30,4,0));
 assert.equal(r.periodEnd,Date.UTC(2026,9,1,4,0));
 assert.equal(r.observation,null);
});

test('verification refuses observed rainfall before the forecast window is complete',()=>{
 const r=core.createSnapshot({capturedAt:1000,start:3600000,models:{ecmwf_ifs025:{total24:1}}});
 assert.throws(()=>core.evaluate(r,2,'TMD',r.periodEnd-1),/not complete/);
});

test('classifies hit miss false alarm and correct negative using 0.1 mm threshold',()=>{
 assert.equal(core.outcome(true,true),'hit');
 assert.equal(core.outcome(false,true),'miss');
 assert.equal(core.outcome(true,false),'false-alarm');
 assert.equal(core.outcome(false,false),'correct-negative');
 const end=Date.UTC(2026,9,1,4,0);
 const make=models=>core.createSnapshot({capturedAt:Date.UTC(2026,8,30,4,0),start:Date.UTC(2026,8,30,5,0),models});
 let r=core.evaluate(make({ecmwf_ifs025:{total24:5},ncep_gfs_global:{total24:0}}),2,'TMD',end);
 assert.equal(r.observation.evaluations.ecmwf_ifs025.outcome,'hit');
 assert.equal(r.observation.evaluations.ncep_gfs_global.outcome,'miss');
 r=core.evaluate(make({ecmwf_ifs025:{total24:5},ncep_gfs_global:{total24:0}}),0,'TMD',end);
 assert.equal(r.observation.evaluations.ecmwf_ifs025.outcome,'false-alarm');
 assert.equal(r.observation.evaluations.ncep_gfs_global.outcome,'correct-negative');
});

test('calculates absolute error and rainfall-level match',()=>{
 const r=core.createSnapshot({capturedAt:1,start:3600000,models:{ecmwf_ifs025:{total24:30},ncep_gfs_global:{total24:40}}});
 const done=core.evaluate(r,32,'TMD AWS',r.periodEnd);
 assert.equal(done.observation.evaluations.ecmwf_ifs025.absError,2);
 assert.equal(done.observation.evaluations.ecmwf_ifs025.levelMatch,true);
 assert.equal(done.observation.evaluations.ncep_gfs_global.absError,8);
 assert.equal(done.observation.evaluations.ncep_gfs_global.levelMatch,false);
});

test('summarizes historical model performance without ranking models',()=>{
 const base={capturedAt:1,start:3600000,models:{ecmwf_ifs025:{total24:5},ncep_gfs_global:{total24:0}}};
 const a=core.evaluate(core.createSnapshot(base),2,'TMD',core.createSnapshot(base).periodEnd);
 const b=core.evaluate(core.createSnapshot({...base,capturedAt:2}),0,'TMD',core.createSnapshot({...base,capturedAt:2}).periodEnd);
 const stats=core.summarize([a,b]);
 assert.equal(stats.ecmwf_ifs025.evaluated,2);
 assert.equal(stats.ecmwf_ifs025.hit,1);
 assert.equal(stats.ecmwf_ifs025.falseAlarm,1);
 assert.equal(stats.ncep_gfs_global.miss,1);
 assert.equal(stats.ncep_gfs_global.correctNegative,1);
 assert.equal(typeof stats.ecmwf_ifs025.mae,'number');
});
