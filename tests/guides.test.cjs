const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const model=html.split('// GUIDE MODEL START')[1].split('// GUIDE MODEL END')[0];
const {guides,transport}=vm.runInNewContext(model+';({guides:ATTRACTION_GUIDES,transport:DAY_TRANSPORT})');
test('guides cover the provided major destinations and leave Tokyo unplanned',()=>{
 assert.equal(guides.length,8);
 assert.equal(new Set(guides.map(g=>g.id)).size,8);
 assert.equal(guides.filter(g=>g.day===3).length,2);
 assert.equal(guides.filter(g=>g.day===5).length,6);
 assert.ok(guides.every(g=>g.intro&&g.route&&g.url&&g.duration.startsWith('建議')));
 assert.ok(guides.find(g=>g.id==='nikka').note.includes('尚未排入'));
});
test('winter access and supplied prices are not represented as confirmed schedules',()=>{
 assert.ok(guides.find(g=>g.id==='futami').note.includes('待確認'));
 assert.ok(guides.find(g=>g.id==='tengu').note.includes('依你提供資料'));
 assert.ok(guides.find(g=>g.id==='tengu').note.includes('2026'));
 assert.ok(guides.find(g=>g.id==='kitaichi').note.includes('週六'));
 assert.ok(Object.values(transport).flat().every(r=>r.cost==='待確認'));
 assert.ok(transport[4][0].note.includes('飯店官網'));
 assert.ok(transport[6][0].note.includes('你的東京班機時間尚未提供'));
});
test('navigation links encode destinations without calling a directions API',()=>{
 const source=html.slice(html.indexOf('function directionsURL('),html.indexOf('function transportHTML('));
 const url=vm.runInNewContext(source+';directionsURL("小樽駅","天狗山 山麓駅","transit")');
 const params=new URL(url).searchParams;
 assert.equal(params.get('origin'),'小樽駅');assert.equal(params.get('destination'),'天狗山 山麓駅');assert.equal(params.get('travelmode'),'transit');
 assert.equal(params.get('api'),'1');assert.equal(params.has('key'),false);
});
