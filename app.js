(() => {
const $=id=>document.getElementById(id), modal=$('modal'), key='pixel-vla-lab.v1';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tFor=id=>tracks.find(t=>t.id===id);
const rng=n=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]%n};
const choose=a=>a[rng(a.length)];
const blank=()=>({version:1,quests:[],inventory:{plant:1},slots:['plant',null,null],offer:0,seenOffers:[0]});
let state=blank(), loaded=true, toastTimer, selectedLoot=null, home=true;
try {const s=JSON.parse(localStorage.getItem(key)||'null');if(s && labSave.valid(s))state=s;}catch{loaded=false}
function save(){
 if(window.pixelAccount?.edit(state))return;
 try{localStorage.setItem(key,JSON.stringify(state));$('save-state').textContent='이 브라우저에 저장';loaded=true;}
 catch{loaded=false;$('save-state').textContent='현재 창에만 저장';}
}
function toast(s){$('toast').textContent=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',2800);}
function sprite(id,cls='sprite'){return '<canvas width="18" height="18" data-sprite="'+id+'" class="'+cls+'" aria-hidden="true"></canvas>'}
function b(label,act,cls='secondary',arg=''){return '<button type="button" class="'+cls+'" data-do="'+act+'" data-arg="'+escapeHTML(arg)+'">'+escapeHTML(label)+'</button>'}
function stats(t,i){const list=state.quests.filter(q=>q.status==='done'&&q.track===t&&q.skill===i);return {xp:list.length,rank:list.reduce((n,q)=>Math.max(n,q.rankAfter||0),0)}}
function find(id){return state.quests.find(q=>q.id===id)}
function qTitle(q){return q.title || q.question}
function qRow(q,done){return '<button class="'+(done?'journal-row':'quest-row')+'" data-do="'+(done?'record':'quest')+'" data-arg="'+q.id+'">'+sprite(q.track,'skill-icon')+'<span><small>'+escapeHTML(done?new Date(q.ended).toLocaleDateString('ko-KR'):q.status==='ready'?'예측 전':'도전 진행 중')+' · '+tFor(q.track).name+'</small><strong>'+escapeHTML(qTitle(q))+'</strong></span><span class="arrow" aria-hidden="true">›</span></button>'}
function render(){
 const active=state.quests.filter(q=>q.status!=='done').slice().reverse(),done=state.quests.filter(q=>q.status==='done').sort((a,b)=>b.ended-a.ended);
 const offer=requests[state.offer];$('active-counter').textContent='진행 '+active.length;
 $('quest-board').innerHTML='<div class="board-inner"><div class="offer"><span class="mini-label">연구실 의뢰</span><h3>'+escapeHTML(offer[0])+'</h3><p>'+escapeHTML(offer[1])+'</p><div class="actions">'+b('의뢰 수락','accept','secondary')+b('다른 의뢰 뽑기','reroll','textbtn')+'</div></div>'+(active.length?'<div class="running-label">내 퀘스트</div>'+active.map(q=>qRow(q,false)).join(''):'')+'</div>';
 $('skills').innerHTML=tracks.map(t=>{const totals=t.skills.map((_,i)=>stats(t.id,i));const n=totals.filter(s=>s.rank>=2).length, xp=totals.reduce((sum,s)=>sum+s.xp,0);return '<button class="skill-row" data-do="skill" data-arg="'+t.id+'">'+sprite(t.id,'skill-icon')+'<b>'+t.name+'</b><span class="hint">'+t.hint+'</span>'+(xp?'<span class="skill-xp">경험 '+xp+'</span>':'')+'<span class="skill-num">'+n+' / '+t.skills.length+' ›</span></button>'}).join('');
 const ids=Object.keys(lootDefs),owned=ids.filter(i=>state.inventory[i]);$('loot-count').textContent=owned.length+' / '+ids.length+'종';
 $('loot').innerHTML=ids.map(i=>state.inventory[i]?'<button class="loot-cell" data-do="item" data-arg="'+i+'" aria-label="'+lootDefs[i][0]+'">'+sprite(i)+'<small>×'+state.inventory[i]+'</small></button>':'<span class="loot-cell unknown" aria-label="미발견 아이템">?</span>').join('')+'<p class="drawer-note">'+(owned.length===1?'새싹 화분은 입실 선물이에요.':'수집한 아이템을 선택해 책상에 놓으세요.')+'</p>';
 $('desk-summary').innerHTML=state.slots.map((i,n)=>'<span class="slot-bit '+(!i?'empty-bit':'')+'" aria-label="'+(n+1)+'번 자리"><i></i>'+(i?lootDefs[i][0]:'빈 자리')+'</span>').join('');
 $('done-count').textContent=done.length+'건';$('journal-rows').innerHTML=done.length?done.map(q=>qRow(q,true)).join(''):'<div class="empty-log">완료한 퀘스트의 예측과 관찰이 여기에 남아요.</div>';
 $('home').hidden=!home;$('journal').hidden=home;$('home-tab').toggleAttribute('aria-current',home);$('journal-tab').toggleAttribute('aria-current',!home);(home?$('home-tab'):$('journal-tab')).setAttribute('aria-current','page');
 paintRoom(state.slots);paintIcons();
}
function changeTab(isHome){home=isHome;if(modal.open)modal.close();render();window.scrollTo({top:0});}
function show(context,title,body){
 $('dialog-context').textContent=context;$('modal-body').innerHTML='<div class="modal-content"><h2 id="dialog-name">'+escapeHTML(title)+'</h2>'+body+'</div>';
 modal.setAttribute('aria-labelledby','dialog-name');if(!modal.open)modal.showModal();modal.scrollTop=0;paintIcons();
}
function takeOffer(){const current=state.offer;let available=requests.map((_,i)=>i).filter(i=>!state.seenOffers.includes(i));
 if(!available.length){state.seenOffers=[current];available=requests.map((_,i)=>i).filter(i=>i!==current);}
 state.offer=choose(available);state.seenOffers.push(state.offer);
}
function make(question,track,skill,title=''){
 const id=crypto.randomUUID?.()||Date.now().toString(36)+'-'+rng(100000);
 const q={id,question,track,skill,title,status:'ready',created:Date.now()};state.quests.push(q);return q;
}
function newForm(){
 show('퀘스트 보드','새 퀘스트','<form id="register-form"><label class="field">알아내고 싶은 질문<textarea id="question" maxlength="260" required placeholder="예: 같은 사진에서 지시문만 바꾸면 로봇의 첫 행동도 달라질까?"></textarea></label><label class="field">키울 능력치<select id="track">'+tracks.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('')+'</select></label><label class="field">연습할 스킬<select id="skill"></select></label><button class="primary" type="submit">질문 등록</button></form>');
 const options=()=>{$('skill').innerHTML=tFor($('track').value).skills.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('')};options();$('track').onchange=options;
 $('register-form').onsubmit=e=>{e.preventDefault();const field=$('question');if(!field.value.trim()){field.setCustomValidity('질문을 입력해 주세요.');field.reportValidity();return;}
 const q=make(field.value.trim(),$('track').value,Number($('skill').value));save();render();quest(q.id);};$('question').oninput=e=>e.target.setCustomValidity('');$('question').focus();
}
function quest(id){
 const q=find(id);if(!q)return;if(q.status==='done'){record(id);return}
 const t=tFor(q.track),intro='<p class="lead">'+escapeHTML(q.title?q.question:'연습 스킬 · '+t.skills[q.skill])+'</p>';
 if(q.status==='ready'){
  show(t.name+' / '+t.skills[q.skill],qTitle(q),intro+'<form id="prediction-form"><label class="field">시작 전 내 예측<textarea id="prediction" maxlength="800" placeholder="아직 감이 안 오면 비워 둬도 돼요.">'+escapeHTML(q.predictionDraft||'')+'</textarea></label><div class="muteline">지금의 생각을 남기면 확인해 볼 도전 카드 한 장이 열려요.</div><button class="primary" type="submit">예측 봉인 · 도전 카드 열기</button></form>');
  $('prediction').oninput=e=>{q.predictionDraft=e.target.value;save()};
  $('prediction-form').onsubmit=e=>{e.preventDefault();if(q.status!=='ready')return;q.prediction=$('prediction').value.trim();delete q.predictionDraft;
   const previous=state.quests.filter(x=>x.track===q.track&&x.id!==q.id&&x.card!==undefined).slice(-1)[0]?.card;
   const available=t.cards.map((_,i)=>i).filter(i=>i!==previous);q.card=choose(available);q.status='active';save();render();quest(q.id);};return;
 }
 const card=t.cards[q.card];
 show(t.name+' / '+t.skills[q.skill],qTitle(q),intro+'<dl class="record"><dt>봉인한 예측</dt><dd>'+escapeHTML(q.prediction||'예측 보류')+'</dd></dl><div class="card-note"><span class="mini-label">공개된 도전 카드</span><h3>'+card[0]+'</h3><p>'+card[1]+'</p></div><form id="finish-form"><label class="field">관찰과 근거<textarea id="finding" required maxlength="2000" placeholder="무엇을 봤나요? 숫자, 그림 번호 또는 구체적 사례를 하나 남기세요.">'+escapeHTML(q.draft?.finding||'')+'</textarea></label><label class="field">결과<select id="verdict">'+(q.prediction?['예상과 같았다','예상과 달랐다','판단을 보류했다']:['새로운 점을 관찰했다','판단을 보류했다']).map(x=>'<option>'+x+'</option>').join('')+'</select></label><label class="field">이번에 어떻게 수행했나요?<select id="mastery"><option value="1">예시나 도움을 받아 수행 · 견습</option><option value="2">혼자 수행 · 독립</option><option value="3">다른 문제에 적용 · 응용</option></select></label><button class="primary" type="submit">연구 기록하고 보상 받기</button></form>');
 if(q.draft){$('verdict').value=q.draft.verdict;$('mastery').value=q.draft.mastery;}
 const draft=()=>{q.draft={finding:$('finding').value,verdict:$('verdict').value,mastery:$('mastery').value};save()};
 $('finish-form').oninput=e=>{if(e.target.id==='finding')e.target.setCustomValidity('');draft()};$('finish-form').onchange=draft;
 $('finish-form').onsubmit=e=>{e.preventDefault();if(q.status!=='active')return;const evidence=$('finding').value.trim();if(!evidence){$('finding').setCustomValidity('직접 관찰한 내용을 적어 주세요.');$('finding').reportValidity();return;}
  const before=stats(q.track,q.skill).rank;const eligible=Object.keys(lootDefs).filter(x=>x!=='plant');const unseen=eligible.filter(x=>!state.inventory[x]);const item=q.title===requests[0][0]?'lens':choose(unseen.length?unseen:eligible);
  Object.assign(q,{finding:evidence,verdict:$('verdict').value,rankBefore:before,rankAfter:Math.max(before,Number($('mastery').value)),loot:item,status:'done',ended:Date.now()});delete q.draft;state.inventory[item]=(state.inventory[item]||0)+1;save();render();reward(q);};
}
function itemBox(i){return '<div class="reward">'+sprite(i)+'<div><h3>'+lootDefs[i][0]+'</h3><p>'+lootDefs[i][1]+'</p></div></div>'}
function reward(q){const skill=tFor(q.track).skills[q.skill],a=q.rankBefore,z=q.rankAfter;
 show('퀘스트 완료','연구 성과를 획득했어요',itemBox(q.loot)+'<p class="skill-result"><strong>'+skill+'</strong> · 경험 +1<br>'+(a===z?ranks[z]+' 단계':ranks[a]+' → '+ranks[z])+'</p><div class="actions">'+b('책상에 놓기','place-loot','primary',q.loot)+b('연구 일지 보기','record','secondary',q.id)+'</div>');}
function record(id){const q=find(id);if(!q||q.status!=='done')return;const t=tFor(q.track);show('연구 일지 / '+new Date(q.ended).toLocaleDateString('ko-KR'),qTitle(q),
 '<dl class="record">'+[['질문',q.question],['시작 전 예측',q.prediction||'예측 보류'],['도전 카드',t.cards[q.card].join(' · ')],['결과',q.verdict],['관찰과 근거',q.finding],['성장',t.skills[q.skill]+' · 경험 +1 · '+ranks[q.rankAfter]]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+escapeHTML(v)+'</dd>').join('')+'</dl>'+itemBox(q.loot)+b('일지 목록','journal','secondary'));}
function skillSheet(id){const t=tFor(id);show('스킬 수첩',t.name,'<p>'+t.hint+'</p>'+t.skills.map((s,i)=>{const {xp,rank}=stats(id,i);return '<div class="progress-line"><strong>'+s+'</strong><span>'+ranks[rank]+' · 경험 '+xp+'</span></div>'}).join(''));}
function desk(item=null){
 selectedLoot=item;
 const left=id=>(state.inventory[id]||0)-state.slots.filter(x=>x===id).length;
 show('작업 책상','책상 꾸미기','<p>'+(item?lootDefs[item][0]+'의 자리를 선택하세요.':'서랍에서 아이템을 고른 뒤 놓을 자리를 선택하세요.')+'</p><div class="inventory">'+Object.keys(lootDefs).filter(i=>state.inventory[i]).map(i=>'<button class="pick" data-do="pick" data-arg="'+i+'" aria-pressed="'+(i===item)+'">'+sprite(i)+lootDefs[i][0]+' ×'+state.inventory[i]+'</button>').join('')+'</div><div class="rack">'+state.slots.map((id,n)=>'<button class="place" data-do="slot" data-arg="'+n+'" aria-label="'+(n+1)+'번 자리 '+(id?lootDefs[id][0]:'비어 있음')+'"><small>'+['왼쪽','가운데','오른쪽'][n]+'</small>'+(id?sprite(id):'<span aria-hidden="true">＋</span>')+'<strong>'+(id?lootDefs[id][0]:'빈 자리')+'</strong></button>').join('')+'</div><div class="actions">'+b('완료','close','primary')+(state.slots.some(Boolean)?b('장식 빼기','remove-mode','textbtn'):'')+'</div>');
 if(item && left(item)===0){const p=$('modal-body').querySelector('p');p.textContent=lootDefs[item][0]+'을 옮길 자리를 선택하세요.';}
}
let pendingImport;
const previousKey = key + '.before-import';
const localDemo = location.protocol === 'file:';

function storedValue(name) {
  try { return localStorage.getItem(name); } catch { return null; }
}
function summary(s) {
  const done = s.quests.filter(q => q.status === 'done').length;
  const slots = s.slots.map(id => id ? lootDefs[id][0] : '빈 자리');
  return '<p class="save-summary">진행 중 '+(s.quests.length-done)+'개 · 완료 '+done+'개<br>책상 왼쪽부터 '+slots.join(' · ')+'</p>';
}
function savePanel(message='') {
  pendingImport = null;
  const previous = !pixelAccount.uid && storedValue(previousKey);
  const webLink = localDemo ? '<p class="save-guide">이 파일에서 세이브를 내보낸 뒤, <a href="https://2e2guk.github.io/pixel-research-lab/" target="_blank" rel="noopener">배포된 연구실 열기 ↗</a>에서 가져오세요.</p>' : (pixelAccount.uid ? '<p class="save-guide">같은 계정의 다른 기기와 자동 동기화됩니다. 파일로도 백업할 수 있어요.</p>' : '<p class="save-guide">로그인하면 같은 계정의 기기에서 이어 할 수 있어요.</p>'+b('계정 연결','account'));
  show('내 연구실','세이브 관리',summary(state)+webLink+
    '<div class="actions">'+b('세이브 내보내기','export-save','primary')+b('세이브 가져오기','choose-save')+'</div>'+
    '<input type="file" id="save-file" hidden accept=".json,application/json">'+
    (previous?'<div class="actions">'+b('가져오기 전 상태 복원','previous-save','textbtn')+'</div>':'')+
    '<p id="transfer-info" role="status">'+escapeHTML(message)+'</p>');
  $('save-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { previewImport(labSave.read(await file.text()), false); }
    catch { savePanel('읽을 수 없는 세이브예요. 픽셀 연구실에서 내보낸 JSON 파일을 선택해 주세요.'); }
  };
}
function previewImport(next, restoring) {
  pendingImport = {next, base:storedValue(key)};
  show('세이브 관리',restoring?'이전 연구실로 돌아갈까요?':'이 세이브를 불러올까요?',
    summary(next)+(pixelAccount.uid?'<p>계정의 퀘스트와 합치고 파일의 책상 배치를 적용해요. 이미 완료한 퀘스트는 유지합니다.</p>':'<p>현재 퀘스트와 책상 배치가 이 기록으로 바뀝니다. 적용 전 상태도 이 브라우저에 보관해요.</p>')+'<div class="actions">'+
    b('적용하기','apply-save','primary')+b('취소','save-panel')+'</div>');
}
function applyImport() {
  if (!pendingImport) return;
  const {next,base} = pendingImport;
  if(pixelAccount.uid){
    pixelAccount.edit(next,true); pendingImport=null;changeTab(true);toast('계정 기록과 합치는 중이에요.');return;
  }
  if (storedValue(key) !== base) {savePanel('다른 탭에서 기록이 변경됐어요. 파일을 다시 선택해 주세요.');return;}
  try {
    localStorage.setItem(previousKey, JSON.stringify(state));
    localStorage.setItem(key, JSON.stringify(next));
  } catch {savePanel('브라우저 저장 공간을 확인해 주세요. 현재 기록을 유지했어요.');return;}
  state=next; pendingImport=null; loaded=true; $('save-state').textContent='이 브라우저에 저장';
  changeTab(true); toast('퀘스트와 책상 배치를 불러왔어요.');
}

let removeMode=false;
function placeAt(i){if(!Number.isInteger(i)||i<0||i>2)return;
 if(removeMode){if(!state.slots[i])return;state.slots[i]=null;removeMode=false;save();render();desk();toast('서랍에 돌려놓았어요.');return;}
 if(!selectedLoot){toast('먼저 서랍에서 아이템을 골라 주세요.');return;}
 const id=selectedLoot;if(state.slots[i]!==id){if(state.slots.filter(x=>x===id).length>=state.inventory[id]){let prev=state.slots.indexOf(id);if(prev>=0)state.slots[prev]=null;}state.slots[i]=id;}
 save();render();desk();toast(lootDefs[id][0]+' 배치 완료');}
document.addEventListener('click',e=>{const el=e.target.closest('[data-do]');if(!el)return;const act=el.dataset.do,arg=el.dataset.arg;
 switch(act){
 case 'account':accountPanel();break;
 case 'sign-in':pixelAccount.login().catch(e=>{const field=$('auth-feedback');if(field)field.textContent=e.code==='auth/popup-closed-by-user'?'로그인 창이 닫혔어요.':'로그인을 마치지 못했어요. 인터넷 연결과 팝업 허용을 확인해 주세요.';});break;
 case 'sign-out':pixelAccount.logout().catch(()=>toast('로그아웃을 완료하지 못했어요.'));break;
 case 'sync-now':pixelAccount.retry();break;
 case 'save-panel':savePanel();break;
 case 'export-save':labSave.download(state);$('transfer-info').textContent='세이브 파일을 내보냈어요.';break;
 case 'choose-save':$('save-file').click();break;
 case 'previous-save':try {previewImport(labSave.read(storedValue(previousKey)), true);} catch {savePanel('이전 세이브를 읽을 수 없어요.');}break;
 case 'apply-save':applyImport();break;
 case 'music':if(navigator.onLine){window.open('https://www.youtube.com/watch?v=jfKfPfyJRdk','_blank','noopener,noreferrer');}else{toast('스피커는 인터넷에 연결한 뒤 켤 수 있어요.');}break;
 case 'new':newForm();break; case 'reroll':takeOffer();save();render();break;
 case 'accept':{const r=requests[state.offer];const ongoing=state.quests.find(q=>q.status!=='done'&&q.title===r[0]);const q=ongoing||make(r[1],r[2],r[3],r[0]);takeOffer();save();render();quest(q.id);break;}
 case 'quest':quest(arg);break;case 'record':record(arg);break;case 'skill':skillSheet(arg);break;
 case 'desk':removeMode=false;desk();break;case 'place-loot':case 'pick':removeMode=false;desk(arg);break;
 case 'item':show('전리품 서랍',lootDefs[arg][0],itemBox(arg)+b('책상에 놓기','place-loot','primary',arg));break;
 case 'slot':placeAt(Number(arg));break;case 'remove-mode':selectedLoot=null;desk();removeMode=true;$('modal-body').querySelector('p').textContent='서랍에 돌려놓을 장식을 책상에서 선택하세요.';break;
 case 'journal':changeTab(false);break;case 'close':modal.close();break;
 }});
$('home-tab').onclick=()=>changeTab(true);$('journal-tab').onclick=()=>changeTab(false);
$('close-modal').onclick=()=>modal.close();modal.addEventListener('close',()=>{removeMode=false;});
window.addEventListener('storage',e=>{
 if(pixelAccount.uid || e.key!==key||!e.newValue)return;
 try{const updated=JSON.parse(e.newValue);if(!labSave.valid(updated))return;
 state=updated;if(modal.open){modal.close();toast('다른 탭에서 저장한 내용을 불러왔어요.');}render();}catch{}
});
function accountPanel(){
 const account=pixelAccount;
 const info=account.uid
  ? '<p>'+escapeHTML(account.email||'연결된 계정')+'</p><p id="account-state"></p><div class="actions">'+b('지금 동기화','sync-now')+b('로그아웃','sign-out','textbtn')+'</div><p class="save-guide">'+('SyncManager' in window?'탭을 닫은 뒤에는 브라우저가 허용할 때 대기 기록을 보내요.':'오프라인에서 창을 닫았다면 인터넷에 연결한 뒤 연구실을 다시 열어 주세요.')+'</p>'
  : '<p>이 기기의 퀘스트와 책상 배치를 내 계정에 연결해요. 다른 기기에서도 같은 Google 계정으로 로그인하세요.</p>'+b('Google로 로그인','sign-in','primary')+'<p id="auth-feedback" role="status"></p>';
 show('내 연구실','계정 동기화',info);
 if($('account-state'))$('account-state').textContent=account.status;
}
function redraw(next){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const oldById=new Map(state.quests.map(q=>[q.id,q]));
 let currentChanged=false;
 next.quests=next.quests.map(q=>{
   const previous=oldById.get(q.id);
   if(!previous)return q;
   if(same(previous,q))return previous;
   if(modal.open && $('dialog-name')?.textContent===qTitle(previous))currentChanged=true;
   return q;
 });
 if(currentChanged){modal.close();toast('다른 기기의 퀘스트 기록을 반영했어요.');}
 state=next;render();
}
pixelAccount.init({
 readGuest:()=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},
 claimGuest: guest=>{if(storedValue(key)===JSON.stringify(guest)){localStorage.removeItem(key);localStorage.removeItem(previousKey);}},
 guest:()=>{let g;try{g=JSON.parse(storedValue(key));}catch{}redraw(g&&labSave.valid(g)?g:blank());},
 busy:v=>{document.querySelector('main').inert=v;document.querySelector('header').inert=v;},
 closeAccount:()=>{if(modal.open)modal.close();},
 apply:redraw,alert:toast,
 status:(s,email)=>{$('save-state').textContent=s;$('account-open').textContent=email?'내 계정':'로그인';if($('account-state'))$('account-state').textContent=s;}
});
if(!loaded)$('save-state').textContent='현재 창에만 저장';logo();render();
})();
