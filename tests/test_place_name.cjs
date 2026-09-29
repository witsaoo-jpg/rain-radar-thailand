'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../docs/assets/place-name-core.js');
test('reverse geocode request uses approved HTTPS endpoint, only approximate live GPS',()=>{
 const url=new URL(core.url(13.33001,100.96094));
 assert.equal(url.origin,'https://api.bigdatacloud.net');
 assert.equal(url.pathname,'/data/reverse-geocode-client');
 assert.equal(url.searchParams.get('latitude'),'13.3300');
 assert.equal(url.searchParams.get('longitude'),'100.9609');
 assert.equal(url.searchParams.get('localityLanguage'),'th');
 assert.throws(()=>core.url(99,100));
 assert.throws(()=>core.url(NaN,100));
});
test('returns approximate readable area from legitimate coordinate response',()=>{
 const data={latitude:13.3300,longitude:100.9609,lookupSource:'coordinates',countryCode:'TH',locality:'เสม็ด',city:'เมืองชลบุรี',principalSubdivision:'ชลบุรี'};
 const result=core.parse(data,13.33,100.9609);
 assert.equal(result.title,'บริเวณเสม็ด');
 assert.match(result.detail,/ชลบุรี/);
 assert.equal(result.provider,'BigDataCloud');
});
test('rejects IP-based, far away, empty or malformed location names',()=>{
 const data={latitude:13.33,longitude:100.96,lookupSource:'ip',countryCode:'TH',locality:'เสม็ด'};
 assert.equal(core.parse(data,13.33,100.96),null);
 data.lookupSource='coordinates';data.latitude=14;
 assert.equal(core.parse(data,13.33,100.96),null);
 data.latitude=13.33;data.locality='<script>';data.city='';data.principalSubdivision='';
 assert.equal(core.parse(data,13.33,100.96)?.title,'บริเวณ<script>');
 data.locality='';assert.equal(core.parse(data,13.33,100.96),null);
});
