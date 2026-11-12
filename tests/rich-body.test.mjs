import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {emptyLab,parts,materialize} from '../cloud/model.js';
const model=runInNewContext(readFileSync(new URL('../src/rich-body.js',import.meta.url),'utf8')+'\nrichBody',{TextEncoder});
const ref='21cda825-1ae0-415e-9be9-1b865fa48578',image={type:'image',ref,caption:'그림 1'};
test('body validation bounds imported documents and refuses unsupported code and image references',()=>{
  assert.equal(model.valid([image]),true);
  assert.equal(model.valid([{...image,ref:'example.png'}]),false);
  assert.equal(model.valid([{type:'text',text:'가'.repeat(11000)}]),false);
  assert.equal(model.valid([{type:'code',lang:'html',text:'return'}]),false);
  assert.equal(model.valid([{type:'text',text:'  '}]),false);
});
test('source remains text through highlighting and old plain-text cards need no rich view',()=>{
  assert.equal(model.view(undefined,'q','quest'),'');
  const out=model.view([image,{type:'code',lang:'python',text:'if x < 3:\n    return "<표>"'},{type:'text',text:'<표>'}],'q','quest');
  assert.match(out,/tok-keyword/);assert.match(out,/&lt;표&gt;/);assert.ok(!out.includes('<표>'));
});
test('independent review, material and grade records restore the exact ordered bodies',()=>{
  const before=emptyLab(),answer=[{type:'code',lang:'bash',text:'echo "$x"'}],prompt=[{type:'text',text:'앞'},image,{type:'text',text:'뒤'}];
  const state={...before,reviews:[{id:'r',firstDue:'2026-11-13',question:'앞',answer:'코드 살펴보기',questionBody:prompt,answerBody:answer,attempts:[]}],
    materials:{[ref]:{id:ref,parent:'r',section:'prompt',inline:true}}};
  const rows=Array.from(parts(state),([id,value])=>({id,value})).reverse();
  const result=materialize(rows);
  assert.deepEqual(result.reviews,state.reviews);assert.deepEqual(result.materials,state.materials);
});
