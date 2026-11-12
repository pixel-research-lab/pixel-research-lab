import test from 'node:test';
import assert from 'node:assert/strict';
import {browserListener} from '../slack-bridge/browser-access.mjs';
test('read-only loopback feed separates allowed origins, pairing credentials and settings',async t=>{
  const key='9'.repeat(24),feed={connected:true,rows:[]};
  const s=browserListener(k=>k===key?feed:null);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>s.close());
  const url='http://127.0.0.1:'+s.address().port,origin='https://pixel-research-lab.github.io';
  const request=(path,method,more={})=>fetch(url+path,{method,headers:{origin,...more}});
  const get=(more={})=>request('/events','GET',{authorization:'Bearer '+key,...more});
  const success=await get();assert.deepEqual(await success.json(),feed);assert.equal(success.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await get({authorization:'Bearer '+'0'.repeat(24)})).status,401);
  for(const other of ['null','https://unrelated.github.io',origin+'.example.org','https://pixel-research-lab-2e2guk.web.app.example.org']){
    const r=await get({origin:other});assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
  }
  for(const path of ['/settings','/setup','/events?code='+key])assert.equal((await request(path,'GET',{authorization:'Bearer '+key})).status,403);
  assert.equal((await request('/events','POST')).status,405);
  const h={'access-control-request-method':'GET','access-control-request-headers':'authorization','access-control-request-private-network':'true'};
  const preflight=await request('/events','OPTIONS',h);assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Private-Network'),'true');
  assert.equal((await request('/events','OPTIONS',{...h,'access-control-request-method':'POST'})).status,403);
});
