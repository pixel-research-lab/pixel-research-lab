import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {emptyLab,changes,compare,materialize} from '../cloud/model.js';
const load=(paths,last,env={})=>runInNewContext(paths.map(p=>readFileSync(new URL('../src/'+p+'.js',import.meta.url),'utf8')).join('\n')+'\n'+last,env);
const pets=load(['reviews','attendance','pets'],'labPets');
const files=load(['material-store'],'labFiles',{crypto:webcrypto});
const bench={sites:[58,59,115],top:103};
function advanceUntil(state,mode,scene=bench,random=()=>.1){
  for(let i=0;i<5000;i++){
    pets.step(state,.08,random,scene);
    if(state.mode===mode)return;
  }
  assert.fail('did not reach '+mode);
}
for(const species of ['cat','dog']){
  test(species+' explores, chooses a real landing, naps, stretches and descends',()=>{
    const random=()=>.1, state=pets.start(random,species);
    advanceUntil(state,species==='cat'?'groom':'sniff',bench,random);
    if(species==='dog')advanceUntil(state,'perk',bench,random);
    for(const mode of ['lookUp','crouch','up',...(species==='cat'?['groom']:[]),'settle','sleep'])advanceUntil(state,mode,bench,random);
    assert.ok(bench.sites.includes(state.x));assert.equal(state.y,103);
    assert.ok(state.limit>=60 && state.limit<=180);
    const duration=state.limit;
    for(let i=1;i<Math.floor(duration/.1);i++){pets.step(state,.1,random,bench);assert.equal(state.mode,'sleep');}
    for(const mode of ['stretch','down','walk'])advanceUntil(state,mode,bench,random);
    assert.equal(state.y,152);
  });
}
test('a newly occupied landing leads to a continuous descent; a full desk leaves space for a floor nap',()=>{
  const random=()=>.2,state=pets.start(random,'dog'),full={sites:[],top:103};
  advanceUntil(state,'sleep'); const x=state.x,y=state.y;
  pets.step(state,.07,random,full);assert.equal(state.mode,'down');
  assert.ok(Math.abs(state.x-x)<4 && Math.abs(state.y-y)<5);
  advanceUntil(state,'walk',full);advanceUntil(state,'sleep',full);
  assert.equal(state.onDesk,false);assert.equal(state.y,152);
});
test('each landing fits the whole sprite between furniture including equipped collectibles',()=>{
  const f=load(['furniture'],'furniture');
  for(const room of Object.keys(f.rooms)){
    for(const gear of ['single','dual','bench']){
      const look={room,gear},pos=f.positions(look),slots=['plant','crab','mug'];
      const sites=f.landingSites(look,pos,slots);
      const spans=[[258,288],[80,103],[122,145],[221,244]];
      for(const k of f.keysFor(look).filter(k=>k!=='calendar'))spans.push([pos[k].x,pos[k].x+f.rect(look,k,pos[k]).w]);
      for(const x of sites){
        assert.ok(x-20>=f.rooms[room].left && x+20<=f.rooms[room].right);
        assert.ok(spans.every(([l,r])=>x+20<=l || x-20>=r));
      }
      if(gear==='single')assert.ok(sites.length);
    }
  }
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
