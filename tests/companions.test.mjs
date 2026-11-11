import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {emptyLab,changes,compare,materialize} from '../cloud/model.js';
const load=(paths,last,env={})=>runInNewContext(paths.map(p=>readFileSync(new URL('../src/'+p+'.js',import.meta.url),'utf8')).join('\n')+'\n'+last,env);
const pets=load(['reviews','attendance','pets'],'labPets');
const files=load(['material-store'],'labFiles',{crypto:webcrypto});
test('a pet walks, watches, goes to the desk, naps and comes down without an input event',()=>{
  const random=()=>0.5,state=pets.start(random),seen=new Set();let returned=false;
  for(let i=0;i<2200;i++){pets.step(state,.08,random);seen.add(state.mode);
    if(state.mode==='sleep'){assert.equal(state.y,103);assert.equal(state.x,239);}
    if(seen.has('down')&&state.mode==='walk'){returned=true;break;}
  }
  assert.equal(seen.size,6);assert.ok(returned);assert.equal(state.y,152);
  assert.equal(Object.keys(pets.kinds).length,7);
});
test('context responds to actual work, an incorrect recall, a finished quest and checkout',()=>{
  const date=new Date(2026,10,12,10),now=date.getTime(),s=emptyLab(),idle={status:'idle',accepted:[]},active={status:'working',accepted:[],since:now};
  assert.match(pets.remark(s,date,idle,3)[0],/3개/);
  assert.match(pets.remark(s,date,active,3)[0],/시작/);
  s.reviews=[{attempts:[{day:'2026-11-12',correct:false,at:now}]}];assert.match(pets.remark(s,date,idle,0)[0],/막힌/);
  s.quests=[{status:'done',ended:now+1}];assert.match(pets.remark(s,date,idle,0)[0],/1개/);
  assert.match(pets.remark(s,date,{...idle,accepted:[{at:now,action:'finish'}]},0)[0],/수고/);
});
test('file metadata and selected pet merge independently; unlink wins over an older link',()=>{
  const id='ac6d3a12-6672-4107-a968-fe19405443c7',item={id,parent:'q1',section:'quest',name:'원본.pdf',size:7,sha:'a'.repeat(64),type:'application/pdf'};
  const s=emptyLab(),a=changes(s,{...s,materials:{[id]:item}}),b=changes(s,{...s,pet:'calico'});
  const next=materialize([...a,...b]);assert.ok(files.validMap(next.materials));assert.equal(next.pet,'calico');
  assert.ok(compare({...a[0],clock:1,value:{...item,removed:true}},{...a[0],clock:100})>0);
  assert.equal(files.validMap({[id]:{...item,type:'text/html'}}),false);
});
test('original file signature, size and byte digest govern accepted attachments',async()=>{
  const pdf=new Blob(['%PDF-1.5\nhello']);
  const info=await files.inspect(pdf);assert.equal(info.type,'application/pdf');assert.equal(info.sha.length,64);assert.equal(info.size,pdf.size);
  assert.equal((await files.inspect(new Blob([pdf],{type:'image/png'}))).sha,info.sha);
  await assert.rejects(files.inspect(new Blob(['<html>'],{type:'application/pdf'})));
  await assert.rejects(files.inspect(new Blob([])));
  await assert.rejects(files.inspect({size:files.maxSize+1}));
});
