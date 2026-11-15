import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab,parts,materialize} from '../cloud/model.js';
const code=['data','reviews','gpu','studio'].map(n=>readFileSync(new URL('../src/'+n+'.js',import.meta.url),'utf8')).join('\n');
const {studio,gpuLab}=runInNewContext(code+'\n({studio,gpuLab})');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const funded=n=>({...emptyLab(),quests:Array.from({length:n},(_,i)=>({id:'q'+i,created:i,status:'done',track:'read',loot:'mug',difficulty:'standard'})),inventory:{plant:1,mug:n}});

test('three recipes require every purchased part; assembly does not mint or charge tokens',()=>{
  assert.deepEqual([...gpuLab.models.map(m=>m.total)],[150,320,600]);
  assert.equal(studio.wallet(emptyLab()).fitted.gpu,null);
  const s=funded(5),model=gpuLab.models[0];
  assert.throws(()=>studio.buy(s,model.id,uuid(1),1),/부품/);
  assert.throws(()=>studio.buy(emptyLab(),model.requires[0],uuid(1),1),/부족/);
  for(const [i,id] of model.requires.entries()){
    studio.buy(s,id,uuid(i+2),i+2);
    assert.equal(studio.wallet(s).fitted.gpu,null);
    if(i<3)assert.throws(()=>studio.buy(s,model.id,uuid(10),10),/부품/);
  }
  assert.equal(studio.wallet(s).balance,0);
  studio.buy(s,model.id,uuid(10),10);
  assert.equal(studio.wallet(s).fitted.gpu,model.id);
  assert.equal(studio.wallet(s).balance,0);
  const purchases=JSON.stringify(s.purchases);
  studio.buy(s,model.id,uuid(11),11);studio.buy(s,model.requires[0],uuid(12),12);
  assert.equal(JSON.stringify(s.purchases),purchases);
  assert.ok(studio.valid(s));
});

test('assembled collection and selected GPU round-trip through existing cloud records with legacy room state',()=>{
  const s=funded(50);s.slots=['mug','plant',null];
  studio.equip(s,'brick',uuid(1),1);
  let seq=2;
  for(const m of gpuLab.models){
    for(const part of m.requires)studio.buy(s,part,uuid(++seq),seq);
    studio.buy(s,m.id,uuid(++seq),seq);
  }
  const w=studio.wallet(s);
  assert.equal(w.balance,1500-40-150-320-600);
  studio.buy(s,gpuLab.models[0].id,uuid(++seq),seq);
  const restored=materialize([...parts(JSON.parse(JSON.stringify(s)))].map(([id,value])=>({id,value})));
  const rw=studio.wallet(restored);
  assert.equal(rw.balance,w.balance);assert.equal(rw.fitted.gpu,'gpu-sprout');
  assert.equal(rw.fitted.wall,'brick');assert.deepEqual(restored.slots,s.slots);
  assert.deepEqual(restored.inventory,s.inventory);
  assert.equal(restored.quests.length,50);
  for(const m of gpuLab.models)assert.ok(rw.owned.has(m.id));
  assert.ok(studio.valid(restored));
  studio.buy(restored,'gpu-galaxy',uuid(++seq),0); // Slow device clock must still allow an intentional switch.
  assert.equal(studio.wallet(restored).fitted.gpu,'gpu-galaxy');
  assert.equal(studio.wallet(restored).balance,w.balance);
});

test('conflicting offline spending cannot assemble missing components or double-charge a repeated part',()=>{
  const a=funded(5),b=funded(5),m=gpuLab.models[0];
  studio.equip(b,'brick',uuid(1),1);
  for(const [i,id] of m.requires.entries())studio.buy(a,id,uuid(i+2),i+2);
  studio.buy(a,m.id,uuid(6),6);
  const merged={...a,purchases:{...a.purchases,...b.purchases}};
  assert.equal(studio.wallet(merged).fitted.gpu,null);
  assert.ok(studio.wallet(merged).balance>=0);
  merged.quests=funded(10).quests;
  assert.equal(studio.wallet(merged).fitted.gpu,null); // Earnings do not approve old rejected purchases.
  for(const [i,id] of m.requires.entries())studio.buy(merged,id,uuid(i+10),i+10);
  studio.buy(merged,m.id,uuid(20),20);
  assert.equal(studio.wallet(merged).balance,300-150-40);
  assert.equal(studio.wallet(merged).fitted.gpu,m.id);
  const duplicate={...merged,purchases:{...merged.purchases,[uuid(21)]:{...a.purchases[uuid(2)],id:uuid(21)}}};
  assert.equal(studio.wallet(duplicate).balance,studio.wallet(merged).balance);
});
