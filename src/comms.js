function createComms({get,show,commit,toast,owner,esc}){
  const $=id=>document.getElementById(id);
  const local='http://127.0.0.1:19387';
  let popup=null,nonce='',identity=null,active=false,serial=Promise.resolve(),relayStatus='';
  const button=(label,act,id='',style='secondary')=>'<button type="button" class="'+style+'" data-comms="'+act+'" data-id="'+esc(id)+'">'+esc(label)+'</button>';
  const unread=()=>Object.values(get().roomNotices||{}).filter(n=>!n.read).length;
  const sessionKey='pixel-slack-popup:'+location.pathname;
  const toggle=$('home-slack-toggle');
  function rememberSession(value){
    try{if(value)sessionStorage.setItem(sessionKey,JSON.stringify(value));else sessionStorage.removeItem(sessionKey);}catch{}
  }
  function resumeSession(event){
    if(popup||!event.source||!event.data?.nonce)return;
    let saved;try{saved=JSON.parse(sessionStorage.getItem(sessionKey));}catch{}
    if(saved?.nonce!==event.data.nonce || saved?.identity!==owner())return;
    popup=event.source;identity=saved.identity;nonce=saved.nonce;
  }
  function disconnect(){
    rememberSession(null);
    nonce='';active=false;identity=null;relayStatus='';
    if(popup && !popup.closed)popup.close();
    popup=null;
  }
  function paintHome(){
    const on=get().homeSlack===true,card=$('home-slack-card'),line=$('home-slack-text');
    toggle.checked=on;card.hidden=!on;
    const fresh=on?Object.entries(get().roomNotices||{}).filter(([,n])=>!n.read).sort((a,b)=>b[1].at-a[1].at):[];
    const [id,n]=fresh[0]||[];
    const text=n?(n.sample?'예시 · ':'')+n.label+(n.kind==='dm'?'님에게 Slack DM이 왔어요.':'에 새 글이 올라왔어요.')+(fresh.length>1?' · 미확인 '+fresh.length+'건':''):
      active?(relayStatus==='Slack 알림 수신 중'?'새 알림이 없어요.':relayStatus):popup?'수신기 연결을 기다리고 있어요.':'새 알림을 받으려면 수신기를 연결하세요.';
    if(line.textContent!==(on?text:''))line.textContent=on?text:'';
    card.toggleAttribute('data-unread',!!n);
    const openLink=$('home-slack-open'),read=$('home-slack-read');
    openLink.hidden=!n?.url;read.hidden=!n;
    if(n?.url)openLink.href=n.url;else openLink.removeAttribute('href');
    openLink.dataset.id=read.dataset.id=id||'';
    $('home-slack-connect').hidden=active;
  }
  toggle.addEventListener('change',async()=>{
    const enabled=toggle.checked;toggle.disabled=true;
    try{await commit(s=>{s.homeSlack=enabled;});}
    catch(e){toast(e.message);}
    finally{toggle.disabled=false;paintHome();}
  });
  function paint(){
    if(popup && (identity!==owner() || popup.closed))disconnect();
    const count=unread();$('notice-light').hidden=!count;$('notice-count').textContent=count?' · '+count:'';
    paintHome();if($('comms-inbox'))paintInbox();
  }
  function paintInbox(){
    const rows=Object.entries(get().roomNotices||{}).sort((a,b)=>b[1].at-a[1].at).slice(0,50);
    $('comms-inbox').innerHTML=rows.map(([id,n])=>'<div class="notice-row"><span><small>'+ (n.sample?'예시 · ':'')+(n.read?'확인함':'새 알림')+' · '+
      esc(new Date(n.at).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))+'</small>'+
      esc(n.label)+(n.kind==='dm'?'님에게 DM이 왔어요.':'에 새 글이 올라왔어요.')+'</span>'+
      (n.url?'<a href="'+esc(n.url)+'" data-comms="read" data-id="'+esc(id)+'" target="_blank" rel="noopener noreferrer">Slack 열기 ↗</a>':
      n.read?'':button('확인','read',id,'textbtn'))+'</div>').join('')||'<p class="muteline">아직 받은 알림이 없어요.</p>';
    const status=$('relay-state');
    if(status)status.textContent=relayStatus || (active?'Slack 수신기 연결됨':popup?'수신기 연결을 기다리고 있어요.':'');
  }
  function open(){
    const links=Object.entries(get().roomLinks||{}).filter(([,r])=>!r.removed);
    show('컴퓨터','연구실 소통 창','<div class="shelf-view"><div class="shelf-actions"><h3>바로가기</h3>'+button('＋ 바로가기','add')+'</div>'+
      links.map(([id,r])=>'<div class="link-row"><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.name)+' ↗</a>'+button('수정','edit',id,'textbtn')+'</div>').join('')+
      (!links.length?'<p>Slack 채널, 카카오톡 오픈채팅이나 게시판 주소를 추가하세요.</p>':'')+
      '<div class="shelf-actions"><h3>Slack 알림</h3>'+button(active?'연결 끊기':'수신기 연결',active?'disconnect':'connect')+'</div>'+
      '<p class="muteline" id="relay-state"></p><div id="comms-inbox"></div><div class="actions">'+
      (studio.previewCredit?button('예시 알림 받아보기','sample','','textbtn'):'')+button('연결 방법','help','','textbtn')+'</div></div>');
    paint();
  }
  function form(id,initial){
    const r=get().roomLinks?.[id]||initial||{name:'',url:''};
    show('소통 창',id?'바로가기 수정':'바로가기 추가','<form id="room-link"><label class="field">이름<input name="name" required maxlength="180" value="'+esc(r.name)+'" placeholder="예: 랩미팅 공지"></label>'+
      '<label class="field">주소<input type="url" name="url" required maxlength="2048" value="'+esc(r.url)+'" placeholder="https://…"></label>'+
      '<div class="actions"><button type="submit" class="primary">저장</button>'+button('취소','open')+(id?button('삭제','remove',id,'textbtn'):'')+'</div></form>');
    const f=$('room-link');f.onsubmit=async e=>{
      e.preventDefault();const name=f.elements.name.value.trim(),url=libraryData.link(f.elements.url.value.trim());
      if(!name||!url){toast('이름과 웹 주소를 확인해 주세요.');return;}
      const who=owner(),key=id||crypto.randomUUID();f.inert=true;
      try{await commit(s=>{if(s.roomLinks?.[key]?.removed)throw Error('삭제된 바로가기예요.');s.roomLinks={...s.roomLinks,[key]:{name,url}};});
        if(f.isConnected&&who===owner())open();
      }catch(e){toast(e.message);}finally{f.inert=false;}
    };
  }
  function receipts(rows,who){
    const fresh=rows.filter(r=>/^[A-Za-z0-9_-]{1,100}$/.test(r.id) && libraryData.notice(r) && !Object.hasOwn(get().roomNotices||{},r.id));
    if(!fresh.length)return;
    return commit(s=>{
      if(owner()!==who)throw Error('계정이 바뀌었어요.');
      s.roomNotices={...s.roomNotices};
      for(const {id,kind,label,url,at,sample} of fresh){
        if(!s.roomNotices[id])s.roomNotices[id]={kind,label,url,at,read:false,...(sample===true?{sample:true}:{})};
      }
    });
  }
  function connect(){
    if(popup && !popup.closed){popup.focus();return;}
    nonce=crypto.randomUUID();identity=owner();
    const fragment=new URLSearchParams({origin:location.origin,nonce});
    popup=window.open(local+'/pair?open='+Date.now()+'#'+fragment,'pixelRelay','popup,width=510,height=480');
    if(!popup){toast('수신기 연결 창을 열 수 있게 팝업을 허용해 주세요.');return;}
    rememberSession({nonce,identity});paint();
  }
  window.addEventListener('focus',paint);
  window.addEventListener('message',e=>{
    if(e.origin!==local || e.data?.type!=='pixel-notices')return;
    resumeSession(e);
    if(!popup || e.source!==popup || !nonce || e.data?.nonce!==nonce || identity!==owner())return;
    const msg=e.data;if(msg.type!=='pixel-notices' || !Array.isArray(msg.rows))return;
    const who=identity,ticket=nonce,first=!active;
    active=true;relayStatus=msg.connected?'Slack 알림 수신 중':'수신기는 연결됨 · Slack 연결 대기';
    serial=serial.then(async()=>{if(ticket!==nonce || who!==owner())return;
      const incoming=msg.rows.slice(-80).filter(r=>r && !r.sample);
      const latest=incoming.filter(r=>libraryData.notice(r) && !Object.hasOwn(get().roomNotices||{},r.id)).at(-1);
      await receipts(incoming,who);
      if(get().homeSlack && latest && ticket===nonce && Date.now()-latest.at<60000)toast(latest.label+(latest.kind==='dm'?'님에게 Slack DM이 왔어요.':'에 새 글이 올라왔어요.'));
      if(ticket===nonce)paintHome();
      if(ticket===nonce && $('comms-inbox')){if(first)open();else paintInbox();}
    }).catch(e=>toast(e.message));
  });
  function help(){
    show('소통 창','Slack 연결 방법','<p>컴퓨터에서 픽셀 연구실 Slack 수신기를 실행하고, 수신기 설정에서 테스트 채널을 지정하세요. 채널에 앱을 초대하면 새 공지를 받을 수 있어요.</p>'+
      '<p>이 창으로 돌아와 <b>수신기 연결</b>을 누르고 수신기에 표시된 연결 코드를 입력하세요. 연구실과 연결 창을 열어 둔 동안 불이 들어와요.</p>'+
      '<p><a href="https://github.com/pixel-research-lab/pixel-research-lab/blob/feature/bookshelf-and-comms/slack-bridge/README.md" target="_blank" rel="noopener noreferrer">Slack 앱 생성 및 수신기 설정 ↗</a></p>'+
      '<div class="actions">'+button('수신기 연결','connect')+button('소통 창','open')+'</div>');
  }
  document.addEventListener('click',async e=>{
    const el=e.target.closest('[data-comms]');if(!el)return;
    const act=el.dataset.comms,id=el.dataset.id,who=owner();
    try{
      if(act==='open')open();
      if(act==='help')help();
      if(act==='home-connect')connect();
      if(act==='add' || act==='edit')form(id);
      if(act==='connect'){if(!$('comms-inbox'))open();connect();}
      if(act==='disconnect'){disconnect();open();}
      if(act==='sample' && studio.previewCredit)await receipts([{id:crypto.randomUUID(),kind:'channel',sample:true,label:'#lab-updates',url:'',at:Date.now()}],who);
      if(act==='remove'){await commit(s=>{s.roomLinks={...s.roomLinks,[id]:{removed:true}};});if(who===owner())open();}
      if(act==='read')await commit(s=>{const n=s.roomNotices?.[id];if(n)s.roomNotices={...s.roomNotices,[id]:{...n,read:true}};});
    }catch(error){toast(error.message);}
  });
  return {open,paint,form,disconnect};
}
