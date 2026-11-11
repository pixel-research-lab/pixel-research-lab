import {auth,login,signOut,onAuthStateChanged,listen,flush} from './firebase.js';
import {emptyLab,changes,materialize} from './model.js';
import {rows,update} from './local.js';
const actor=crypto.randomUUID();
const clone = v => JSON.parse(JSON.stringify(v));
const channel = typeof BroadcastChannel==='function' ? new BroadcastChannel('pixel-lab.records.v2') : null;
let uid=null, epoch=0, revision=0, baseline=null, stop=null, timer, sending=null, connected=false, problem='', hooks;
let writes=Promise.resolve(), localWrites=0;
function message(){
  if(!uid) return '이 브라우저에 저장';
  if(!navigator.onLine) return '오프라인 · 기기에 저장';
  if(problem) return problem;
  if(sending) return '동기화 중';
  return connected?'동기화 완료':'연결 확인 중';
}
function announce(){hooks?.status(message(),auth.currentUser?.email||'');}
function queue(fn) {
  const next=writes.then(fn);
  writes=next.catch(e=>{console.warn('pixel lab storage',e.code||e.name);problem='저장 확인 필요';announce();});
  return next;
}
async function refresh(owner) {
  const version=revision;
  const entries=await rows(owner);
  if(uid!==owner || version!==revision || localWrites) return;
  const next=materialize(entries);
  if(!labSave.valid(next)) {problem='세이브 형식 확인 필요';announce();return;}
  if(JSON.stringify(baseline)!==JSON.stringify(next)){
    baseline=clone(next);
    hooks.apply(next);
  }
  if(entries.some(r=>r.dirty)){if(!problem) problem='동기화 대기';}
  else if(problem==='동기화 대기') problem='';
  announce();
}
function requestBackground(){
  if(!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.ready.then(r=>r.sync?.register('pixel-lab-upload')).catch(()=>{});
}
function soon(delay=900){
  clearTimeout(timer);timer=setTimeout(()=>upload(),delay);
}
async function upload(){
  const owner=uid;
  if(!owner||auth.currentUser?.uid!==owner||!navigator.onLine||sending) return;
  const tag={};sending=tag;announce();
  try {
    await writes;
    await flush(owner);
    if(owner!==uid || sending!==tag)return;
    problem=''; await queue(()=>refresh(owner));
    if((await rows(owner)).some(r=>r.dirty)) soon();
  } catch(e) {
    if(owner===uid){problem=e.code?.includes('permission')?'계정 접근 권한 확인 필요':'동기화 대기';soon(15000);}
  } finally {if(sending===tag){sending=null;announce();}}
}
function edit(state,importing=false){
  if(!uid || !baseline) return false;
  const owner=uid;
  const delta=clone(changes(baseline,state));
  // An explicitly imported save may bring previously unseen quests; it never deletes another device's research.
  baseline=clone(state);revision++;
  if(delta.length || importing) {
    problem='동기화 대기';announce();
    localWrites++;
    queue(async()=>{
      try { await update(owner,delta,'local',actor); }
      finally {localWrites--;}
      if(owner!==uid)return;
      channel?.postMessage(owner);
      requestBackground();soon();
      if(!localWrites) await refresh(owner);
    }).catch(()=>{});
  }
  return true;
}
async function account(user) {
  const generation=++epoch;
  stop?.();stop=null;clearTimeout(timer);sending=null;connected=false;problem='';
  hooks.busy(true);
  try{
    await writes;
    if(generation!==epoch)return;
    const previous=uid;
    uid=user?.uid||null;baseline=null;
    hooks.closeAccount();
    if(!uid){hooks.guest();return;}
    const owner=uid;
    const guest=previous?null:hooks.readGuest();
    if(guest && labSave.valid(guest)) {
      await update(owner,changes(emptyLab(),guest,true),'local',actor,true);
      if(generation!==epoch)return;
      hooks.claimGuest(guest);
    }
    await refresh(owner);
    if(generation!==epoch)return;
    stop=listen(owner,delta=>{
      queue(async()=>{
        if(owner!==uid||generation!==epoch)return;
        if(delta.length) await update(owner,delta,'server');
        if(owner!==uid)return;
        connected=true;problem='';await refresh(owner);
      }).catch(()=>{});
    },e=>{if(owner===uid){problem=e.code?.includes('permission')?'계정 접근 권한 확인 필요':'동기화 대기';announce();}});
    requestBackground();soon(0);
  } catch(e) {
    problem='로컬 저장 공간 확인 필요';hooks.alert('브라우저 저장 공간을 확인한 뒤 다시 열어 주세요.');
  } finally {if(generation===epoch){hooks.busy(false);announce();}}
}
window.pixelAccount={
  init(callbacks){
    hooks=callbacks;
    hooks.busy(true);
    onAuthStateChanged(auth,u=>account(u));
    const wake=()=>{if(uid){queue(()=>refresh(uid)).catch(()=>{});soon(0);announce();}};
    window.addEventListener('online',wake);window.addEventListener('offline',announce);
    window.addEventListener('pageshow',wake);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();else if(uid)requestBackground();});
    if(channel) channel.onmessage=e=>{if(uid&&e.data===uid)wake();};
    navigator.serviceWorker?.addEventListener('message',e=>{if(e.data==='pixel-lab-sent')wake();});
  },
  edit, get uid(){return uid;}, get email(){return auth.currentUser?.email;}, get status(){return message();},
  login, async logout(){await writes;await signOut(auth);}, retry:upload
};
