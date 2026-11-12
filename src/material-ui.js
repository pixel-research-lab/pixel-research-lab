function createMaterialUI({getState,owner,commit,esc,toast}){
  const files=globalThis.labFiles, viewer=document.getElementById('file-view');
  const names={quest:'연구 자료',prompt:'질문 자료',answer:'정답 자료'};
  let currentURL=null,viewTurn=0;
  const fmt=n=>n<1024*1024?Math.max(1,Math.round(n/1024))+' KiB':(n/(1024*1024)).toFixed(1)+' MiB';
  function picker(section){
    return '<label class="field file-field">'+names[section]+' <small>선택 · PDF / 이미지 · 파일당 20 MiB</small>'+
      '<input type="file" multiple data-file-picker="'+section+'" accept="'+files.accept+'"></label><div class="file-selection" aria-live="polite"></div>';
  }
  function section(parent,kind,editable=true){
    return '<section class="file-section" data-parent="'+esc(parent)+'" data-section="'+kind+'"><div class="file-items"></div>'+
      (editable?'<details class="file-edit"><summary>'+names[kind]+' 추가·관리</summary>'+picker(kind)+
        '<button type="button" class="secondary" data-files-add>첨부 저장</button><div class="file-removals"></div></details>':'')+'</section>';
  }
  function paint(root=document){
    for(const area of root.querySelectorAll('.file-section')){
      const list=files.live(getState()).filter(r=>r.parent===area.dataset.parent&&r.section===area.dataset.section&&!r.inline);
      area.querySelector('.file-items').innerHTML=list.map(r=>'<button type="button" class="file-chip" data-file-open="'+r.id+
        '"><b>'+files.formats[r.type]+'</b><span>'+esc(r.name)+'</span><small>'+fmt(r.size)+'</small></button>').join('');
      const removals=area.querySelector('.file-removals');
      if(removals)removals.innerHTML=list.map(r=>'<button type="button" class="textbtn" data-file-remove="'+r.id+'">'+esc(r.name)+' 연결 해제</button>').join('');
    }
  }
  // Keep object URLs only for the life of this dialog, including asynchronous reads.
  const painted=new Map();
  function clearInline(){for(const url of painted.values())if(url)URL.revokeObjectURL(url);painted.clear();}
  function paintInline(root=document){
    for(const fig of root.querySelectorAll('dialog[open] [data-rich-ref]')){
      const r=getState().materials?.[fig.dataset.richRef],slot=fig.querySelector('.rich-image');
      if(!r || r.removed || r.parent!==fig.dataset.parent || r.section!==fig.dataset.section || !r.type.startsWith('image/')){
        slot.textContent='그림 자료가 아직 없어요.';continue;
      }
      if(painted.has(fig)){
        imageResize.refresh(slot.querySelector('.image-resize-area'), r.widthPercent);
        continue;
      }
      const identity=owner();painted.set(fig,null);
      files.read(identity,r).then(blob=>{
        if(!painted.has(fig)||owner()!==identity||!fig.isConnected)return;
        const url=URL.createObjectURL(blob);painted.set(fig,url);
        const btn=document.createElement('button'),img=document.createElement('img');
        btn.type='button';btn.dataset.fileOpen=r.id;btn.title='그림 원본 보기';
        img.alt=fig.querySelector('figcaption')?.textContent || '본문 그림';img.src=url;btn.append(img);
        const area=document.createElement('div');area.className='image-resize-area';slot.replaceChildren(area);
        imageResize.mount(area,btn,getState().materials?.[r.id]?.widthPercent,percent=>commit(s=>{
          const ref=s.materials?.[r.id];
          if(owner()!==identity || !ref || ref.removed)throw Error('그림을 다시 열어 주세요.');
          s.materials={...s.materials,[ref.id]:{...ref,widthPercent:percent}};
        }));
      }).catch(err=>{
        if(!painted.has(fig)||owner()!==identity||!fig.isConnected)return;
        const retry=document.createElement('button');retry.type='button';retry.className='rich-retry';retry.textContent='그림 다시 불러오기';
        retry.onclick=()=>{painted.delete(fig);paintInline();};slot.replaceChildren(err.message+' ',retry);
      });
    }
  }
  // Capture file choices and owning account before the first await.
  async function collect(root,parent,identity,inlineFiles=[]){
    const selected=Array.from(root.querySelectorAll('[data-file-picker]')).flatMap(input=>
      Array.from(input.files,f=>({f,section:input.dataset.filePicker})));
    const refs={};
    for(const {f,section,id=crypto.randomUUID(),inline,widthPercent} of [...selected,...inlineFiles]){
      const info=await files.inspect(f);
      if(inline && !info.type.startsWith('image/'))throw Error('본문에는 그림 파일만 넣을 수 있어요.');
      if(owner()!==identity)throw Error('계정이 바뀌었어요. 다시 선택해 주세요.');
      await files.put(identity,info.sha,f.slice(0,f.size,info.type));
      refs[id]={id,parent,section,...(inline?{inline:true}:{}),...(widthPercent!==undefined?{widthPercent}:{}),name:inline?'본문 그림.'+files.formats[info.type].toLowerCase():f.name.slice(0,255)||files.formats[info.type],...info};
    }
    return refs;
  }
  function attach(s,refs){
    if(!Object.keys(refs).length)return;
    s.materials={...s.materials,...refs};
  }
  function clearURL(){if(currentURL)URL.revokeObjectURL(currentURL);currentURL=null;}
  function close(){viewTurn++;if(viewer.open)viewer.close();clearURL();viewer.querySelector('.file-display').replaceChildren();}
  viewer.querySelector('.closebtn').onclick=close;
  viewer.addEventListener('close',()=>{if(!viewer.open)close();});
  async function open(id){
    const r=getState().materials?.[id];if(!r||r.removed)return;
    const identity=owner(),turn=++viewTurn;clearURL();
    viewer.querySelector('h2').textContent=r.name;
    const display=viewer.querySelector('.file-display'),link=viewer.querySelector('a');
    display.textContent='원본 여는 중…';link.hidden=true;link.removeAttribute('href');
    if(!viewer.open)viewer.showModal();
    try{
      const blob=await files.read(identity,r);
      if(turn!==viewTurn||owner()!==identity||!viewer.open)return;
      currentURL=URL.createObjectURL(blob);link.href=currentURL;link.download=r.name;link.hidden=false;
      const el=document.createElement(r.type==='application/pdf'?'iframe':'img');
      if(el.tagName==='IFRAME')el.title=r.name;else el.alt=r.name;
      el.src=currentURL;display.replaceChildren(el);
    }catch(err){if(turn===viewTurn)display.textContent=err.message||'첨부 자료를 열 수 없어요.';}
  }
  document.addEventListener('change',e=>{
    const input=e.target.closest('[data-file-picker]');if(!input)return;
    const note=input.closest('label').nextElementSibling;
    note.textContent=Array.from(input.files,f=>f.name+' ('+fmt(f.size)+')').join(' · ');
  });
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-file-open],[data-file-remove],[data-files-add]');if(!button)return;
    if(button.dataset.fileOpen){open(button.dataset.fileOpen);return;}
    const identity=owner(),area=button.closest('.file-section');
    button.disabled=true;
    try{
      if(button.dataset.fileRemove){
        const id=button.dataset.fileRemove;
        await commit(s=>{const r=s.materials?.[id];if(r)s.materials={...s.materials,[id]:{...r,removed:true}};});
      }else{
        const refs=await collect(area,area.dataset.parent,identity);
        if(!Object.keys(refs).length)throw Error('첨부할 파일을 선택해 주세요.');
        if(owner()!==identity || !area.isConnected || !area.closest('dialog[open]'))return;
        await commit(s=>attach(s,refs));
        area.querySelector('input').value='';area.querySelector('.file-selection').textContent='';
      }
      if(owner()===identity){paint();toast(button.dataset.fileRemove?'자료 연결을 해제했어요.':'첨부 자료를 저장했어요.');}
    }catch(err){toast(err.message||'첨부를 저장할 수 없어요.');}
    finally{button.disabled=false;}
  });
  return {picker,section,collect,attach,paint,paintInline,clearInline,close};
}
