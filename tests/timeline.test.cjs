const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data = script.slice(script.indexOf('const item='), script.indexOf('const packItems='));
const days = vm.runInNewContext(data + '; days;');

test('all ten days have timed entries and stable unique identifiers', () => {
  assert.equal(days.length, 10);
  const ids=[];
  for (const day of days) {
    assert.ok(day.items.length>0);
    for (const entry of [...day.items,...(day.alternatives||[])]) {
      assert.ok(entry.time);assert.ok(entry.id);ids.push(entry.id);
      assert.equal(entry.timeConfirmed, false);
    }
  }
  assert.equal(new Set(ids).size,ids.length);
});

test('provided flight times distinguish Taiwan departure, mother flight, and unknown Tokyo flight', () => {
  const departure=days[0].items.find(entry=>entry.id==='eva-tpe-cts');
  assert.equal(departure.time,'09:30');assert.equal(departure.timezone,'Asia/Taipei');assert.equal(departure.timeSource,'user');
  const mother=days[5].items.find(entry=>entry.id==='mother-flight');
  assert.equal(mother.time,'15:30');assert.equal(mother.timezone,'Asia/Tokyo');assert.equal(mother.timeSource,'user');
  const tokyo=days[5].items.find(entry=>entry.id==='cts-tokyo');
  assert.equal(tokyo.time,'依航班');assert.equal(tokyo.timeSource,'pending');
});

test('hotel assignments and transfers follow the user itinerary', () => {
  assert.equal(days[0].hotel.id,'yuen');
  assert.equal(days[1].hotel.id,'hanamomiji');assert.equal(days[2].hotel.id,'hanamomiji');
  assert.equal(days[3].hotel.id,'grids');assert.equal(days[4].hotel.id,'grids');
  for(let i=5;i<10;i++)assert.equal(days[i].hotel.id,'keio');
  assert.ok(days[1].items[0].status.includes('尚未預約'));
  assert.ok(days[3].items[0].options.some(option=>option.includes('JR')));
  assert.equal(days[4].alternatives[0].id,'nikka');
  assert.ok(days.slice(6).every(day=>day.title.includes('待確認')||day.items[0].title.includes('待安排')));
});

test('timeline renderer includes provided time, source timezone, stable save key, and map link', () => {
  const renderer = script.slice(script.indexOf('function timelineHTML('), script.indexOf('function renderStrip('));
  const render = vm.runInNewContext(renderer + '; timelineHTML;', {
    key: (day, i) => day.items[i].id,
    saved: new Set(['eva-tpe-cts']),
    icon: name => `<svg data-icon="${name}"></svg>`,
    illustration: () => '<svg class="test-thumbnail"></svg>'
  });
  const output = render(days[0], days[0].items[0], 0);
  for (const expected of ['<li class="timeline-item','timeline-time','09:30','已提供','台灣時間',
    'timeline-dot','timeline-card','長榮航空','timeline-thumb','data-save="eva-tpe-cts"',
    'aria-pressed="true"','已收藏','google.com/maps']) assert.ok(output.includes(expected), expected);
  const pending=render(days[1],days[1].items[0],0);
  assert.ok(pending.includes('尚未預約'));assert.ok(pending.includes('<details'));assert.ok(pending.includes('計程車'));
});

test('daily view uses an ordered timeline with no favorites tab', () => {
  assert.ok(html.includes('<ol class="timeline" id="daycards"'));
  assert.ok(html.includes('timelineHTML(d,it,i)'));
  assert.ok(!html.includes('id="page-saved"'));
  assert.ok(!html.includes("['saved','heart','收藏']"));
  assert.ok(html.includes('住宿安排 · 4 間飯店'));
});
