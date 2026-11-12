const libraryData = (() => {
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
  const text = (value,max) => typeof value==='string' && value.length<=max;
  function link(value,zotero=false){
    if(!text(value,2048))return '';
    try{
      const url=new URL(value);
      if(url.username || url.password)return '';
      if(['https:','http:'].includes(url.protocol))return url.href;
      if(zotero && /^zotero:\/\/(?:select|open-pdf)\/(?:library|groups\/\d+)\/items\/[A-Z0-9]{8}(?:\?[^\s]*)?$/i.test(value))return value;
    }catch{}
    return '';
  }
  function entries(data,check,pattern=uuid){
    return data===undefined || (data!==null && typeof data==='object' && !Array.isArray(data) &&
      Object.entries(data).every(([id,row])=>pattern.test(id) && row && typeof row==='object' && check(row)));
  }
  const time=value=>Number.isSafeInteger(value) && value>=0;
  const title=value=>text(value,180) && !!value.trim();
  function valid(s){
    return entries(s.books,b=>b.removed===true || (title(b.title) && (!b.url || !!link(b.url,true)) &&
      (!b.notesUrl || !!link(b.notesUrl)) && ['논문','자료'].includes(b.type) && time(b.created))) &&
      entries(s.bookNotes,n=>n.removed===true || (uuid.test(n.book) && text(n.question,500) && richBody.valid(n.body) && time(n.at))) &&
      entries(s.reading,r=>text(r.place,180) && ['읽는 중','다 읽음'].includes(r.status) && time(r.at)) &&
      entries(s.roomLinks,r=>r.removed===true || (title(r.name) && !!link(r.url))) &&
      entries(s.roomNotices,n=>notice(n) && typeof n.read==='boolean',/^[A-Za-z0-9_-]{1,100}$/) &&
      (s.reviews===undefined || (Array.isArray(s.reviews) && s.reviews.every(c=>c && (c.sourceBook===undefined || uuid.test(c.sourceBook)))));
  }
  function notice(n){
    return n && ['channel','dm'].includes(n.kind) && text(n.label,120) && !!n.label.trim() && time(n.at) &&
      (n.sample===true ? n.url==='' : /^https:\/\/app\.slack\.com\/client\/[A-Z0-9]+\/[A-Z0-9]+(?:\/[0-9.]+)?$/.test(n.url));
  }
  return {link,valid,notice};
})();
