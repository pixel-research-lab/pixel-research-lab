import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab,changes,materialize} from '../cloud/model.js';

const source = ['data','reviews','studio'].map(n=>readFileSync(new URL('../src/'+n+'.js',import.meta.url),'utf8')).join('\n');
const shop=runInNewContext(source+'\nstudio');
const paid=(n,difficulty='standard')=>Array.from({length:n},(_,i)=>({id:'quest'+i,status:'done',track:'read',loot:'mug',difficulty}));
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');

test('only distinct quest completions and accepted review turns mint currency',()=>{
  const s=emptyLab();assert.equal(shop.wallet(s).balance,0);
  s.quests=paid(1);delete s.quests[0].difficulty;
  s.quests.push({status:'active',difficulty:'hard'});s.agendaDone={event:true};
  s.reviews=[{firstDue:'2026-11-01',attempts:[
    {day:'2026-11-01',due:'2026-11-01',correct:false},
    {day:'2026-11-02',due:'2026-11-02',correct:true},
    {day:'2026-11-02',due:'2026-11-01',correct:true}]}];
  assert.equal(shop.wallet(s).balance,46);
  s.agendaClaims={event:true};s.agendaDone.event=false;
  assert.equal(shop.wallet(s).balance,46);
  s.agendaDone.event=true;assert.equal(shop.wallet(s).balance,46);
});

test('merged offline orders charge once and cannot overspend or pre-order future earnings',()=>{
  const s={...emptyLab(),quests:paid(1,'hard')},a={...s},b={...s};
  shop.equip(a,'parquet',uuid(1),1);shop.equip(b,'brick',uuid(2),2);
  let restored=materialize([...changes(emptyLab(),s),...changes(s,b),...changes(s,a)]);
  assert.equal(shop.wallet(restored).balance,25);
  assert.equal(shop.wallet(restored).fitted.wall,'sage');
  assert.equal(shop.wallet(restored).fitted.floor,'parquet');
  restored.quests=paid(2,'hard');
  assert.equal(shop.wallet(restored).owned.has('brick'),false);
  shop.equip(restored,'brick',uuid(3),3);assert.equal(shop.wallet(restored).balance,45);
  shop.equip(restored,'sage',uuid(4),4);shop.equip(restored,'brick',uuid(5),5);
  assert.equal(shop.wallet(restored).balance,45);
  const same={...s};shop.equip(same,'parquet',uuid(6),6);
  assert.equal(shop.wallet({...restored,purchases:{...restored.purchases,...same.purchases}}).balance,45);
  assert.throws(()=>shop.equip(s,'river',uuid(7),7));
});

test('axis identity survives renaming, hiding, review, save and sync',()=>{
  const s=emptyLab(),id='s-'+uuid(1);
  const def={id,name:'반례 찾기',base:'infer',visible:true,created:1};
  s.skillDefs={[id]:def};s.quests=[...paid(1),{...paid(1)[0],id:'quest-extra',focusSkill:id}];
  s.reviews=[{id:'recall',firstDue:'2026-11-01',focusSkill:id,attempts:[{day:'2026-11-01',due:'2026-11-01',correct:true}]}];
  assert.equal(shop.scores(s).length,6);
  assert.equal(shop.scores(s).find(x=>x.id===id).xp,11);
  def.name='반례 분석';def.visible=false;
  const copy=materialize(changes(emptyLab(),s));
  assert.equal(shop.scores(copy).length,5);copy.skillDefs[id].visible=true;
  assert.equal(shop.scores(copy).find(x=>x.name==='반례 분석').xp,11);
  assert.ok(shop.valid(copy));copy.skillDefs[id].name='';assert.equal(shop.valid(copy),false);
});
