import {compare} from './model.js';
let opening;
function db(){
  if(!opening) opening=new Promise((resolve,reject)=>{
    const req=indexedDB.open('pixel-research-lab.cloud.v2',1);
    req.onupgradeneeded=()=>{const s=req.result.createObjectStore('records',{keyPath:['uid','id']});s.createIndex('owner','uid');};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return opening;
}
export async function rows(uid) {
  const d=await db();
  return new Promise((resolve,reject)=>{
    const r=d.transaction('records').objectStore('records').index('owner').getAll(uid);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
}
// Every edit and its pending flag commit together. Server echoes never clear newer local edits.
export async function update(uid, entries, mode, actor='', seed=false) {
  if(!entries.length) return;
  const d=await db();
  await new Promise((resolve,reject)=>{
    const tx=d.transaction('records','readwrite'), s=tx.objectStore('records');
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('저장 실패'));tx.onerror=()=>{};
    for(const entry of entries) {
      const req=s.get([uid,entry.id]);
      req.onsuccess=()=>{
        const old=req.result;
        const row=mode==='local'
          ? {uid,id:entry.id,value:entry.value,actor,clock:seed?1:Math.max(Date.now(),(old?.clock||0)+1),dirty:true}
          : {...entry,uid,dirty:false};
        const order=compare(row,old);
        if(order>0 || (order===0 && old?.dirty && mode==='server')) s.put(row);
      };
    }
  });
}
