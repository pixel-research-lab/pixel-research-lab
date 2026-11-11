function createPlanner({getState, commit, show, toast, escapeHTML:esc}) {
  const $=id=>document.getElementById(id);
  const cal=labCalendar;
  let selected=cal.day(), access=null, calendars=[], message='', running=null, lastSync=new Map(), timer;
  let boardCount=0, stickyDay='', stickyOwner=null;
  const owner=()=>window.pixelAccount.uid;
  const choice=()=>getState().calendarChoice;
  const action=(name,label,arg='',cls='secondary')=>'<button type="button" class="'+cls+'" data-plan="'+name+'" data-value="'+esc(arg)+'">'+esc(label)+'</button>';
  const shortDate=date=>new Date(date+'T12:00:00').toLocaleDateString('ko-KR',{month:'short',day:'numeric'});
  const time=iso=>new Date(iso).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const prefix=uid=>'pixel-lab.calendar.queue:'+encodeURIComponent(uid)+':';
  function pending(uid=owner()) {
    if(!uid)return [];
    const list=[],start=prefix(uid);
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith(start)){
        const record=JSON.parse(localStorage.getItem(key));
        if(record && cal.validEvent(record.event))list.push(record);
      }
    }
    return list;
  }
  function writeQueue(uid,record){
    localStorage.setItem(prefix(uid)+record.event.key,JSON.stringify(record));
  }
  function queueChange(uid, action){
    // All tabs use the same lock for a compare-and-remove or replacement.
    return navigator.locks.request(prefix(uid),action);
  }
  function latest(uid,record) {
    return JSON.parse(localStorage.getItem(prefix(uid)+record.event.key))?.ticket===record.ticket;
  }
  function events(){
    const rows=new Map((getState().agendaEvents||[]).map(e=>[e.key,e]));
    for(const edit of pending())rows.set(edit.event.key,edit.event);
    return [...rows.values()].filter(e=>!e.removed && (!e.calendar || e.calendar===choice()?.id))
      .sort((a,b)=>cal.days(a)[0].localeCompare(cal.days(b)[0]) || Number(b.allDay)-Number(a.allDay) ||
        a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
  }
  function put(state, replacements) {
    const rows=new Map((state.agendaEvents||[]).map(e=>[e.key,e]));
    for(const event of replacements)rows.set(event.key,event);
    state.agendaEvents=[...rows.values()];
  }
  function eventRow(event,label,color) {
    const done=getState().agendaDone?.[event.key];
    return '<button type="button" data-plan="event" data-value="'+esc(event.key)+'" class="agenda-row'+(done?' is-done':'')+'">'+
      '<i aria-hidden="true" style="--paper-color:'+color+'">'+(done?'✓':'')+'</i><span><small>'+esc(label)+'</small>'+
      '<strong>'+esc(event.title)+'</strong></span></button>';
  }
  function when(e){return e.allDay?'종일':time(e.start);}
  function deskNotes(today,rows){
    const area=$('monitor-notes'), desired=new Map(rows.filter(r=>!getState().agendaDone?.[r.key]).map(e=>[e.key,e]));
    if(stickyDay!==today || stickyOwner!==owner()){
      area.replaceChildren();stickyDay=today;stickyOwner=owner();
    }
    for(const note of area.querySelectorAll('button')){
      if(desired.has(note.dataset.value))continue;
      if(getState().agendaDone?.[note.dataset.value]){
        const ghost=document.createElement('i');
        ghost.className='note-fall';ghost.style.background=note.style.backgroundColor;
        const frame=$('room-art').getBoundingClientRect(),rect=note.getBoundingClientRect();
        Object.assign(ghost.style,{left:(rect.left-frame.left)+'px',top:(rect.top-frame.top)+'px',width:rect.width+'px',height:rect.height+'px'});
        area.parentNode.append(ghost);setTimeout(()=>ghost.remove(),450);
      }
      note.remove();
    }
    rows.forEach((e,i)=>{
      if(!desired.has(e.key))return;
      let el=area.querySelector('[data-value="'+e.key+'"]');
      if(!el){el=document.createElement('button');el.type='button';el.dataset.plan='event';el.dataset.value=e.key;area.append(el);}
      el.style.order=i;el.style.backgroundColor=cal.colors[i%cal.colors.length];
      el.title=e.title;el.setAttribute('aria-label','포스트잇 · '+e.title);
    });
  }
  function paint(today=cal.day(),count=boardCount){
    boardCount=count;
    const all=events(),rows=all.filter(e=>cal.overlaps(e,today,today)),open=rows.filter(e=>!getState().agendaDone?.[e.key]);
    const labels=new Map(rows.map((e,i)=>[e.key,cal.colors[i%cal.colors.length]]));
    const row=e=>eventRow(e,when(e),labels.get(e.key));
    $('agenda-date').textContent=shortDate(today);
    $('agenda-today').innerHTML=rows.map(row).join('') || '<p class="agenda-empty">오늘 예정된 일정이 없어요.</p>';
    const important=all.filter(e=>getState().agendaStars?.[e.key] && !getState().agendaDone?.[e.key] && cal.days(e)[1]>=today);
    $('agenda-important').innerHTML=important.map(e=>eventRow(e,shortDate(cal.days(e)[0]),labels.get(e.key)||'#e8cc8e')).join('') ||
      '<p class="agenda-empty">별표를 켠 예정 일정이 여기에 보여요.</p>';
    $('schedule-quests').hidden=!open.length;
    $('schedule-quests').innerHTML=open.length?'<div class="running-label">오늘의 일정 퀘스트</div>'+open.map(row).join(''):'';
    $('active-counter').textContent='진행 '+(boardCount+open.length);
    deskNotes(today,rows);
    if($('modal').open && $('planner-month'))monthView();
    if($('modal').open && $('planner-detail'))detail($('planner-detail').dataset.key);
  }
  function monthView(){
    const month=selected.slice(0,7),[first,end]=cal.monthBounds(month),all=events(),today=cal.day();
    const cells=Array(first.getDay()).fill('<span aria-hidden="true"></span>');
    for(let i=1;i<=new Date(+end-1).getDate();i++){
      const date=month+'-'+String(i).padStart(2,'0'),rows=all.filter(e=>cal.overlaps(e,date,date));
      cells.push('<button type="button" class="cal-day" data-plan="day" data-value="'+date+'" aria-label="'+date+' 일정 '+rows.length+'개"'+
        (date===today?' aria-current="date"':'')+' aria-pressed="'+(date===selected)+'"><span>'+i+'</span>'+
        (rows.length?'<small>'+rows.length+'</small>':'')+'</button>');
    }
    const rows=all.filter(e=>cal.overlaps(e,selected,selected)),current=choice(),queue=pending().length;
    const name=current?current.name:'연구실 일정';
    const offline=navigator.onLine?'':'오프라인';
    const cached=current && !offline && (!access || access.until<=Date.now())?'저장된 일정 · Google 재연결 필요':'';
    const info=[name,offline,cached,queue?'Google 반영 대기 '+queue+'건':'',message].filter(Boolean).map(esc).join(' · ');
    show('연구실 일정','벽 캘린더','<div id="planner-month"><div class="cal-nav">'+action('prev','‹ 이전')+
      '<strong>'+first.getFullYear()+'년 '+(first.getMonth()+1)+'월</strong>'+action('next','다음 ›')+action('today','오늘','','textbtn')+'</div>'+
      '<div class="cal-grid">'+['일','월','화','수','목','금','토'].map(d=>'<b>'+d+'</b>').join('')+cells.join('')+'</div>'+
      '<div class="cal-day-heading"><b>'+shortDate(selected)+' 일정</b>'+action('add','＋ 일정 추가','','textbtn')+'</div>'+
      (rows.map((e,i)=>eventRow(e,when(e),cal.colors[i%cal.colors.length])).join('')||'<p class="agenda-empty">등록한 일정이 없어요.</p>')+
      (pending().filter(r=>r.event.calendar===current?.id).length?'<details class="cal-pending"><summary>대기 중인 수정</summary>'+
        pending().filter(r=>r.event.calendar===current?.id).map(r=>action('event',r.event.title,r.event.key,'textbtn')).join('')+'</details>':'')+
      '<div class="cal-tools"><small role="status">'+info+'</small><div class="actions">'+
      action('connections','캘린더 연결','','textbtn')+(current?action('refresh','새로고침','','textbtn'):'')+'</div></div></div>');
  }
  function showMonth(date){
    selected=date;monthView();scheduleSync();
  }
  function detail(key){
    const e=events().find(x=>x.key===key);
    if(!e){monthView();return;}
    const [start,end]=cal.days(e),dates=shortDate(start)+(end!==start?' – '+shortDate(end):'');
    const done=!!getState().agendaDone?.[key],star=!!getState().agendaStars?.[key];
    const edit=pending().find(w=>w.event.key===key);
    show('일정 퀘스트',e.title,'<div id="planner-detail" data-key="'+key+'"><p>'+dates+' · '+
      (e.allDay?'종일':time(e.start)+' – '+time(e.end))+' · '+esc(e.calendar?choice()?.name:'연구실 일정')+'</p>'+
      '<div class="actions">'+action('complete',done?'완료 취소':'퀘스트 완료',key,'primary')+
      action('star',star?'★ 중요 해제':'☆ 중요 표시',key)+
      ((!e.calendar||choice()?.writable)?action('edit','일정 수정',key):'')+
      action('month','달력 보기',start,'textbtn')+'</div>'+
      (edit?'<p class="muteline">'+(edit.conflict?'Google에서 일정이 바뀌었어요. 어떤 내용을 유지할지 골라 주세요.':'Google 반영 대기 중이에요.')+'</p>'+
        (edit.conflict?'<div class="actions">'+action('remote','Google 변경 사용',key)+(edit.remote?action('mine','내 수정 적용',key):'')+'</div>':''):'')+'</div>');
  }
  function localStamp(value) {
    const date=new Date(value);
    return cal.day(date)+'T'+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
  }
  function form(e){
    const current=choice(), writable=owner() && current?.writable, editing=!!e;
    const start=e?cal.days(e)[0]:selected, last=e?cal.days(e)[1]:selected;
    const endDate=e && !e.allDay?cal.day(new Date(e.end)):last;
    const origin=editing?e.calendar:(writable?current.id:'');
    show('벽 캘린더',editing?'일정 수정':'일정 추가','<form id="agenda-form"><label class="field">제목<input type="text" name="title" maxlength="4096" required value="'+esc(e?.title||'')+'"></label>'+
      '<label class="field">캘린더<select name="source"'+(editing?' disabled':'')+'><option value="">연구실 일정</option>'+
      (writable||origin?'<option value="'+esc(current.id)+'"'+(origin?' selected':'')+'>'+esc(current.name)+' · Google</option>':'')+'</select></label>'+
      '<label class="planner-check"><input type="checkbox" name="allDay"'+(!e||e.allDay?' checked':'')+'>종일</label>'+
      '<div class="cal-dates"><label class="field">시작일<input type="date" required name="first" value="'+start+'"></label>'+
      '<label class="field">종료일<input type="date" required name="last" value="'+endDate+'"></label>'+
      '<label class="field clock-field">시작 시각<input type="time" name="fromTime" value="'+(e&&!e.allDay?localStamp(e.start).slice(11):'09:00')+'"></label>'+
      '<label class="field clock-field">종료 시각<input type="time" name="toTime" value="'+(e&&!e.allDay?localStamp(e.end).slice(11):'10:00')+'"></label></div>'+
      '<label class="planner-check"><input type="checkbox" name="star"'+(getState().agendaStars?.[e?.key]?' checked':'')+'>★ 중요한 일정</label>'+
      '<p class="muteline" id="agenda-error" role="status"></p><button class="primary" type="submit">일정 저장</button></form>');
    const el=$('agenda-form'),f=el.elements;
    const clocks=()=>el.querySelectorAll('.clock-field').forEach(label=>{label.hidden=f.allDay.checked;label.firstElementChild.required=!f.allDay.checked;});
    clocks();f.allDay.onchange=clocks;
    f.first.onchange=()=>{if(f.last.value<f.first.value)f.last.value=f.first.value;};
    f.title.focus();
    const uid=owner(), newId=crypto.randomUUID();
    el.onsubmit=async ev=>{
      ev.preventDefault();
      const button=el.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
      try{
        if(uid!==owner())return;
        const target=f.source.value, allDay=f.allDay.checked, id=e?.id || newId.replaceAll('-','');
        const key=e?.key || (target?await cal.googleKey(target,id):'l-'+newId);
        const event={...e,key,id,calendar:target,title:f.title.value.trim(),allDay,
          start:allDay?f.first.value:new Date(f.first.value+'T'+f.fromTime.value).toISOString(),
          end:allDay?reviewSchedule.addDays(f.last.value,1):new Date(f.last.value+'T'+f.toTime.value).toISOString()};
        if(!event.title || !cal.validEvent(event))throw Error('제목과 시작·종료 일시를 확인해 주세요.');
        if(owner()!==uid || el!==$('agenda-form'))return;
        if(target && (!uid || target!==choice()?.id || !choice().writable))throw Error('편집할 캘린더를 다시 선택해 주세요.');
        const previous=e && pending().find(r=>r.event.key===key);
        if(previous?.conflict)throw Error('일정 상세에서 Google 변경을 먼저 확인해 주세요.');
        const star=f.star.checked;
        const record={event,ticket:crypto.randomUUID()};
        if(target)await queueChange(uid,()=>writeQueue(uid,record));
        if(owner()!==uid)return;
        try{
          await commit(s=>{
            if(!target)put(s,[event]);
            if(star || !!s.agendaStars?.[key])s.agendaStars={...s.agendaStars,[key]:star};
          });
        }catch(err){
          if(target)await queueChange(uid,()=>{
            if(!latest(uid,record))return;
            if(previous)writeQueue(uid,previous);else localStorage.removeItem(prefix(uid)+key);
          });
          throw err;
        }
        if(owner()!==uid || el!==$('agenda-form'))return;
        selected=cal.days(event)[0];monthView();paint();
        if(target && navigator.onLine && !access?.write){connections();return;}
        if(target)scheduleSync(true);
      }catch(err){$('agenda-error') && ($('agenda-error').textContent=err instanceof RangeError?'날짜와 시각을 확인해 주세요.':err.message);}
      finally{button.disabled=false;}
    };
  }
  function connections() {
    const current=choice();
    const list=calendars.length?'<label class="field">Google 캘린더<select id="calendar-choice"><option value="">연구실 일정만</option>'+
      calendars.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===current?.id?' selected':'')+'>'+esc(c.name)+(c.writable?'':' · 읽기 전용')+'</option>').join('')+'</select></label>'+
      action('choose','선택 저장','','primary'):'';
    show('벽 캘린더','캘린더 연결','<div id="calendar-connections"><p>고른 캘린더의 오늘 일정이 퀘스트와 모니터에 표시돼요. 완료와 별표는 내 연구실에 기록해요.</p>'+
      (owner()?list+'<div class="actions">'+action('read','Google 일정 읽기 연결')+
        (current?.writable?action('write','Google 일정 편집 연결'):'')+
        (current?action('disconnect','선택 해제','','textbtn'):'')+'</div>':
        '<button type="button" class="primary" data-do="account">Google 로그인</button>')+
      '<p id="calendar-status" class="muteline" role="status">'+esc(message)+'</p>'+action('month','달력으로','','textbtn')+'</div>');
  }
  function explain(err) {
    if(!navigator.onLine)return '오프라인이에요. 저장한 기록은 연결 후 반영할 수 있어요.';
    if(err.status===401 || err.status===403)return 'Google 권한을 확인해 주세요. 캘린더 연결에서 다시 연결할 수 있어요.';
    if(err.code==='auth/popup-closed-by-user')return '연결 창을 닫았어요.';
    if(err.code==='auth/user-mismatch')return '연구실에 로그인한 Google 계정을 선택해 주세요.';
    if(err.code==='auth/unauthorized-domain')return '이 주소의 Google 로그인이 허용되지 않았어요. 배포 주소나 localhost에서 열어 주세요.';
    if(err.code==='auth/popup-blocked')return '브라우저에서 로그인 팝업을 허용한 뒤 다시 눌러 주세요.';
    return 'Google 캘린더에 연결할 수 없어요. 연결 상태와 권한을 확인한 뒤 다시 시도해 주세요.';
  }
  async function connect(write){
    if(!navigator.onLine){message=explain({});connections();return;}
    const uid=owner();if(!uid)return;
    try{
      const grant=await pixelAccount.calendarAccess(write);
      if(uid!==owner() || grant.uid!==uid)return;
      const choices=await cal.calendars(grant.token);
      if(uid!==owner())return;
      calendars=choices;access={...grant,until:Date.now()+55*60000};
      message=write?'편집 권한을 연결했어요.':'표시할 캘린더를 선택해 주세요.';
      connections();scheduleSync(true);
    }catch(err){if(owner()===uid){message=explain(err);connections();}}
  }
  let followup=false;
  function scheduleSync(force=false) {
    if(running){followup=true;return;}
    clearTimeout(timer);timer=setTimeout(()=>sync(force),100);
  }
  async function sync(force) {
    const uid=owner(),current=choice(),session=access;
    if(!uid || !current || !session || session.uid!==uid || !navigator.onLine)return;
    if(session.until<=Date.now()){access=null;message='Google 연결 시간이 끝났어요. 다시 연결해 주세요.';paint();return;}
    const valid=()=>owner()===uid && choice()?.id===current.id && session===access;
    const token=session.token;
    const job={};running=job;
    try{
      if(session.write && current.writable){
        for(const edit of pending(uid)){
          if(!valid())return;
          if(edit.event.calendar!==current.id || edit.conflict || !latest(uid,edit))continue;
          const result=await cal.upload(token,edit.event);
          if(!valid() || !latest(uid,edit))continue;
          if(result.conflict){
            await queueChange(uid,()=>{if(latest(uid,edit))writeQueue(uid,{...edit,conflict:true,remote:result.event});});
            continue;
          }
          if(!result.event)throw Error('missing-event');
          await commit(s=>put(s,[result.event]));
          await queueChange(uid,()=>{if(valid() && latest(uid,edit))localStorage.removeItem(prefix(uid)+edit.event.key);});
        }
      }
      const months=new Set([cal.day().slice(0,7), selected.slice(0,7)]);
      for(const month of months){
        if(!valid())return;
        const cacheKey=current.id+'|'+month;
        if(!force && Date.now()-(lastSync.get(cacheKey)||0)<60000)continue;
        const [first,end]=cal.monthBounds(month);
        const old=(getState().agendaEvents||[]).filter(e=>e.calendar===current.id && cal.overlaps(e,cal.day(first),cal.day(new Date(+end-1))));
        const fresh=await cal.monthEvents(token,current.id,month);
        const present=new Set(fresh.map(e=>e.key));
        for(const missing of old.filter(e=>!present.has(e.key))){
          if(!valid())return;
          // A missing instance can have moved outside this month rather than been cancelled.
          const moved=await cal.getEvent(token,missing);
          fresh.push(moved || {...missing,removed:true,updated:Math.max(Date.now(),missing.updated||0)});
        }
        if(!valid())return;
        const cached=new Map((getState().agendaEvents||[]).map(e=>[e.key,e]));
        const changes=fresh.filter(e=>{
          const previous=cached.get(e.key);
          return !previous || (e.updated>=previous.updated && (e.etag!==previous.etag || !!e.removed!==!!previous.removed));
        });
        if(changes.length)await commit(s=>put(s,changes));
        lastSync.set(cacheKey,Date.now());
      }
      if(valid())message=pending(uid).some(r=>r.conflict && r.event.calendar===current.id)?'편집 충돌이 있어요. 대기 중인 수정에서 확인해 주세요.':'Google 일정 동기화 완료';
    }catch(err){
      if(valid()){message=explain(err);if(err.status===401)access=null;}
    }finally{
      if(running===job){running=null;paint();if(followup){followup=false;scheduleSync(true);}}
    }
  }
  async function resolve(key,keep){
    const uid=owner(),record=pending().find(r=>r.event.key===key);
    if(!record?.conflict)return;
    const remote=record.remote;
    if(keep){
      if(!remote)return;
      await queueChange(uid,()=>{if(latest(uid,record))writeQueue(uid,{ticket:crypto.randomUUID(),event:{...record.event,etag:remote.etag}});});
    }else{
      await commit(s=>put(s,[remote||{...record.event,removed:true,updated:Date.now()}]));
      await queueChange(uid,()=>{if(owner()===uid && latest(uid,record))localStorage.removeItem(prefix(uid)+key);});
    }
    if(owner()===uid){paint();monthView();scheduleSync(true);}
  }
  async function handle(name,arg){
    const currentEvent=()=>events().find(e=>e.key===arg);
    switch(name){
    case 'wall':case 'today':showMonth(cal.day());break;
    case 'month':showMonth(arg || selected);break;
    case 'day':showMonth(arg);break;
    case 'prev':case 'next':{
      const first=cal.monthBounds(selected.slice(0,7))[0];first.setMonth(first.getMonth()+(name==='next'?1:-1));showMonth(cal.day(first));break;
    }
    case 'event':detail(arg);break;
    case 'new-today':selected=cal.day();form();break;
    case 'add':form();break;
    case 'edit':if(currentEvent())form(currentEvent());break;
    case 'complete':case 'star':{
      if(!currentEvent())return;
      const field=name==='complete'?'agendaDone':'agendaStars';
      const uid=owner(),value=!getState()[field]?.[arg];
      await commit(s=>{s[field]={...s[field],[arg]:value};});
      if(owner()!==uid)return;
      if(name==='complete' && value){$('modal').close();toast('일정 퀘스트를 완료했어요.');}
      paint();break;
    }
    case 'connections':connections();break;
    case 'refresh':if(!access || access.until<=Date.now()){connections();}else scheduleSync(true);break;
    case 'read':await connect(false);break;
    case 'write':await connect(true);break;
    case 'choose':case 'disconnect':{
      const current=name==='choose'?calendars.find(c=>c.id===$('calendar-choice').value):null;
      const uid=owner();
      await commit(s=>{s.calendarChoice=current||null;});
      if(owner()!==uid)return;
      message='';monthView();paint();scheduleSync(true);break;
    }
    case 'remote':case 'mine':await resolve(arg,name==='mine');break;
    }
  }
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-plan]');
    if(target)handle(target.dataset.plan,target.dataset.value).catch(()=>toast('일정을 저장하지 못했어요. 저장 공간과 연결 상태를 확인해 주세요.'));
  });
  window.addEventListener('online',()=>scheduleSync(true));
  window.addEventListener('offline',()=>paint());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync();});
  window.addEventListener('storage',e=>{if(owner() && e.key?.startsWith(prefix(owner())))paint();});
  setInterval(()=>{if(!document.hidden)scheduleSync();},5*60000);
  return {paint,reset(){access=null;calendars=[];message='';lastSync.clear();selected=cal.day();clearTimeout(timer);}};
}
