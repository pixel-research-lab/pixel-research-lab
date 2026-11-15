import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {emptyLab,parts,materialize,compare} from '../cloud/model.js';
const {lootDefs,lootGroups,lootPool,requests}=runInNewContext(readFileSync(new URL('../src/data.js',import.meta.url),'utf8')+'\n({lootDefs,lootGroups,lootPool,requests})');

test('the 50 collectible IDs have distinct transparent PNGs and five browsable groups',()=>{
 assert.equal(Object.keys(lootDefs).length,50);
 const names=new Set(),pictures=new Set();
 for(const [id,[name,description,group]] of Object.entries(lootDefs)){
  assert.ok(description.length>10);assert.ok(lootGroups[group]);names.add(name);
  const png=readFileSync(new URL('../assets/images/items/'+id+'.png',import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),16);
  assert.ok(png.readUInt32BE(20)<=16);assert.equal(png[25],6); // RGBA
  pictures.add(createHash('sha256').update(png).digest('hex'));
 }
 assert.equal(names.size,50);assert.equal(pictures.size,50);
 for(const group of Object.keys(lootGroups))assert.equal(Object.values(lootDefs).filter(x=>x[2]===group).length,10);
});

test('repeating the introductory quest unlocks all 49 rewards before any duplicate',()=>{
 const inventory={plant:1};
 assert.deepEqual([...lootPool(inventory,requests[0][0])],['lens']);
 const earned=[];
 for(let n=0;n<49;n++){
  const pool=lootPool(inventory,requests[0][0]);
  assert.ok(pool.every(id=>!inventory[id]));
  const item=pool[pool.length-1];inventory[item]=1;earned.push(item);
 }
 assert.equal(new Set(earned).size,49);assert.ok(!earned.includes('plant'));
 assert.equal(lootPool(inventory,requests[0][0]).length,49);
 assert.equal(lootPool({plant:1,lens:2},'사라진 한 프레임').includes('lens'),false);
});

test('legacy and new rewards survive cloud round trips; simultaneous completion pays once',()=>{
 const state=emptyLab();state.inventory={plant:1,lens:2,mug:1,floppy:1};state.slots=['lens','mug','floppy'];
 const old=materialize([...parts(state)].map(([id,value])=>({id,value})));
 assert.deepEqual(old.inventory,state.inventory);assert.deepEqual(old.slots,state.slots);
 const quest={id:'new-q',status:'done',created:1,loot:'telescope'};
 const a={id:'q~new-q',value:quest,clock:2,actor:'mac'};
 const b={id:'q~new-q',value:{...quest,loot:'crystal'},clock:3,actor:'windows'};
 const merged=materialize([...parts(state)].map(([id,value])=>({id,value})).concat(compare(a,b)>0?a:b));
 assert.equal(merged.inventory.crystal,1);assert.equal(merged.inventory.telescope,undefined);
 assert.deepEqual(merged.slots,state.slots);
 const all={...emptyLab(),inventory:Object.fromEntries(Object.keys(lootDefs).map(id=>[id,1])),slots:['terrarium','telescope','catlamp']};
 const restored=materialize([...parts(all)].map(([id,value])=>({id,value})));
 assert.deepEqual(restored.inventory,all.inventory);assert.deepEqual(restored.slots,all.slots);
});
