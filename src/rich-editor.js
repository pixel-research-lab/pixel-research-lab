// Keep regular text entry native (including Korean IME). Only intercept image transfers.
const richEditor = (() => {
  const fieldNames={quest:'알아내고 싶은 질문',prompt:'질문',answer:'기억하고 싶은 답'};
  const starts={quest:'question',prompt:'review-question',answer:'review-answer'};
  const hints={quest:'무엇을 알아내고 싶나요?',prompt:'다음에 다시 풀어 볼 질문을 적어 보세요.',answer:'기억하고 싶은 답과 근거를 적어 보세요.'};
  const states=new WeakMap();
  const images='image/png,image/jpeg,image/webp,image/gif';
  const action=(key,text)=>'<button type="button" data-r-action="'+key+'">'+text+'</button>';
  function field(section){
    return '<fieldset class="rich-editor" data-rich-editor="'+section+'"><legend>'+fieldNames[section]+'</legend>'+
      '<div class="rich-tools">'+action('image','＋ 그림')+action('code','＋ 코드 블록')+
      '<small>그림을 끌어오거나 붙여넣으세요.</small></div><input type="file" hidden multiple accept="'+images+'" data-rich-picker>'+
      '<div class="rich-blocks"></div><p class="rich-error" aria-live="polite"></p></fieldset>';
  }
  function mount(root){
    const section=root.dataset.richEditor, host=root.querySelector('.rich-blocks'), input=root.querySelector('[data-rich-picker]'), error=root.querySelector('.rich-error');
    const staged=new Map();
    let cursor=null,active=null;
    const clearError=()=>{error.textContent='';};
    function paragraph(text=''){
      const p=document.createElement('div');
      p.className='rich-paragraph';p.contentEditable='plaintext-only';p.setAttribute('role','textbox');
      p.setAttribute('aria-multiline','true');p.setAttribute('aria-label',fieldNames[section]+' 문단');
      p.dataset.hint=hints[section];p.textContent=text;
      return p;
    }
    const first=paragraph();first.id=starts[section];host.append(first);
    function remember(){
      const sel=window.getSelection();if(!sel?.rangeCount)return;
      const range=sel.getRangeAt(0),p=sel.anchorNode?.parentElement?.closest('.rich-paragraph') ||
        (sel.anchorNode?.nodeType===1 && sel.anchorNode.closest('.rich-paragraph'));
      if(p && host.contains(p) && p.contains(range.startContainer) && p.contains(range.endContainer)){
        cursor=range.cloneRange();active=p;
      }
    }
    function focusAt(p,end=false){
      p.focus();const range=document.createRange();range.selectNodeContents(p);range.collapse(!end);
      const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);active=p;cursor=range.cloneRange();
    }
    function controls(){return '<div class="block-controls">'+action('up','위로')+action('down','아래로')+action('remove','삭제')+'</div>';}
    function figure(f){
      const block=document.createElement('figure'),id=crypto.randomUUID(),url=URL.createObjectURL(f);
      staged.set(id,{id,f,url});block.className='rich-piece rich-figure';block.dataset.ref=id;
      block.innerHTML='<div class="image-resize-area"></div><input type="text" class="rich-caption" maxlength="200" aria-label="그림 캡션" placeholder="캡션 추가 (선택) · 예: 그림 1. 실험 결과">'+controls();
      const img=document.createElement('img');
      img.alt='본문에 넣은 그림';img.src=url;
      imageResize.mount(block.querySelector('.image-resize-area'), img, undefined, percent=>{
        staged.get(id).widthPercent=percent;
      });
      return block;
    }
    function code(){
      const block=document.createElement('div');block.className='rich-piece rich-snippet';
      block.innerHTML='<div class="code-tools"><label>언어 <select aria-label="코드 언어">'+
        Object.entries(richBody.languages).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+
        '</select></label>'+controls()+'</div><div class="code-stack"><pre aria-hidden="true"><code></code></pre>'+
        '<textarea aria-label="코드 입력" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea></div>';
      const ta=block.querySelector('textarea'),pre=block.querySelector('pre'),sel=block.querySelector('select');
      const sync=()=>{pre.scrollLeft=ta.scrollLeft;pre.scrollTop=ta.scrollTop;};
      const paint=()=>{pre.firstChild.innerHTML=richBody.highlight(ta.value,sel.value)+'\n';
        ta.rows=Math.min(16,Math.max(4,ta.value.split('\n').length+1));sync();};
      ta.addEventListener('input',paint);ta.addEventListener('scroll',sync);sel.addEventListener('change',paint);
      paint();return block;
    }
    function point(x,y,p){
      const cp=document.caretPositionFromPoint?.(x,y);
      const r=cp?document.createRange():document.caretRangeFromPoint?.(x,y);
      if(cp){r.setStart(cp.offsetNode,cp.offset);r.collapse(true);}
      return r && p.contains(r.startContainer)?r:null;
    }
    function insert(nodes,target,where){
      clearError();
      const anchor=target && host.contains(target)?target:active && host.contains(active)?active:host.lastElementChild;
      const tail=paragraph();
      if(anchor.classList.contains('rich-paragraph')){
        const r=(where || cursor)?.cloneRange();
        if(r && anchor.contains(r.startContainer) && anchor.contains(r.endContainer)){
          r.deleteContents();r.setEnd(anchor,anchor.childNodes.length);tail.append(r.extractContents());
        }
      }
      anchor.after(...nodes.flatMap((node,i)=>i?[paragraph(),node]:[node]),tail);
      tail.dataset.hint='그림이나 코드 아래에서 계속 쓰세요.';
      focusAt(tail);
    }
    function addFiles(files,target,where){
      const fs=Array.from(files);if(!fs.length)return;
      if(fs.some(f=>!images.split(',').includes(f.type) || !f.size || f.size>labFiles.maxSize)){
        error.textContent='본문 그림은 20 MiB 이하 PNG, JPEG, WebP, GIF를 선택해 주세요. PDF는 별도 자료로 첨부할 수 있어요.';return;
      }
      insert(fs.map(figure),target,where);
    }
    root.addEventListener('focusin',e=>{if(host.contains(e.target)){active=e.target.closest('.rich-paragraph,.rich-piece');if(active?.classList.contains('rich-paragraph'))remember();}});
    host.addEventListener('keyup',remember);host.addEventListener('pointerup',remember);
    host.addEventListener('input',()=>{clearError();remember();});
    root.addEventListener('pointerdown',e=>{if(e.target.closest('.rich-tools') && document.activeElement?.classList.contains('rich-paragraph'))remember();});
    root.addEventListener('paste',e=>{
      const list=e.clipboardData?.files;if(!list?.length)return;
      e.preventDefault();remember();addFiles(list,e.target.closest('.rich-paragraph,.rich-piece'));
    });
    root.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';root.classList.add('over');}});
    root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget))root.classList.remove('over');});
    root.addEventListener('drop',e=>{
      root.classList.remove('over');if(!e.dataTransfer.files.length)return;
      e.preventDefault();const target=e.target.closest('.rich-paragraph,.rich-piece');
      addFiles(e.dataTransfer.files,target,target?.classList.contains('rich-paragraph')?point(e.clientX,e.clientY,target):null);
    });
    input.onchange=()=>{addFiles(input.files);input.value='';};
    root.addEventListener('click',e=>{
      const btn=e.target.closest('[data-r-action]');if(!btn)return;
      const act=btn.dataset.rAction,piece=btn.closest('.rich-piece');
      if(act==='image'){input.click();return;}
      if(act==='code'){const node=code();insert([node]);node.querySelector('textarea').focus();return;}
      if(!piece)return;
      if(act==='remove'){
        const entry=staged.get(piece.dataset.ref);
        if(entry){URL.revokeObjectURL(entry.url);staged.delete(entry.id);}
        const next=piece.nextElementSibling;piece.remove();
        if(next?.classList.contains('rich-paragraph'))focusAt(next);
      }else{
        // Ignore empty insertion lines when moving across neighboring content.
        let near=act==='up'?piece.previousElementSibling:piece.nextElementSibling;
        while(near?.classList.contains('rich-paragraph') && !near.innerText.trim())
          near=act==='up'?near.previousElementSibling:near.nextElementSibling;
        if(near){if(act==='up')near.before(piece);else near.after(piece);}
        if(!host.lastElementChild.classList.contains('rich-paragraph'))host.append(paragraph());
        btn.focus();
      }
    });
    function snapshot(){
      const blocks=[],files=[];
      for(const el of host.children){
        if(el.classList.contains('rich-paragraph')){
          const text=el.innerText;if(text.trim())blocks.push({type:'text',text});
        }else if(el.dataset.ref){
          const {id,f,widthPercent}=staged.get(el.dataset.ref);
          blocks.push({type:'image',ref:id,caption:el.querySelector('.rich-caption').value.trim()});
          files.push({id,f,section,inline:true,widthPercent});
        }else{
          const text=el.querySelector('textarea').value;
          if(text.trim())blocks.push({type:'code',lang:el.querySelector('select').value,text});
        }
      }
      if(!richBody.valid(blocks)){
        error.textContent=blocks.length?'본문이 너무 길어요. 글이나 코드 일부를 별도 자료로 나눠 주세요.':'한 줄의 내용이나 그림, 코드를 넣어 주세요.';
        root.scrollIntoView({block:'nearest'});first.focus();return null;
      }
      return {blocks,files,summary:richBody.summary(blocks)};
    }
    states.set(root,{snapshot,dispose:()=>{for(const {url} of staged.values())URL.revokeObjectURL(url);staged.clear();}});
  }
  function dispose(root){root.querySelectorAll('.rich-editor').forEach(el=>{states.get(el)?.dispose();states.delete(el);});}
  function get(root,section){return states.get(root.querySelector('[data-rich-editor="'+section+'"]')).snapshot();}
  return {field,mount,dispose,get};
})();
