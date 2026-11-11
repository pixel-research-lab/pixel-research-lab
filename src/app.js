(() => {
const $=id=>document.getElementById(id), modal=$('modal'), key='pixel-vla-lab.v1';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tFor=id=>tracks.find(t=>t.id===id);
const rng=n=>{const r=new Uint32Array(1);crypto.getRandomValues(r);return r[0]%n};
const choose=a=>a[rng(a.length)];
const blank=()=>({version:1,field:'',showOffer:false,quests:[],attendance:[],reviews:[],inventory:{plant:1},slots:['plant',null,null],offer:0,seenOffers:[0]});
let state=blank(), loaded=true, toastTimer, selectedLoot=null, home=true;
try {const s=JSON.parse(localStorage.getItem(key)||'null');if(s && labSave.valid(s))state=s;}catch{loaded=false}
function save(confirmLocal=false){
 if(window.pixelAccount?.uid)return pixelAccount.edit(state,false,confirmLocal);
 try{localStorage.setItem(key,JSON.stringify(state));$('save-state').textContent='이 브라우저에 저장';loaded=true;return true;}
 catch{loaded=false;$('save-state').textContent='현재 창에만 저장';return false;}
}
function toast(s){$('toast').textContent=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',2800);}
function sprite(id,cls='sprite'){
 const group=Object.hasOwn(lootDefs,id)?'items':'skills';
 return '<img class="'+cls+'" width="18" height="18" alt="" src="./assets/images/'+group+'/'+id+'.png">';
}
function b(label,act,cls='secondary',arg=''){return '<button type="button" class="'+cls+'" data-do="'+act+'" data-arg="'+escapeHTML(arg)+'">'+escapeHTML(label)+'</button>'}
function stats(t,i){const list=state.quests.filter(q=>q.status==='done'&&q.track===t&&q.skill===i);return {xp:list.length,rank:list.reduce((n,q)=>Math.max(n,q.rankAfter||0),0)}}
function find(id){return state.quests.find(q=>q.id===id)}
function qTitle(q){return q.title || q.question}
function questFocus(q){const id=q.focusSkill===undefined?q.track:q.focusSkill;return studio.axes(state).find(x=>x.id===id)?.name || '연결한 스킬 없음';}
function qRow(q,done){return '<button class="'+(done?'journal-row':'quest-row')+'" data-do="'+(done?'record':'quest')+'" data-arg="'+q.id+'">'+sprite(q.track,'skill-icon')+'<span><small>'+escapeHTML(done?new Date(q.ended).toLocaleDateString('ko-KR'):q.status==='ready'?'예측 전':'도전 진행 중')+' · '+escapeHTML(questFocus(q))+'</small><strong>'+escapeHTML(qTitle(q))+'</strong></span><span class="arrow" aria-hidden="true">›</span></button>'}
function render(){
 const active=state.quests.filter(q=>q.status!=='done').slice().reverse(),done=state.quests.filter(q=>q.status==='done').sort((a,b)=>b.ended-a.ended);
 const offer=requests[state.offer];
 $('field-button').textContent=state.field?'연구 분야 · '+state.field:'연구 분야 설정';
 const suggestion=state.showOffer?
  '<div class="offer"><span class="mini-label">연구실 의뢰</span><h3>'+escapeHTML(offer[0])+'</h3><p>'+escapeHTML(offer[1])+'</p><div class="actions">'+b('의뢰 수락','accept')+b('다른 의뢰 뽑기','reroll','textbtn')+'</div></div>':
  '<div class="board-empty">'+(!active.length?'<p>등록한 연구 퀘스트가 없어요.</p>':'')+b('의뢰 뽑기','reroll','textbtn')+'</div>';
 $('research-quests').innerHTML='<div class="board-inner">'+suggestion+(active.length?'<div class="running-label">내 퀘스트</div>'+active.map(q=>qRow(q,false)).join(''):'')+'</div>';
 $('skills').innerHTML=tracks.map(t=>{const totals=t.skills.map((_,i)=>stats(t.id,i));const n=totals.filter(s=>s.rank>=2).length, xp=totals.reduce((sum,s)=>sum+s.xp,0);return '<button class="skill-row" data-do="skill" data-arg="'+t.id+'">'+sprite(t.id,'skill-icon')+'<b>'+t.name+'</b><span class="hint">'+t.hint+'</span>'+(xp?'<span class="skill-xp">경험 '+xp+'</span>':'')+'<span class="skill-num">'+n+' / '+t.skills.length+' ›</span></button>'}).join('');
 const ids=Object.keys(lootDefs),owned=ids.filter(i=>state.inventory[i]);$('loot-count').textContent=owned.length+' / '+ids.length+'종';
 $('loot').innerHTML=ids.map(i=>state.inventory[i]?'<button class="loot-cell" data-do="item" data-arg="'+i+'" aria-label="'+lootDefs[i][0]+'">'+sprite(i)+'<small>×'+state.inventory[i]+'</small></button>':'<span class="loot-cell unknown" aria-label="미발견 아이템">?</span>').join('')+'<p class="drawer-note">'+(owned.length===1?'새싹 화분은 입실 선물이에요.':'수집한 아이템을 선택해 책상에 놓으세요.')+'</p>';
 $('desk-summary').innerHTML=state.slots.map((i,n)=>'<span class="slot-bit '+(!i?'empty-bit':'')+'" aria-label="'+(n+1)+'번 자리"><i></i>'+(i?lootDefs[i][0]:'빈 자리')+'</span>').join('');
 $('done-count').textContent=done.length+'건';$('journal-rows').innerHTML=done.length?done.map(q=>qRow(q,true)).join(''):'<div class="empty-log">완료한 퀘스트의 예측과 관찰이 여기에 남아요.</div>';
 $('home').hidden=!home;$('journal').hidden=home;$('home-tab').toggleAttribute('aria-current',home);$('journal-tab').toggleAttribute('aria-current',!home);(home?$('home-tab'):$('journal-tab')).setAttribute('aria-current','page');
 studioUI.paint();reviewDay=null;resetClockView();
}
let reviewDay, studyDay, paintedMinute, recordedSecond, loggedMinute;
let writingShift=false;
const shiftActions={
 idle:['start','연구 시작'], working:['pause','잠시 비움'], paused:['resume','연구 재개']
};
function resetClockView(){
 studyDay=attendance.timeline(state.attendance);
 paintedMinute=recordedSecond=loggedMinute=null;
 updateClock();
}
function updateClock(){
 if(!studyDay)return;
 const date=new Date(),now=date.getTime(),minute=Math.floor(now/60000);
 const day=reviewSchedule.today(date);
 if(reviewDay!==day){paintReviews(day);reviewDay=day;}
 if(home && paintedMinute!==minute){paintRoom(state.slots,date,studio.wallet(state).fitted);paintedMinute=minute;}
 if(!home && loggedMinute!==minute){paintShiftLog(date);loggedMinute=minute;}
 const second=Math.floor(now/1000);
 if(recordedSecond===second)return;
 recordedSecond=second;
 $('study-total').textContent=attendance.duration(attendance.dayTotal(studyDay,date,now));
 const last=studyDay.accepted.at(-1);
 const status=studyDay.status, [action,label]=shiftActions[status];
 const lastTime=last?attendance.time(new Date(last.at)):'';
 const lastToday=last && last.at>=attendance.dayStart(date);
 $('shift-status').textContent=status==='working'?'연구 중 · '+lastTime+'부터':
   status==='paused'?'자리 비움 · '+lastTime+'부터':lastToday?'퇴근 '+lastTime:'출근 전';
 const main=$('shift-main'),out=$('shift-out');
 main.dataset.arg=action;main.textContent=label;
 main.disabled=out.disabled=writingShift;
 out.hidden=status==='idle';
}
function paintShiftLog(date){
 const entries=[];
 for(let n=0;n<7;n++){
   const from=attendance.dayStart(date,-n),day=new Date(from),to=attendance.dayStart(day,1);
   const events=studyDay.accepted.filter(e=>e.at>=from && e.at<to);
   const total=attendance.dayTotal(studyDay,day,date.getTime());
   if(!events.length && !total)continue;
   const first=events.find(e=>e.action==='start'),last=events.at(-1);
   const labels={start:'연구 시작',pause:'자리 비움',resume:'연구 재개',finish:'퇴근'};
   const marks=[];
   if(first && first!==last)marks.push('출근 '+attendance.time(new Date(first.at)));
   if(last)marks.push(labels[last.action]+' '+attendance.time(new Date(last.at)));
   entries.push('<div class="shift-entry"><b>'+day.toLocaleDateString('ko-KR',{month:'short',day:'numeric',weekday:'short'})+
    '</b><small>'+(marks.join(' · ')||'전날부터 이어진 연구')+'</small><time>'+attendance.duration(total)+'</time></div>');
 }
 $('shift-log').innerHTML=entries.join('')||'<div class="empty-log">연구를 시작하면 여기에 출퇴근 기록이 남아요.</div>';
}
async function recordShift(action){
 if(writingShift || !attendance.next[studyDay.status][action])return;
 const owner=pixelAccount.uid;
 // Include guest edits from another tab that may have committed since the last storage event.
 if(!owner){
   const guest=pixelAccountGuest();
   if(guest && labSave.valid(guest)){state=guest;resetClockView();}
   if(!attendance.next[studyDay.status][action])return;
 }
 const last=studyDay.accepted.at(-1), id=crypto.randomUUID();
 const event={id,action,at:Math.max(Date.now(),(last?.at||0)+1)};
 state.attendance=[...(state.attendance||[]),event];
 writingShift=true;resetClockView();
 try{
   if(!await save(true))throw Error('storage');
   if(action==='finish' && pixelAccount.uid===owner){
     toast('퇴근 기록을 이 기기에 저장했어요.');
     if(owner && navigator.onLine)pixelAccount.retry();
   }
 }catch{
   if(pixelAccount.uid===owner){
     state.attendance=(state.attendance||[]).filter(e=>e.id!==id);
     toast('출퇴근 기록을 저장하지 못했어요. 저장 공간을 확인하고 다시 눌러 주세요.');
   }
 }finally{writingShift=false;resetClockView();}
}
function pixelAccountGuest(){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
setInterval(()=>{if(!document.hidden)updateClock();},500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
window.addEventListener('pageshow',updateClock);
function changeTab(isHome){home=isHome;if(modal.open)modal.close();render();window.scrollTo({top:0});}
function show(context,title,body){
 currentReview=null;
 $('dialog-context').textContent=context;$('modal-body').innerHTML='<div class="modal-content"><h2 id="dialog-name">'+escapeHTML(title)+'</h2>'+body+'</div>';
 modal.setAttribute('aria-labelledby','dialog-name');if(!modal.open)modal.showModal();modal.scrollTop=0;
}
function fieldForm(){
 show('내 연구실','연구 분야 설정','<form id="field-form"><label class="field">연구 분야<input type="text" id="field-name" maxlength="60" placeholder="예: 천문학, 생태학, VLM" value="'+escapeHTML(state.field||'')+'"></label><button class="primary" type="submit">저장</button></form>');
 const form=$('field-form');
 form.onsubmit=async e=>{
  e.preventDefault();
  const previous=state.field, owner=pixelAccount.uid;
  state.field=$('field-name').value.trim();form.querySelector('button').disabled=true;
  try{
   if(!await save(true))throw Error('storage');
   if(owner===pixelAccount.uid && modal.open && form===$('field-form'))modal.close();
  }catch{if(owner===pixelAccount.uid){state.field=previous;toast('분야를 저장하지 못했어요. 다시 시도해 주세요.');}}
  finally{form.querySelector('button').disabled=false;render();}
 };
 $('field-name').focus();
}
function takeOffer(){if(!state.showOffer){state.showOffer=true;state.offer=choose(requests.map((_,i)=>i));state.seenOffers=[state.offer];return;}const current=state.offer;let available=requests.map((_,i)=>i).filter(i=>!state.seenOffers.includes(i));
 if(!available.length){state.seenOffers=[current];available=requests.map((_,i)=>i).filter(i=>i!==current);}
 state.offer=choose(available);state.seenOffers.push(state.offer);
}
function make(question,track,skill,title='',focusSkill=studio.axes(state).find(x=>x.visible&&x.base===track)?.id||null,difficulty='standard'){
 const id=crypto.randomUUID?.()||Date.now().toString(36)+'-'+rng(100000);
 const q={id,question,track,skill,title,focusSkill,difficulty,status:'ready',created:Date.now()};state.quests.push(q);return q;
}
function newForm(){
 show(state.field||'퀘스트 보드','새 퀘스트','<form id="register-form"><label class="field">알아내고 싶은 질문<textarea id="question" maxlength="260" required placeholder="예: 비교 조건 하나를 바꾸면 관찰 결과도 달라질까?"></textarea></label><label class="field">키울 스킬<select id="track">'+studioUI.optionList()+'</select></label><label class="field">연습 항목<select id="skill"></select></label><label class="field">난이도 · 완료 보상<select id="difficulty"><option value="easy">가벼움 · 15 token</option><option value="standard" selected>보통 · 30 token</option><option value="hard">도전 · 60 token</option></select></label><button class="primary" type="submit">질문 등록</button></form>');
 const base=()=>studio.axes(state).find(x=>x.id===$('track').value)?.base || 'read';
 const options=()=>{$('skill').innerHTML=tFor(base()).skills.map((s,i)=>'<option value="'+i+'">'+s+'</option>').join('')};options();$('track').onchange=options;
 $('register-form').onsubmit=e=>{e.preventDefault();const field=$('question');if(!field.value.trim()){field.setCustomValidity('질문을 입력해 주세요.');field.reportValidity();return;}
 const q=make(field.value.trim(),base(),Number($('skill').value),'',$('track').value||null,$('difficulty').value);save();render();quest(q.id);};$('question').oninput=e=>e.target.setCustomValidity('');$('question').focus();
}
let currentReview=null, savingReview=false;
function reviewById(id){return (state.reviews||[]).find(card=>card.id===id);}
function reviewDate(day){return new Date(day+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric'});}
function reviewRows(){
 return (state.reviews||[]).map(card=>({card,...reviewSchedule.progress(card)}))
   .sort((a,b)=>(a.due||'').localeCompare(b.due||'') || a.card.question.localeCompare(b.card.question,'ko'));
}
function reviewRow(row,archived=false){
 const detail=archived?reviewDate(row.finished)+' 완료':row.streak+' / 4 연속 정답';
 return '<button class="quest-row review-row" data-do="'+(archived?'review-record':'review')+'" data-arg="'+row.card.id+
  '"><span><small>'+detail+'</small><strong>'+escapeHTML(row.card.question)+'</strong></span><span class="arrow" aria-hidden="true">›</span></button>';
}
function dailyDraw(day) {
 if(state.reviewDraw?.day===day)return state.reviewDraw;
 // A guest tab can wake at midnight before its storage event is delivered.
 // Write only the draw into the latest guest save, preserving edits from other tabs.
 const guest=pixelAccount.uid?null:pixelAccountGuest();
 const source=guest && labSave.valid(guest)?guest:state;
 if(source.reviewDraw?.day===day){
   state.reviewDraw=source.reviewDraw;
   return state.reviewDraw;
 }
 const draw=reviewSchedule.draw(source.reviews||[],day,source.reviewLimit??reviewSchedule.defaultLimit);
 if(draw.ids.length && (!source.reviewDraw || source.reviewDraw.day<day)){
   draw.createdAt=Date.now();
   state.reviewDraw=draw;
   if(pixelAccount.uid)save();
   else{
     try{localStorage.setItem(key,JSON.stringify({...source,reviewDraw:draw}));}
     catch{loaded=false;$('save-state').textContent='현재 창에만 저장';}
   }
 }
 return draw;
}
function dailyReviews(day, rows=reviewRows()){
 const draw=dailyDraw(day), byId=new Map(rows.map(row=>[row.card.id,row]));
 const selected=draw.ids.map(id=>byId.get(id)).filter(Boolean);
 return {selected, remaining:selected.filter(row=>row.due && row.due<=day)};
}
function paintReviews(day){
 const rows=reviewRows(), {selected,remaining}=dailyReviews(day,rows);
 const upcoming=rows.filter(r=>r.due>day);
 const archived=rows.filter(r=>r.finished).sort((a,b)=>b.finished.localeCompare(a.finished));
 const progress=selected.length ? (selected.length-remaining.length)+' / '+selected.length+' 완료' : '';
 const empty=selected.length?'오늘 뽑힌 복습을 모두 풀었어요.':upcoming.length?'다음 복습은 '+reviewDate(upcoming[0].due)+'이에요.':
  rows.length?'오늘 풀 복습이 없어요.':'질문과 답을 등록하면 내일부터 복습할 수 있어요.';
 $('daily-review-quests').innerHTML='<div class="running-label daily-heading">복습 퀘스트 <span>'+progress+'</span></div>'+
   (remaining.length?remaining.map(r=>reviewRow(r)).join(''):'<p class="review-empty">'+empty+'</p>');
 const active=state.quests.filter(q=>q.status!=='done').length;
 planner.paint(day,active+remaining.length);
 const limit=state.reviewLimit??reviewSchedule.defaultLimit;
 $('review-board').innerHTML='<div class="review-footer"><span>복습 XP '+rows.reduce((sum,r)=>sum+r.xp,0)+'</span>'+
   b('하루 '+limit+'문제 · 설정','review-settings','textbtn')+
   (upcoming.length?b('복습 예정 '+upcoming.length+'개','upcoming','textbtn'):'')+'</div>';
 $('review-count').textContent=archived.length+'건';
 $('review-records').innerHTML=archived.length?archived.map(r=>reviewRow(r,true)).join(''):
  '<div class="empty-log">네 번 연속 맞힌 질문이 여기에 남아요.</div>';
}
function reviewSettings(){
 const limit=state.reviewLimit??reviewSchedule.defaultLimit;
 show('복습 관리','하루 복습 문항 수','<form id="review-settings-form"><label class="field">하루 최대 문항 수'+
   '<input type="number" id="review-limit" min="1" max="'+reviewSchedule.maxLimit+'" step="1" required value="'+limit+'"></label>'+
   '<p class="muteline">새로 뽑는 목록부터 적용해요. 복습할 문제가 더 적으면 모두 나와요.</p>'+
   '<button class="primary" type="submit">저장</button></form>');
 const form=$('review-settings-form'), input=$('review-limit');
 form.onsubmit=async e=>{
   e.preventDefault();
   const value=input.valueAsNumber;
   if(!reviewSchedule.validLimit(value))return;
   refreshGuestForReview();
   const previous=state.reviewLimit, owner=pixelAccount.uid, button=form.querySelector('button');
   state.reviewLimit=value;button.disabled=true;
   try{
     if(!await save(true))throw Error('storage');
     if(owner===pixelAccount.uid && form===$('review-settings-form')){modal.close();toast('복습 문항 수를 저장했어요.');}
   }catch{
     if(owner===pixelAccount.uid){
       if(previous===undefined)delete state.reviewLimit;else state.reviewLimit=previous;
       toast('문항 수를 저장하지 못했어요. 다시 시도해 주세요.');
     }
   }finally{button.disabled=false;render();}
 };
 input.focus();
}
function upcomingReviews(){
 const rows=reviewRows().filter(r=>r.due>reviewSchedule.today());
 show('오늘의 복습','복습 예정',rows.map(r=>'<div class="upcoming-review"><small>'+reviewDate(r.due)+' · '+r.streak+' / 4</small><p>'+
  escapeHTML(r.card.question)+'</p></div>').join('')+b('닫기','close'));
}
function refreshGuestForReview(){
 if(pixelAccount.uid)return;
 const latest=pixelAccountGuest();
 if(latest && labSave.valid(latest))state=latest;
}
function newReview(){
 show('복습 관리','복습 등록','<form id="review-form"><label class="field">질문<textarea id="review-question" required maxlength="500" placeholder="예: 이 실험에서 대조군을 둔 이유는 무엇일까?"></textarea></label>'+
  '<label class="field">기억하고 싶은 답<textarea id="review-answer" required maxlength="4000"></textarea></label>'+
  '<label class="field">연결할 스킬<select id="review-focus">'+studioUI.optionList('',true)+'</select></label>'+
  '<p class="muteline">내일부터 오늘의 퀘스트 추첨에 들어가요. 문제를 열면 질문만 먼저 보여요.</p><button class="primary" type="submit">복습 카드 저장</button></form>');
 const form=$('review-form');
 form.oninput=e=>e.target.setCustomValidity('');
 form.onsubmit=async e=>{
  e.preventDefault();if(savingReview)return;
  for(const field of [$('review-question'),$('review-answer')]){
   if(!field.value.trim()){field.setCustomValidity('내용을 입력해 주세요.');field.reportValidity();return;}
  }
  const card={id:crypto.randomUUID(),question:$('review-question').value.trim(),answer:$('review-answer').value.trim(),
    focusSkill:$('review-focus').value||null,firstDue:reviewSchedule.addDays(reviewSchedule.today(),1),attempts:[]};
  const owner=pixelAccount.uid;refreshGuestForReview();
  state.reviews=[...(state.reviews||[]),card];savingReview=true;
  const submit=form.querySelector('button');submit.disabled=true;
  try{
   if(!await save(true))throw Error('storage');
   if(pixelAccount.uid===owner && form===$('review-form') && modal.open){
    modal.close();toast(reviewDate(card.firstDue)+'부터 복습 퀘스트로 뽑힐 수 있어요.');
   }
  }catch{
   if(pixelAccount.uid===owner){state.reviews=(state.reviews||[]).filter(c=>c.id!==card.id);toast('카드를 저장하지 못했어요. 다시 눌러 주세요.');}
  }finally{savingReview=false;submit.disabled=false;render();}
 };
 $('review-question').focus();
}
function openReview(id){
 const card=reviewById(id);if(!card)return;
 const {due,streak,finished}=reviewSchedule.progress(card);
 if(finished){reviewRecord(id);return;}
 const day=reviewSchedule.today();
 if(!dailyDraw(day).ids.includes(id) || due>day){render();return;}
 show('오늘의 복습 · '+streak+' / 4 연속 정답',card.question,'<label class="field">떠올린 답 <small>(선택)</small><textarea id="recall" maxlength="4000" placeholder="말로 떠올리거나 여기에 적어 보세요."></textarea></label>'+
  '<div class="actions">'+b('답 확인','compare-review','primary')+b('모르겠다','grade-no')+'</div>');
 currentReview={id,due,day};
}
function answerBlock(card){return '<div class="card-note review-answer"><span class="mini-label">기록해 둔 답</span><p>'+escapeHTML(card.answer)+'</p></div>';}
function currentTurn(){
 const round=currentReview,card=round && reviewById(round.id);
 const day=reviewSchedule.today();
 if(!card || round.day!==day || !dailyDraw(day).ids.includes(round.id) || reviewSchedule.progress(card).due!==round.due){
  if(modal.open)modal.close();render();toast('복습 일정이 바뀌었어요. 오늘의 복습을 확인해 주세요.');return null;
 }
 return {round,card};
}
function compareReview(){
 const turn=currentTurn();if(!turn)return;
 const {round,card}=turn, guess=$('recall').value.trim();
 show('오늘의 복습 · 답 비교',card.question,(guess?'<div class="review-guess"><small>떠올린 답</small><p>'+escapeHTML(guess)+'</p></div>':'')+
  answerBlock(card)+'<div class="actions">'+b('맞혔다','grade-yes','primary')+b('모르겠다','grade-no')+'</div>');
 currentReview=round;
}
async function gradeReview(correct){
 if(savingReview)return;
 refreshGuestForReview();
 const turn=currentTurn();if(!turn)return;
 const {round,card}=turn,owner=pixelAccount.uid,before=reviewSchedule.progress(card);
 const attempt={due:round.due,day:reviewSchedule.today(),correct};
 card.attempts.push(attempt);
 savingReview=true;
 const buttons=[...$('modal-body').querySelectorAll('button')];
 buttons.forEach(el=>el.disabled=true);
 try{
  if(!await save(true))throw Error('storage');
  if(owner!==pixelAccount.uid || !modal.open || currentReview!==round)return;
  const saved=reviewById(card.id),after=saved && reviewSchedule.progress(saved);
  if(!after){modal.close();return;}
  const [next]=dailyReviews(reviewSchedule.today()).remaining;
  const delta=after.xp-before.xp, heading=after.finished?'복습 완료 · 4회 연속 정답':after.streak?'연속 정답 '+after.streak+' / 4':'다시 복습';
  show(heading,card.question,answerBlock(saved)+'<p class="skill-result">'+
   (after.finished?'연구 일지의 완료한 복습에 남겼어요.':'다음 복습 · '+reviewDate(after.due))+
   (after.correctTurns>before.correctTurns?' · +'+studio.reviewPay+' token':'')+(delta>0?' · 복습 XP +'+delta:'')+'</p><div class="actions">'+(next?b('다음 질문','review','primary',next.card.id):'')+b('닫기','close')+'</div>');
 }catch{
  if(owner===pixelAccount.uid){
   const latest=reviewById(card.id);
   if(latest)latest.attempts=latest.attempts.filter(a=>a!==attempt);
   toast('복습 결과를 저장하지 못했어요. 다시 눌러 주세요.');
  }
 }finally{savingReview=false;buttons.forEach(el=>el.disabled=false);render();}
}
function reviewRecord(id){
 const card=reviewById(id);if(!card)return;
 const progress=reviewSchedule.progress(card);if(!progress.finished)return;
 show('완료한 복습 · '+reviewDate(progress.finished),card.question,answerBlock(card)+
  '<p class="skill-result">4회 연속 정답 · 복습 XP '+progress.xp+'</p>'+b('닫기','close'));
}
function quest(id){
 const q=find(id);if(!q)return;if(q.status==='done'){record(id);return}
 const t=tFor(q.track),intro='<p class="muteline">'+escapeHTML(questFocus(q))+' · 완료 보상 '+studio.questPay(q)+' token</p><p class="lead">'+escapeHTML(q.title?q.question:'연습 스킬 · '+t.skills[q.skill])+'</p>';
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
  const before=stats(q.track,q.skill).rank;const eligible=Object.keys(lootDefs).filter(x=>x!=='plant');const unseen=eligible.filter(x=>!state.inventory[x]);const item=(q.title===requests[0][0]||q.title==='사라진 한 프레임')?'lens':choose(unseen.length?unseen:eligible);
  Object.assign(q,{finding:evidence,verdict:$('verdict').value,rankBefore:before,rankAfter:Math.max(before,Number($('mastery').value)),loot:item,status:'done',ended:Date.now()});delete q.draft;state.inventory[item]=(state.inventory[item]||0)+1;save();render();reward(q);};
}
function itemBox(i){return '<div class="reward">'+sprite(i)+'<div><h3>'+lootDefs[i][0]+'</h3><p>'+lootDefs[i][1]+'</p></div></div>'}
function reward(q){const skill=tFor(q.track).skills[q.skill],a=q.rankBefore,z=q.rankAfter;
 show('퀘스트 완료','연구 성과를 획득했어요',itemBox(q.loot)+'<p class="skill-result"><b>+'+studio.questPay(q)+' token</b><br>'+escapeHTML(questFocus(q))+' · <strong>'+skill+'</strong> · 경험 +1<br>'+(a===z?ranks[z]+' 단계':ranks[a]+' → '+ranks[z])+'</p><div class="actions">'+b('책상에 놓기','place-loot','primary',q.loot)+b('연구 일지 보기','record','secondary',q.id)+'</div>');}
function record(id){const q=find(id);if(!q||q.status!=='done')return;const t=tFor(q.track);show('연구 일지 / '+new Date(q.ended).toLocaleDateString('ko-KR'),qTitle(q),
 '<dl class="record">'+[['질문',q.question],['시작 전 예측',q.prediction||'예측 보류'],['도전 카드',t.cards[q.card].join(' · ')],['결과',q.verdict],['관찰과 근거',q.finding],['연결한 스킬',questFocus(q)],['획득한 token',String(studio.questPay(q))],['성장',t.skills[q.skill]+' · 경험 +1 · '+ranks[q.rankAfter]]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+escapeHTML(v)+'</dd>').join('')+'</dl>'+itemBox(q.loot)+b('일지 목록','journal','secondary'));}
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
  return '<p class="save-summary">진행 중 '+(s.quests.length-done)+'개 · 완료 '+done+'개 · 복습 카드 '+(s.reviews||[]).length+'장<br>책상 왼쪽부터 '+slots.join(' · ')+'</p>';
}
function savePanel(message='') {
  pendingImport = null;
  const previous = !pixelAccount.uid && storedValue(previousKey);
  const webLink = localDemo ? '<p class="save-guide">이 파일에서 세이브를 내보낸 뒤, <a href="https://pixel-research-lab.github.io/pixel-research-lab/" target="_blank" rel="noopener">배포된 연구실 열기 ↗</a>에서 가져오세요.</p>' : (pixelAccount.uid ? '<p class="save-guide">같은 계정의 다른 기기와 자동 동기화됩니다. 파일로도 백업할 수 있어요.</p>' : '<p class="save-guide">로그인하면 같은 계정의 기기에서 이어 할 수 있어요.</p>'+b('계정 연결','account'));
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
 case 'studio':studioUI.shop();break;case 'axes':studioUI.settings();break;
 case 'new-review':newReview();break;
 case 'review-settings':reviewSettings();break;
 case 'review':openReview(arg);break;
 case 'upcoming':upcomingReviews();break;
 case 'compare-review':compareReview();break;
 case 'grade-yes':gradeReview(true);break;
 case 'grade-no':gradeReview(false);break;
 case 'review-record':reviewRecord(arg);break;
 case 'shift':recordShift(arg);break;
 case 'focus-clock':$('shift-main').focus();break;
 case 'account':accountPanel();break;
 case 'sign-in':pixelAccount.login(!!$('link-guest')?.checked).catch(e=>{const field=$('auth-feedback');if(field)field.textContent=e.code==='auth/popup-closed-by-user'?'로그인 창이 닫혔어요.':'로그인을 마치지 못했어요. 인터넷 연결과 팝업 허용을 확인해 주세요.';});break;
 case 'sign-out':pixelAccount.logout().catch(()=>toast('로그아웃을 완료하지 못했어요.'));break;
 case 'sync-now':pixelAccount.retry();break;
 case 'save-panel':savePanel();break;
 case 'export-save':labSave.download(state);$('transfer-info').textContent='세이브 파일을 내보냈어요.';break;
 case 'choose-save':$('save-file').click();break;
 case 'previous-save':try {previewImport(labSave.read(storedValue(previousKey)), true);} catch {savePanel('이전 세이브를 읽을 수 없어요.');}break;
 case 'apply-save':applyImport();break;
 case 'music':if(navigator.onLine){window.open('https://www.youtube.com/','_blank','noopener,noreferrer');}else{toast('스피커는 인터넷에 연결한 뒤 켤 수 있어요.');}break;
 case 'field':fieldForm();break;
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
  : '<p>같은 Google 계정으로 로그인하면 내 연구실을 이어갈 수 있어요. 새 계정은 빈 연구실로 시작해요.</p>'+
    (pixelAccountGuest()?'<label class="guest-import"><input id="link-guest" type="checkbox"> 이 브라우저의 게스트 기록도 내 계정으로 옮기기</label>':'')+b('Google로 로그인','sign-in','primary')+'<p id="auth-feedback" role="status"></p>';
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
async function commit(change){
 const uid=pixelAccount.uid;
 async function apply(){
   if(uid!==pixelAccount.uid)throw Error('계정이 변경됐어요. 다시 시도해 주세요.');
   refreshGuestForReview();
   const previous=state, next={...state};
   change(next);state=next;
   try{if(!await save(true))throw Error('변경 사항을 저장하지 못했어요.');}
   catch(err){if(uid===pixelAccount.uid && state===next)state=previous;throw err;}
   if(uid===pixelAccount.uid)render();
 }
 if(!uid && navigator.locks)return navigator.locks.request(key+'.edit',apply);
 return apply();
}
const studioUI=createStudioUI({getState:()=>state,show,toast,escapeHTML,commit});
const planner=createPlanner({getState:()=>state,show,toast,escapeHTML,commit});
pixelAccount.init({
 readGuest:pixelAccountGuest,
 claimGuest: guest=>{if(storedValue(key)===JSON.stringify(guest)){localStorage.removeItem(key);localStorage.removeItem(previousKey);}},
 guest:()=>{let g;try{g=JSON.parse(storedValue(key));}catch{}redraw(g&&labSave.valid(g)?g:blank());},
 busy:v=>{document.querySelector('main').inert=v;document.querySelector('header').inert=v;},
 closeAccount:()=>{planner.reset();if(modal.open)modal.close();toast('');redraw(blank());},
 apply:redraw,alert:toast,
 status:(s,email)=>{$('save-state').textContent=s;$('account-open').textContent=email?'내 계정':'로그인';if($('account-state'))$('account-state').textContent=s;}
});
if(!loaded)$('save-state').textContent='현재 창에만 저장';render();
roomImagesReady.then(()=>paintRoom(state.slots,new Date(),studio.wallet(state).fitted));
})();
