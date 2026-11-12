function createBookshelf({get,show,commit,toast,owner,saveWithFiles,newReview,esc}){
  const $=id=>document.getElementById(id);
  const button=(label,action,id='',style='secondary')=>'<button type="button" class="'+style+'" data-book-action="'+action+'" data-id="'+esc(id)+'">'+esc(label)+'</button>';
  const anchor=(label,url)=>url?'<a class="panel-action external" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
  const book=id=>{const value=get().books?.[id];return value && !value.removed?value:null;};
  const progress=id=>get().reading?.[id] || {place:'',status:'읽는 중',at:0};
  const liveNotes=id=>Object.entries(get().bookNotes||{}).filter(([,n])=>!n.removed && n.book===id).sort((a,b)=>b[1].at-a[1].at);
  function list(){
    const items=Object.entries(get().books||{}).filter(([,b])=>!b.removed)
      .sort(([a,x],[b,y])=>(progress(b).at||y.created)-(progress(a).at||x.created));
    const recent=items.filter(([id])=>progress(id).at && progress(id).status==='읽는 중')[0];
    show('연구실','내 책장','<div class="shelf-view"><div class="shelf-actions">'+button('＋ 자료 꽂기','add','','primary')+'</div>'+
      (recent?'<div class="resume-book"><small>이어서 읽기</small>'+button(recent[1].title+(progress(recent[0]).place?' · '+progress(recent[0]).place:''),'open',recent[0],'textbtn')+'</div>':'')+
      (items.length?items.map(([id,b])=>'<button class="book-row" data-book-action="open" data-id="'+esc(id)+'"><span class="book-spine" aria-hidden="true"></span><span><small>'+b.type+' · '+progress(id).status+'</small><strong>'+esc(b.title)+'</strong></span><span aria-hidden="true">›</span></button>').join(''):
       '<p>읽을 논문이나 정리한 자료를 책장에 꽂아 보세요.</p>')+'</div>');
  }
  function source(b){
    return '<div class="book-links"><span>출처 · '+esc(b.title)+'</span>'+anchor('원문 열기',libraryData.link(b.url,true))+anchor('정리 글',libraryData.link(b.notesUrl))+'</div>';
  }
  function detail(id,touch=false){
    const b=book(id);if(!b){list();return;}
    const r=progress(id);
    if(touch && (!r.at || Date.now()-r.at>1000)){
      commit(s=>{if(!s.books?.[id] || s.books[id].removed)return;
        s.reading={...s.reading,[id]:{...progress(id),at:Date.now()}};}).catch(e=>toast(e.message));
    }
    const notes=liveNotes(id);
    show('내 책장 · '+b.type,b.title,'<div class="shelf-view"><div class="book-links">'+anchor('원문 열기',libraryData.link(b.url,true))+
      anchor('정리 글',libraryData.link(b.notesUrl))+button('자료 정보 수정','edit',id,'textbtn')+'</div>'+
      '<form id="reading-form" class="reading-form"><label class="field">읽던 위치<input name="place" maxlength="180" placeholder="예: 5쪽, 그림 3" value="'+esc(r.place)+'"></label>'+
      '<label class="field">상태<select name="status"><option>읽는 중</option><option'+(r.status==='다 읽음'?' selected':'')+'>다 읽음</option></select></label>'+
      '<button type="submit" class="secondary">책갈피 저장</button></form>'+
      '<div class="shelf-actions"><h3>연구 메모</h3>'+button('＋ 메모 쓰기','new-note',id)+'</div>'+
      notes.map(([key,n])=>'<article class="book-note">'+richBody.view(n.body,key,'note')+(n.question?'<p><b>남긴 질문</b> '+esc(n.question)+'</p>':'')+
        '<div class="book-links">'+button('복습 질문으로 만들기','review',key)+button('메모 수정','edit-note',key,'textbtn')+'</div></article>').join('')+
      '<div class="actions">'+button('책장으로','list')+'</div></div>');
    const form=$('reading-form');
    form.onsubmit=async e=>{
      e.preventDefault();const place=form.elements.place.value.trim(),status=form.elements.status.value;
      await submit(form,s=>{requireBook(s,id);s.reading={...s.reading,[id]:{place,status,at:Date.now()}};},()=>{detail(id);toast('책갈피를 저장했어요.');});
    };
  }
  function requireBook(s,id){if(!s.books?.[id] || s.books[id].removed)throw Error('자료가 책장에서 삭제됐어요.');}
  async function submit(form,change,after){
    const who=owner();if(form.inert)return;form.inert=true;
    try{await commit(change);if(form.isConnected && who===owner())after();}
    catch(e){toast(e.message);}finally{form.inert=false;}
  }
  function bookForm(id){
    const b=book(id) || {title:'',url:'',notesUrl:'',type:'논문'};
    show('내 책장',id?'자료 정보 수정':'자료 꽂기','<form id="book-form"><label class="field">제목<input name="title" maxlength="180" required value="'+esc(b.title)+'"></label>'+
      '<label class="field">종류<select name="type"><option>논문</option><option'+(b.type==='자료'?' selected':'')+'>자료</option></select></label>'+
      '<label class="field">원문 또는 Zotero 링크<input name="url" maxlength="2048" placeholder="https://… 또는 zotero://…" value="'+esc(b.url)+'"></label>'+
      '<label class="field">Notion · 블로그 등 정리 글<input name="notesUrl" maxlength="2048" placeholder="https://…" value="'+esc(b.notesUrl)+'"></label>'+
      '<div class="actions"><button type="submit" class="primary">책장에 저장</button>'+button('취소',id?'open':'list',id)+(id?button('자료 삭제','remove',id,'textbtn'):'')+'</div></form>');
    const form=$('book-form');form.elements.title.focus();
    form.onsubmit=async e=>{
      e.preventDefault();const fields=form.elements,title=fields.title.value.trim();if(!title)return;
      const url=libraryData.link(fields.url.value.trim(),true),notesUrl=libraryData.link(fields.notesUrl.value.trim());
      for(const [el,val] of [[fields.url,url],[fields.notesUrl,notesUrl]]){
        if(el.value.trim() && !val){el.setCustomValidity('열 수 있는 링크를 입력해 주세요.');el.reportValidity();el.oninput=()=>el.setCustomValidity('');return;}
      }
      const key=id||crypto.randomUUID(),type=fields.type.value;
      await submit(form,s=>{if(id)requireBook(s,id);s.books={...s.books,[key]:{title,type,url,notesUrl,created:b.created||Date.now()}};},()=>detail(key,true));
    };
  }
  function noteForm(bookId,noteId){
    if(!book(bookId))return list();
    const note=get().bookNotes?.[noteId],key=noteId||crypto.randomUUID(),who=owner();
    show(book(bookId).title,note?'메모 수정':'연구 메모 쓰기','<form id="shelf-note">'+richEditor.field('note')+
      '<label class="field">남겨 둘 질문 <small>선택</small><textarea name="question" maxlength="500" placeholder="다음에 스스로 답해 보고 싶은 질문">'+esc(note?.question||'')+'</textarea></label>'+
      '<div class="actions"><button class="primary" type="submit">메모 저장</button>'+button('취소','open',bookId)+'</div></form>');
    const form=$('shelf-note');
    if(note)richEditor.restore(form.querySelector('[data-rich-editor]'),note.body,ref=>{
      const r=get().materials?.[ref];
      return {widthPercent:r?.widthPercent,read:()=>r && !r.removed && r.parent===key && r.section==='note'?labFiles.read(who,r):Promise.reject(Error('그림 자료 없음'))};
    });
    form.onsubmit=async e=>{
      e.preventDefault();const doc=richEditor.get(form,'note');if(!doc)return;
      const question=form.elements.question.value.trim();
      await saveWithFiles(form,key,s=>{
        requireBook(s,bookId);
        if(note && JSON.stringify(s.bookNotes?.[key])!==JSON.stringify(note))throw Error('다른 곳에서 메모를 수정했어요. 다시 열어 주세요.');
        s.bookNotes={...s.bookNotes,[key]:{book:bookId,at:Date.now(),question,body:doc.blocks}};
        const kept=new Set(doc.blocks.filter(b=>b.type==='image').map(b=>b.ref));
        s.materials={...s.materials};
        for(const r of Object.values(s.materials)){
          if(r.parent!==key || r.section!=='note' || r.removed)continue;
          if(!kept.has(r.id))s.materials[r.id]={...r,removed:true};
          else if(doc.widths[r.id]!==undefined)s.materials[r.id]={...r,widthPercent:doc.widths[r.id]};
        }
      },()=>detail(bookId),doc.files);
    };
  }
  function remove(id){
    const b=book(id);if(!b)return;
    show('내 책장','자료를 삭제할까요?','<form id="remove-book"><p>'+esc(b.title)+' 자료와 메모를 책장에서 지웁니다. 여기서 만든 복습 카드는 계속 풀 수 있어요.</p><div class="actions"><button type="submit" class="secondary">삭제</button>'+button('취소','open',id)+'</div></form>');
    const form=$('remove-book');form.onsubmit=e=>{e.preventDefault();submit(form,s=>{
      s.books={...s.books,[id]:{removed:true}};s.bookNotes={...s.bookNotes};s.materials={...s.materials};
      for(const [key,n] of Object.entries(s.bookNotes))if(n.book===id){
        s.bookNotes[key]={removed:true};
        for(const r of Object.values(s.materials))if(r.parent===key)s.materials[r.id]={...r,removed:true};
      }
    },list);};
  }
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-book-action]');if(!target)return;
    const id=target.dataset.id,act=target.dataset.bookAction;
    if(act==='list')list();
    if(act==='add'||act==='edit')bookForm(id);
    if(act==='open')detail(id,true);
    if(act==='remove')remove(id);
    if(act==='new-note')noteForm(id);
    const n=get().bookNotes?.[id];
    if(act==='edit-note' && n && !n.removed)noteForm(n.book,id);
    if(act==='review' && n && book(n.book)){
      const question=n.question || n.body.find(b=>b.type==='text')?.text.split('\n').find(line=>/[?？]/.test(line)) || '';
      newReview({id:n.book,title:book(n.book).title,question});
    }
  });
  return {list,source};
}
