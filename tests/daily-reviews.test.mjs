import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab, changes, compare, materialize} from '../cloud/model.js';

const source = readFileSync(new URL('../src/reviews.js', import.meta.url), 'utf8');
const schedule = runInNewContext(source + '\nreviewSchedule');
const day = '2026-11-12';
const yesterday = schedule.addDays(day, -1);
const tomorrow = schedule.addDays(day, 1);
const card = (id, firstDue = day) => ({id, firstDue, question:id, answer:'답', attempts:[]});
const cards = () => Array.from({length:10}, (_,i) => card('q-' + i));
const ids = (items, limit=6) => Array.from(schedule.draw(items, day, limit).ids);

test('draw is independent of device order and today’s grades cannot refill a finished slot', () => {
  const collection = cards(), first = ids(collection);
  assert.equal(first.length, 6);
  assert.equal(new Set(first).size, 6);
  assert.deepEqual(ids([...collection].reverse()), first);
  collection.find(q => q.id === first[0]).attempts.push({day, due:day, correct:true});
  assert.deepEqual(ids(collection), first);
  assert.equal(first.filter(id => schedule.progress(collection.find(q => q.id === id)).due <= day).length, 5);
  assert.deepEqual(ids([card('tomorrow', tomorrow)]), []);
  assert.equal(ids(collection.slice(0, 4)).length, 4);
});

test('retries come before new cards, oldest missed turn first, without exceeding the limit', () => {
  const oldDay = schedule.addDays(day, -3);
  const missed = [card('older',oldDay), card('recent',yesterday)];
  for (const q of missed) q.attempts.push({day:q.firstDue, due:q.firstDue, correct:false});
  assert.deepEqual(ids([...cards(), ...missed],1), ['older']);
  assert.deepEqual(ids([...cards(), ...missed],2), ['older','recent']);
  assert.equal(schedule.progress(missed[1]).due, day);
});

test('legacy saves, settings and a fixed draw sync independently from individual grades', () => {
  const old = {...emptyLab(), reviews:cards()};
  const draw = {...schedule.draw(old.reviews, day, 6), createdAt:1000};
  const next = {...old, reviewLimit:3, reviewDraw:draw};
  const records = changes(emptyLab(),next).map(entry=>({...entry,clock:1,actor:'a'}));
  const restored = materialize(records);
  assert.equal(restored.reviewLimit, 3);
  assert.deepEqual(restored.reviewDraw, draw);
  assert.equal(changes(old,next).length, 2);
  assert.equal(schedule.defaultLimit, 6);
  assert.ok(schedule.validDraw(draw));
  assert.ok(!schedule.validDraw({...draw,ids:[draw.ids[0],draw.ids[0]]}));
  assert.ok(!schedule.validLimit(0));
  const later = {id:'reviewDraw', value:{day,ids:['other'],createdAt:2000}, clock:1, actor:'b'};
  const early = records.find(r=>r.id==='reviewDraw');
  assert.ok(compare(early,later)>0);
  assert.ok(compare(later,early)<0);
  assert.ok(compare({...early,value:{day:tomorrow,ids:['other'],createdAt:3000}},later)>0);
});
