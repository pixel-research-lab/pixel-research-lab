// Shared by the browser and its offline upload worker. Only metadata goes into quest saves.
globalThis.labFiles ??= (() => {
  const maxSize=20*1024*1024;
  const formats={'application/pdf':'PDF','image/png':'PNG','image/jpeg':'JPEG','image/webp':'WebP','image/gif':'GIF'};
  const accept=Object.keys(formats).join(',');
  const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
  let opening;
  function db(){
    if(!opening)opening=new Promise((resolve,reject)=>{
      const req=indexedDB.open('pixel-lab.materials.v1',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('originals',{keyPath:['owner','sha']});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>{opening=null;reject(req.error);};
    });
    return opening;
  }
  async function local(owner,sha){
    const d=await db();return new Promise((resolve,reject)=>{
      const req=d.transaction('originals').objectStore('originals').get([owner,sha]);
      req.onsuccess=()=>{
        const row=req.result;
        resolve(row?.blob ?? (row?.bytes ? new Blob([row.bytes],{type:row.type}) : undefined));
      };req.onerror=()=>reject(req.error);
    });
  }
  function writeOriginal(d,row){
    return new Promise((resolve,reject)=>{
      const tx=d.transaction('originals','readwrite');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('첨부 저장 공간을 확인해 주세요.'));
      tx.objectStore('originals').put(row);
    });
  }
  async function put(owner,sha,blob){
    const d=await db();
    try{await writeOriginal(d,{owner,sha,blob});}
    catch(error){
      // Some WebKit sessions accept bytes in IndexedDB but reject Blob objects.
      if(!['UnknownError','DataCloneError'].includes(error.name))throw error;
      await writeOriginal(d,{owner,sha,type:blob.type,bytes:await blob.arrayBuffer()});
    }
  }
  async function inspect(blob){
    if(!blob.size || blob.size>maxSize)throw Error('빈 파일 또는 20 MiB를 넘는 파일은 첨부할 수 없어요.');
    const bytes=new Uint8Array(await blob.arrayBuffer()),h=String.fromCharCode(...bytes.subarray(0,12));
    let type;
    if(h.startsWith('%PDF-'))type='application/pdf';
    else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))type='image/png';
    else if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255)type='image/jpeg';
    else if(h.startsWith('RIFF') && h.endsWith('WEBP'))type='image/webp';
    else if(h.startsWith('GIF87a')||h.startsWith('GIF89a'))type='image/gif';
    else throw Error('PDF, PNG, JPEG, WebP, GIF 파일을 선택해 주세요.');
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return {sha:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),type,size:blob.size};
  }
  function validMap(map){
    if(map===undefined)return true;
    return !!map && typeof map==='object' && !Array.isArray(map) && Object.entries(map).every(([id,r])=>
      uuid.test(id) && r?.id===id && typeof r.parent==='string' && /^[a-zA-Z0-9_-]+$/.test(r.parent) &&
      ['quest','prompt','answer','note'].includes(r.section) && typeof r.sha==='string' && /^[a-f0-9]{64}$/.test(r.sha) &&
      typeof r.name==='string' && r.name.length>0 && r.name.length<=255 && Object.hasOwn(formats,r.type) &&
      Number.isSafeInteger(r.size) && r.size>0 && r.size<=maxSize && (r.removed===undefined||r.removed===true));
  }
  function live(s){return Object.values(s.materials||{}).filter(r=>!r.removed);}
  async function read(owner,r){
    const cached=await local(owner,r.sha);
    if(cached)return cached;
    if(!window.pixelAccount?.uid || window.pixelAccount.uid!==owner || !navigator.onLine)
      throw Error('이 기기에 아직 원본이 없어요. 인터넷에 연결한 뒤 한 번 열어 주세요.');
    const blob=await window.pixelAccount.fetchFile(owner,r);
    const info=await inspect(blob);
    if(info.sha!==r.sha || info.type!==r.type || info.size!==r.size)throw Error('첨부 원본을 확인하지 못했어요. 다시 열어 주세요.');
    await put(owner,r.sha,blob);return blob;
  }
  function asBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
    });
  }
  async function archive(state,owner){
    const originals={};
    for(const r of live(state))if(!Object.hasOwn(originals,r.sha))originals[r.sha]=await asBase64(await read(owner,r));
    return originals;
  }
  async function restore(state,data,owner){
    const seen=new Map();
    for(const r of live(state)){
      if(seen.has(r.sha)){
        const first=seen.get(r.sha);
        if(first.type!==r.type || first.size!==r.size)throw Error('첨부 원본의 형식이나 크기가 일치하지 않아요.');
        continue;
      }
      seen.set(r.sha,r);
      const encoded=data?.[r.sha];
      if(typeof encoded!=='string'||encoded.length!==4*Math.ceil(r.size/3))throw Error('세이브에 첨부 원본이 빠져 있어요.');
      const raw=atob(encoded),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:r.type});
      const info=await inspect(blob);
      if(info.sha!==r.sha || info.type!==r.type || info.size!==r.size)throw Error('첨부 원본이 세이브 기록과 달라요.');
      await put(owner,r.sha,blob);
    }
  }
  async function copy(state,from,to){
    for(const r of new Map(live(state).map(x=>[x.sha,x])).values())await put(to,r.sha,await read(from,r));
  }
  return {accept,maxSize,formats,local,put,inspect,validMap,live,read,archive,restore,copy};
})();
