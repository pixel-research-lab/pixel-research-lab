import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab,changes,materialize} from '../cloud/model.js';
const attendance = runInNewContext(readFileSync(new URL('../src/attendance.js',import.meta.url),'utf8')+'\nattendance');
const date = (day,h,m=0) => new Date(2026,10,day,h,m);
function row(action,day,h) {return {id:action,action,at:+date(day,h)};}
const events = [row('start',9,22),row('pause',9,23),row('resume',10,1),row('finish',10,4)];
const now = +date(11,12);

test('correcting checkout preserves its ID and recalculates the right side of midnight after sync',()=>{
  const corrected = attendance.correct(events,events[3],+date(10,3),null,now);
  const delta = changes({...emptyLab(),attendance:events},{...emptyLab(),attendance:corrected});
  assert.equal(delta.length,1);assert.equal(delta[0].id,'time~finish');
  const synced = materialize([...events.slice(0,3).map(e=>({id:'time~'+e.id,value:e})),...delta]);
  assert.ok(attendance.valid(synced.attendance));
  const result = attendance.timeline(synced.attendance);
  assert.equal(attendance.dayTotal(result,date(9,12),now),3600000);
  assert.equal(attendance.dayTotal(result,date(10,12),now),7200000);
  assert.equal(result.status,'idle');
});
test('backfill an open or paused shift once and reject stale, future and out-of-sequence edits',()=>{
  for (const original of [events.slice(0,1),events.slice(0,2)]) {
    const last=original.at(-1);
    const finished=attendance.correct(original,last,+date(10,1),'late-finish',now);
    assert.equal(attendance.timeline(finished).status,'idle');
    assert.throws(()=>attendance.correct(finished,last,+date(10,2),'retry',now));
  }
  assert.throws(()=>attendance.correct(events,events[0],events[1].at,null,now));
  assert.throws(()=>attendance.correct(events,events[3],now+1,null,now));
  const changed=attendance.correct(events,events[3],+date(10,3),null,now);
  assert.throws(()=>attendance.correct(changed,events[3],+date(10,2),null,now));
});
test('two valid offline edits that cross keep session order and can be reconciled',()=>{
  const a=attendance.correct(events,events[0],+date(9,22,45),null,now)[0];
  const b=attendance.correct(events,events[1],+date(9,22,15),null,now)[1];
  const joined=[a,b,...events.slice(2)];
  const result=attendance.timeline(joined);
  assert.equal(result.accepted.filter(e=>e.conflicted).length,2);
  assert.equal(result.accepted[0].at,events[0].at);
  const fixed=attendance.correct(joined,result.accepted[0],+date(9,21),null,now);
  assert.equal(attendance.timeline(fixed).accepted.some(e=>e.conflicted),false);
});
