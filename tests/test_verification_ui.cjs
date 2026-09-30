'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('docs/index.html','utf8');
const js=fs.readFileSync('docs/assets/verification.js','utf8');
const outlook=fs.readFileSync('docs/assets/rain-outlook.js','utf8');
const sw=fs.readFileSync('docs/sw.js','utf8');

test('v1.16 verification panel and scripts are present',()=>{
 assert.match(html,/id="forecast-verification"/);
 assert.match(html,/id="verification-summary"/);
 assert.match(html,/id="verification-list"/);
 assert.match(html,/verification-core\.js/);
 assert.match(html,/verification\.js/);
});

test('rain outlook emits only a local verification snapshot event',()=>{
 assert.match(outlook,/rainradar:rain-outlook-snapshot/);
 assert.match(outlook,/total24/);
 assert.doesNotMatch(outlook,/localStorage/);
});

test('verification stores records locally and requires same-window confirmation',()=>{
 assert.match(js,/localStorage/);
 assert.match(js,/ครอบคลุมช่วงเวลา 24 ชั่วโมงเดียวกัน/);
 assert.match(js,/Date\.now\(\)<r\.periodEnd/);
 assert.doesNotMatch(js,/fetch\(/);
});

test('radar is not treated as observed rainfall for scoring',()=>{
 assert.match(html,/ไม่ใช้ภาพเรดาร์เป็นตัวเลขฝนจริง/);
 assert.match(html,/ยังไม่ใช่ QPE/);
 assert.doesNotMatch(js,/radar\.json|radar-image|dBZ/);
});

test('service worker includes verification modules in v1.16 shell',()=>{
 assert.match(sw,/rain-radar-shell-v116-verification/);
 assert.match(sw,/verification-core\.js/);
 assert.match(sw,/verification\.js/);
});
