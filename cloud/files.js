import {Bytes,collection,doc,getDoc,getDocs,writeBatch} from 'firebase/firestore/lite';
import {auth} from './identity.js';
import '../src/material-store.js';

const chunkSize=240*1024;
const checkOwner=uid=>{if(!uid || auth.currentUser?.uid!==uid)throw Error('파일을 열던 계정이 변경됐어요.');};
const root=(store,uid,sha)=>doc(store,'players',uid,'materials',sha);
export async function publishFile(store,uid,ref){
  checkOwner(uid);
  const manifest=root(store,uid,ref.sha);
  if((await getDoc(manifest)).exists())return;
  const blob=await globalThis.labFiles.local(uid,ref.sha);
  if(!blob || blob.size!==ref.size)throw Error('업로드할 원본을 찾지 못했어요.');
  const count=Math.ceil(blob.size/chunkSize);
  for(let first=0;first<count;first+=12){
    checkOwner(uid);
    const batch=writeBatch(store);
    for(let i=first;i<Math.min(first+12,count);i++){
      const bytes=await blob.slice(i*chunkSize,(i+1)*chunkSize).arrayBuffer();
      batch.set(doc(manifest,'chunks',String(i).padStart(3,'0')),{bytes:Bytes.fromUint8Array(new Uint8Array(bytes))});
    }
    if(first+12>=count)batch.set(manifest,{size:ref.size,type:ref.type,count});
    await batch.commit();
  }
}
export async function fetchFile(store,uid,ref){
  checkOwner(uid);const manifest=root(store,uid,ref.sha),snap=await getDoc(manifest);
  if(!snap.exists())throw Error('원본 전송 대기 중이에요. 첨부한 기기를 연결한 후 다시 열어 주세요.');
  const m=snap.data(),expected=Math.ceil(ref.size/chunkSize);
  if(m.count!==expected || m.size!==ref.size || m.type!==ref.type)throw Error('첨부 정보가 일치하지 않아요.');
  const chunks=await getDocs(collection(manifest,'chunks'));checkOwner(uid);
  if(chunks.size!==expected)throw Error('첨부 원본을 다시 받아야 해요.');
  return new Blob(chunks.docs.map((d,i)=>{
    if(d.id!==String(i).padStart(3,'0'))throw Error('첨부 조각을 찾지 못했어요.');
    return d.data().bytes.toUint8Array();
  }),{type:ref.type});
}
