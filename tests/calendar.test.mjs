import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab,parts,changes,materialize,compare} from '../cloud/model.js';

const source=name=>readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8');
const calendar=fetch=>runInNewContext(source('reviews')+'\n'+source('calendar')+'\nlabCalendar',
  {crypto,TextEncoder,URL,fetch,Intl,Date,AbortController,setTimeout,clearTimeout});
const raw=(id,day='2026-11-11')=>({id,summary:'랩 미팅',start:{date:day},end:{date:'2026-11-13'},etag:'"one"',updated:'2026-11-01T05:00:00Z'});
const ok=value=>new Response(JSON.stringify(value),{status:200});

test('all-day ends exclude midnight; repeated instances have separate identities',async()=>{
  const c=calendar(),a=await c.fromGoogle('cal',raw('series_1')),b=await c.fromGoogle('cal',raw('series_2'));
  assert.ok(c.overlaps(a,'2026-11-12','2026-11-12'));assert.ok(!c.overlaps(a,'2026-11-13','2026-11-13'));
  assert.notEqual(a.key,b.key);assert.notEqual(a.key,(await c.fromGoogle('other',raw('series_1'))).key);
  const instant=await c.fromGoogle('cal',{...raw('timed'),start:{dateTime:'2026-11-11T23:30:00+09:00'},end:{dateTime:'2026-11-12T00:00:00+09:00'}});
  assert.equal(instant.start,'2026-11-11T14:30:00.000Z');
  assert.deepEqual(Array.from(c.days(instant)),[c.day(new Date(instant.start)),c.day(new Date(Date.parse(instant.end)-1))]);
});
test('calendar results include later pages and expand recurring events only on the selected calendar',async()=>{
  const seen=[];
  const c=calendar(async url=>{seen.push(url);return ok(url.searchParams.has('pageToken')?{items:[raw('b')]}:{items:[raw('a')],nextPageToken:'next'});});
  const rows=await c.monthEvents('token','research@example.org','2026-11');
  assert.equal(rows.length,2);assert.equal(seen[1].searchParams.get('pageToken'),'next');
  assert.equal(seen[0].searchParams.get('singleEvents'),'true');
  assert.match(seen[0].pathname,/research%40example.org\/events$/);
});
test('retried inserts use the same event ID; conflicting edits keep both versions',async()=>{
  const seen=[];
  const c=calendar(async (url,req)=>{seen.push(req);return req.method==='GET'?ok(raw('abc')):
    new Response('',{status:req.method==='POST'?409:412});});
  const e=await c.fromGoogle('cal',raw('abc'));
  assert.ok(!(await c.upload('token',{...e,etag:''})).conflict);
  assert.equal(JSON.parse(seen[0].body).id,'abc');
  const rejected=await c.upload('token',{...e,title:'다른 제목'});
  assert.ok(rejected.conflict);assert.equal(rejected.event.title,e.title);
  assert.equal(seen[2].headers['If-Match'],'"one"');
});
test('account merge keeps personal completion and importance through Google event edits',async()=>{
  const c=calendar(),e=await c.fromGoogle('cal',raw('test')),base=emptyLab();
  const state={...base,agendaEvents:[e],agendaDone:{[e.key]:true},agendaStars:{[e.key]:true},calendarChoice:{id:'cal',name:'연구',writable:true}};
  assert.ok(c.validState(state));
  assert.ok(c.validState(base));
  const entries=Array.from(parts(state),([id,value])=>({id,value,clock:10,actor:'device'}));
  const newer={...e,title:'변경',updated:e.updated+100};
  const edit=changes(state,{...state,agendaEvents:[newer]});
  assert.equal(edit.length,1);
  assert.ok(compare({...edit[0],clock:5,actor:'other'},entries.find(r=>r.id===edit[0].id))>0);
  const result=materialize(entries.map(r=>r.id===edit[0].id?{...r,value:newer}:r));
  assert.ok(result.agendaDone[e.key] && result.agendaStars[e.key]);
  assert.equal(result.agendaEvents[0].title,'변경');
});
