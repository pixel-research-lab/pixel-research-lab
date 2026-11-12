function createComms({get,show,commit,toast,owner,esc}){
  const $=id=>document.getElementById(id);
  const button=(label,act,id='',style='secondary')=>'<button type="button" class="'+style+'" data-comms="'+act+'" data-id="'+esc(id)+'">'+esc(label)+'</button>';
  const unread=()=>Object.values(get().roomNotices||{}).filter(n=>!n.read).length;
  const toggle=$('home-slack-toggle');
  const receiver=createSlackReceiver({owner,onChange:()=>{paintHome();paintStatus();},onRows:async(rows,who,stillCurrent)=>{
    const incoming=rows.slice(-80).filter(r=>r && !r.sample);
    const latest=incoming.filter(r=>libraryData.notice(r) && !Object.hasOwn(get().roomNotices||{},r.id)).sort((a,b)=>b.at-a.at)[0];
    await receipts(incoming,who,stillCurrent);
    if(stillCurrent() && get().homeSlack && latest && Date.now()-latest.at<60000)toast(latest.label+(latest.kind==='dm'?'님에게 Slack DM이 왔어요.':'에 새 글이 올라왔어요.'));
  }});
  function paintHome(){
    const on=get().homeSlack===true,card=$('home-slack-card'),line=$('home-slack-text');
    toggle.checked=on;card.hidden=!on;
    const fresh=on?Object.entries(get().roomNotices||{}).filter(([,n])=>!n.read).sort((a,b)=>b[1].at-a[1].at):[];
    const [id,n]=fresh[0]||[];
    const text=n?(n.sample?'예시 · ':'')+n.label+(n.kind==='dm'?'님에게 Slack DM이 왔어요.':'에 새 글이 올라왔어요.')+(fresh.length>1?' · 미확인 '+fresh.length+'건':''):
      (receiver.status==='Slack 알림 수신 중'?'새 알림이 없어요.':receiver.status||'새 알림을 받으려면 수신기를 연결하세요.');
    if(line.textContent!==(on?text:''))line.textContent=on?text:'';
    card.toggleAttribute('data-unread',!!n);
    const openLink=$('home-slack-open'),read=$('home-slack-read');
    openLink.hidden=!n?.url;read.hidden=!n;
    if(n?.url)openLink.href=n.url;else openLink.removeAttribute('href');
    openLink.dataset.id=read.dataset.id=id||'';
    const connectButton=$('home-slack-connect');connectButton.hidden=receiver.paired&&!receiver.retrying;
    connectButton.textContent=receiver.retrying?'다시 연결':'수신기 연결';
  }
  toggle.addEventListener('change',async()=>{
    const enabled=toggle.checked;toggle.disabled=true;
    try{await commit(s=>{s.homeSlack=enabled;});}
    catch(e){toast(e.message);}
    finally{toggle.disabled=false;paintHome();}
  });
  function paint(){
    receiver.restore();
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
    paintStatus();
  }
  function paintStatus(){
    const status=$('relay-state'),action=$('relay-action');
    if(status)status.textContent=receiver.status;
    if(action){action.dataset.comms=receiver.paired?'disconnect':'connect';action.textContent=receiver.paired?'이 브라우저 연결 끊기':'수신기 연결';}
  }
  function open(){
    const links=Object.entries(get().roomLinks||{}).filter(([,r])=>!r.removed);
    show('컴퓨터','연구실 소통 창','<div class="shelf-view"><div class="shelf-actions"><h3>바로가기</h3>'+button('＋ 바로가기','add')+'</div>'+
      links.map(([id,r])=>'<div class="link-row"><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.name)+' ↗</a>'+button('수정','edit',id,'textbtn')+'</div>').join('')+
      (!links.length?'<p>Slack 채널, 카카오톡 오픈채팅이나 게시판 주소를 추가하세요.</p>':'')+
      '<div class="shelf-actions"><h3>Slack 알림</h3><button type="button" class="secondary" id="relay-action" data-comms="connect">수신기 연결</button></div>'+
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
  function receipts(rows,who,stillCurrent=()=>true){
    const fresh=rows.filter(r=>/^[A-Za-z0-9_-]{1,100}$/.test(r.id) && libraryData.notice(r) && !Object.hasOwn(get().roomNotices||{},r.id));
    if(!fresh.length)return;
    return commit(s=>{
      if(owner()!==who || !stillCurrent())return;
      s.roomNotices={...s.roomNotices};
      for(const {id,kind,label,url,at,sample} of fresh){
        if(!s.roomNotices[id])s.roomNotices[id]={kind,label,url,at,read:false,...(sample===true?{sample:true}:{})};
      }
    });
  }
  function connect(fromHome=false){
    const who=owner();
    show('Slack 알림','이 브라우저에 수신기 연결','<form id="relay-pair"><label class="field">수신기 연결 코드<input type="password" name="code" autocomplete="off" spellcheck="false" pattern="[a-fA-F0-9]{24}" required maxlength="24"></label>'+
      '<p>수신기 설정에 표시된 24자리 코드를 한 번만 입력하세요. 연결한 뒤에는 픽셀 연구실 탭만 열어 두면 돼요.</p>'+
      '<p id="relay-error" role="status"></p><button type="submit" class="primary">이 브라우저에 연결</button></form>');
    const form=$('relay-pair');
    form.onsubmit=async e=>{
      e.preventDefault();const submit=form.querySelector('button');if(submit.disabled)return;
      submit.disabled=true;$('relay-error').textContent='연결 중…';const code=form.elements.code.value.trim().toLowerCase();
      const ok=await receiver.pair(code);
      if(!form.isConnected || who!==owner())return;
      submit.disabled=false;
      if(ok){form.reset();if(fromHome)$('modal').close();else open();toast('이 브라우저에서 Slack 알림을 받아요.');}
      else $('relay-error').textContent=receiver.status||'24자리 연결 코드를 확인하세요.';
    };
  }
  function help(){
    show('소통 창','Slack 연결 방법','<p>컴퓨터에서 픽셀 연구실 Slack 수신기를 실행하고, 수신기 설정에서 테스트 채널을 지정하세요. 채널에 앱을 초대하면 새 공지를 받을 수 있어요.</p>'+
      '<p>홈에서 <b>알림 받기 → 수신기 연결</b>을 누르고 코드를 한 번 입력하세요. 수신기가 실행 중이면 설정 창은 닫아도 돼요. 이 브라우저는 다시 열어도 자동으로 연결돼요.</p>'+
      '<p><a href="https://github.com/pixel-research-lab/pixel-research-lab/blob/feature/bookshelf-and-comms/slack-bridge/README.md" target="_blank" rel="noopener noreferrer">Slack 앱 생성 및 수신기 설정 ↗</a></p>'+
      '<div class="actions">'+button('수신기 연결','connect')+button('소통 창','open')+'</div>');
  }
  document.addEventListener('click',async e=>{
    const el=e.target.closest('[data-comms]');if(!el)return;
    const act=el.dataset.comms,id=el.dataset.id,who=owner();
    try{
      if(act==='open')open();
      if(act==='help')help();
      if(act==='home-connect'){if(receiver.retrying)receiver.retry();else connect(true);}
      if(act==='add' || act==='edit')form(id);
      if(act==='connect'){if(!$('comms-inbox'))open();connect();}
      if(act==='disconnect'){receiver.disconnect();open();}
      if(act==='sample' && studio.previewCredit)await receipts([{id:crypto.randomUUID(),kind:'channel',sample:true,label:'#lab-updates',url:'',at:Date.now()}],who);
      if(act==='remove'){await commit(s=>{s.roomLinks={...s.roomLinks,[id]:{removed:true}};});if(who===owner())open();}
      if(act==='read')await commit(s=>{const n=s.roomNotices?.[id];if(n)s.roomNotices={...s.roomNotices,[id]:{...n,read:true}};});
    }catch(error){toast(error.message);}
  });
  return {open,paint,form,reset:receiver.reset};
}
