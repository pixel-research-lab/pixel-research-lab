// A body contains small, ordered blocks. Image bytes travel through labFiles.
const richBody = (() => {
  const languages = {python:'Python', bash:'Bash', json:'JSON'};
  const escape = text => String(text).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keywords = {
    python:'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield True False None',
    bash:'if then else elif fi for in do done while until case esac function return local export readonly break continue',
    json:'true false null'
  };
  // Strings and comments are consumed as whole tokens; raw source never becomes markup.
  const scanners = {
    python:/("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|#[^\n]*|\b[A-Za-z_]\w*|\b\d+(?:\.\d+)?)/g,
    bash:/("(?:\\.|[^"\\])*"?|'[^']*'?|#[^\n]*|\$\{[^}\n]*\}|\$[\w@#?$!*-]+|\b[A-Za-z_]\w*|\b\d+)/g,
    json:/("(?:\\.|[^"\\\n])*"?|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  };
  function highlight(source,lang){
    const words=new Set(keywords[lang].split(' ')), re=new RegExp(scanners[lang]);
    let html='',cursor=0;
    for(const m of source.matchAll(re)){
      const t=m[0];html+=escape(source.slice(cursor,m.index));cursor=m.index+t.length;
      const kind=t[0]==='#'?'comment':/^["']/.test(t)?(lang==='json' && /^\s*:/.test(source.slice(cursor))?'key':'string'):
        t[0]==='$'?'var':/^-?\d/.test(t)?'num':words.has(t)?'keyword':null;
      html+=kind?'<span class="tok-'+kind+'">'+escape(t)+'</span>':escape(t);
    }
    return html+escape(source.slice(cursor));
  }
  function valid(body){
    return Array.isArray(body) && body.length>0 && body.length<=160 &&
      body.every(b=>b && (b.type==='text' && typeof b.text==='string' && !!b.text.trim() ||
        b.type==='code' && Object.hasOwn(languages,b.lang) && typeof b.text==='string' && !!b.text.trim() ||
        b.type==='image' && typeof b.ref==='string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(b.ref) &&
        typeof b.caption==='string' && b.caption.length<=200)) &&
      new TextEncoder().encode(JSON.stringify(body)).length<=32000;
  }
  function summary(blocks){
    const text=blocks.find(b=>b.type==='text')?.text.trim().split('\n')[0] ||
      blocks.find(b=>b.type==='image' && b.caption)?.caption || (blocks.some(b=>b.type==='code')?'코드 살펴보기':'그림 살펴보기');
    return Array.from(text).length>90?Array.from(text).slice(0,89).join('')+'…':text;
  }
  function view(blocks,parent,section){
    if(!valid(blocks))return '';
    return '<div class="rich-read">'+blocks.map(b=>{
      if(b.type==='text')return '<p>'+escape(b.text)+'</p>';
      if(b.type==='code')return '<div class="rich-snippet"><small>'+languages[b.lang]+'</small><pre><code>'+highlight(b.text,b.lang)+'</code></pre></div>';
      return '<figure class="rich-figure" data-rich-ref="'+b.ref+'" data-parent="'+escape(parent)+'" data-section="'+section+'"><div class="rich-image" role="status">그림 불러오는 중…</div>'+
        (b.caption?'<figcaption>'+escape(b.caption)+'</figcaption>':'')+'</figure>';
    }).join('')+'</div>';
  }
  return {languages,highlight,valid,summary,view};
})();
