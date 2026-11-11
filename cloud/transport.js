import {getFirestore,collection,doc,runTransaction} from 'firebase/firestore/lite';
import {auth,app} from './identity.js';
import {rows,update} from './local.js';
import {publishFile,fetchFile} from './files.js';
import {compare} from './model.js';
const store=getFirestore(app);
export const fetchAttachment=(uid,ref)=>fetchFile(store,uid,ref);
function area(uid){return collection(store,'players',uid,'records');}
function packed(row){return {actor:row.actor,clock:row.clock,json:JSON.stringify(row.value)};}
export function unpack(snap){const r=snap.data();return {id:snap.id,actor:r.actor,clock:r.clock,value:JSON.parse(r.json)};}
export async function flush(uid){
  if(!uid || auth.currentUser?.uid!==uid) return;
  const dirty=(await rows(uid)).filter(r=>r.dirty);
  dirty.sort((a,b)=>Number(a.id.startsWith('material~'))-Number(b.id.startsWith('material~')));
  const published=new Set();
  for(let i=0;i<dirty.length;i+=35){
    const batch=dirty.slice(i,i+35);
    for(const r of batch){
      if(r.id.startsWith('material~') && !r.value.removed && !published.has(r.value.sha)){
        await publishFile(store,uid,r.value);published.add(r.value.sha);
      }
    }
    const winners=await runTransaction(store,async tx=>{
      if(auth.currentUser?.uid!==uid) throw Error('계정 변경');
      const docs=await Promise.all(batch.map(r=>tx.get(doc(area(uid),r.id))));
      return docs.map((snap,i)=>{
        const local=batch[i], remote=snap.exists()?unpack(snap):null;
        if(compare(local,remote)>0){tx.set(snap.ref,packed(local));return local;}
        return remote;
      });
    });
    await update(uid,winners,'server');
  }
}
