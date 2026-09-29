'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../docs/assets/advisory-core.js');
test('advisory uses model values, not radar claims',()=>{
 assert.equal(core.summarize({maxProbability:75,sumPrecipitation:3},null).level,'high');
 assert.equal(core.summarize({maxProbability:45,sumPrecipitation:1},null).level,'moderate');
 assert.equal(core.summarize({maxProbability:20,sumPrecipitation:0},null).level,'low');
 assert.equal(core.summarize({maxProbability:null,sumPrecipitation:null},null).level,'unknown');
 assert.match(core.summarize({maxProbability:90},null).message,/ประกาศเตือนภัย/);
});
test('unknown amount remains unknown',()=>{assert.equal(core.summarize({maxProbability:70,sumPrecipitation:null},null).amount,null);});
test('favorite init selector is real DOM id rather than removed favorite-places id',()=>{
 const fs=require('node:fs');const html=fs.readFileSync('docs/index.html','utf8'),js=fs.readFileSync('docs/assets/places.js','utf8');
 assert.match(html,/id="places-heading"/);assert.match(js,/root=\$\('places-heading'\)/);
 assert.doesNotMatch(js,/\$\('favorite-places'\)/);
});
test('notification feature is opt-in and does not promise background push',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('docs/index.html','utf8'),js=fs.readFileSync('docs/assets/advisory.js','utf8');
 assert.match(html,/id="notify-enable"/);assert.match(js,/choice\.addEventListener\('click'/);
 assert.match(js,/Notification\.requestPermission\(\)/);
 assert.doesNotMatch(js,/pushManager\.subscribe/);
});
