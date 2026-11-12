import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {changes,emptyLab,materialize} from '../cloud/model.js';
const code=['data','reviews','furniture','studio'].map(n=>readFileSync(new URL('../src/'+n+'.js',import.meta.url),'utf8')).join('\n');
const {studio,furniture}=runInNewContext(code+'\n;({studio,furniture})');
test('legacy equipment persists and returning to a room restores its local finish and coordinates',()=>{
 const base={...emptyLab(),quests:Array.from({length:15},(_,i)=>({id:'q'+i,status:'done',track:'read',difficulty:'hard',loot:'mug'}))};
 function equip(s,sku){studio.equip(s,sku,crypto.randomUUID(),Date.now());}
 equip(base,'dual');base.fittings.gear='dual';delete base.roomLooks;
 equip(base,'river');equip(base,'mint-audio');const balance=studio.wallet(base).balance;
 base.placements={'river-speaker':{x:72,y:103}};
 equip(base,'studio');assert.equal(studio.wallet(base).fitted.speaker,'house-audio');
 equip(base,'river');
 const copy=materialize(changes(emptyLab(),base));
 assert.equal(studio.wallet(copy).fitted.gear,'dual');assert.equal(studio.wallet(copy).fitted.speaker,'mint-audio');
 assert.equal(studio.wallet(copy).balance,balance);
 assert.equal(furniture.positions(studio.wallet(copy).fitted,copy.placements).speaker.x,72);
 assert.ok(studio.valid(copy));
 const a={...copy,placements:{...copy.placements,'river-clock':{x:98,y:103}}};
 const b={...copy,placements:{...copy.placements,'river-calendar':{x:30,y:60}}};
 const merged=materialize([...changes(emptyLab(),copy),...changes(copy,a),...changes(copy,b)]);
 assert.equal(Object.keys(merged.placements).length,3);
});
