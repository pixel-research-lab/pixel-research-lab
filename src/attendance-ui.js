function createAttendanceUI({getState, show, commit}) {
  const labels = {start:'출근', pause:'휴식 시작', resume:'연구 재개', finish:'퇴근'};
  const two = value => String(value).padStart(2, '0');
  const localDay = date => [date.getFullYear(), two(date.getMonth()+1), two(date.getDate())].join('-');
  const localTime = date => attendance.time(date) + ':' + two(date.getSeconds());
  let selectedDay;

  function open(day = localDay(new Date())) {
    selectedDay = day;
    const date = new Date(day + 'T00:00:00'), now = new Date();
    const timeline = attendance.timeline(getState().attendance);
    const events = timeline.accepted.filter(event => localDay(new Date(event.at)) === day);
    const last = timeline.accepted.at(-1);
    const rows = events.map(event =>
      '<li><span>'+labels[event.action]+(event.conflicted?' · 기기 간 시각 충돌':'')+'</span><time>'+localTime(new Date(event.at))+'</time>'+
      '<button type="button" class="panel-action" data-time-edit="'+event.id+'">시각 수정</button></li>'
    ).join('');
    let weekTotal = 0;
    const week = Array.from({length:7}, (_,offset) => {
      const when = new Date(attendance.dayStart(now,-offset));
      const total = attendance.dayTotal(timeline, when, now.getTime());
      weekTotal += total;
      const dateKey = localDay(when);
      return '<button type="button" data-log-day="'+dateKey+'" aria-pressed="'+(day===dateKey)+'">'+
        '<span>'+when.toLocaleDateString('ko-KR',{month:'short',day:'numeric',weekday:'short'})+
        '</span><time>'+attendance.duration(total)+'</time></button>';
    }).join('');
    const canFinish = last && timeline.status !== 'idle' && day >= localDay(new Date(last.at));
    show('탁상시계','출퇴근 기록부',
      '<label class="field">기록 날짜<input id="log-date" type="date" value="'+day+'" max="'+localDay(now)+'"></label>'+
      '<div class="log-total"><b>이날 연구 시간</b><time>'+attendance.duration(attendance.dayTotal(timeline,date,now.getTime()))+'</time></div>'+
      (rows ? '<ul class="time-events">'+rows+'</ul>' : '<p class="muteline">이 날짜에 누른 출퇴근 동작이 없어요.</p>')+
      (canFinish ? '<button id="missing-finish" class="panel-action">빠뜨린 퇴근 입력</button>' : '')+
      '<div class="log-total week-total"><b>최근 7일 합계</b><time>'+attendance.duration(weekTotal)+'</time></div>'+
      '<div class="log-week">'+week+'</div>');
    const input = document.getElementById('log-date');
    input.onchange = () => {if (input.value && input.validity.valid) open(input.value);};
    document.querySelectorAll('[data-log-day]').forEach(b => b.onclick = () => open(b.dataset.logDay));
    document.querySelectorAll('[data-time-edit]').forEach(b => {
      b.onclick = () => edit(events.find(event => event.id === b.dataset.timeEdit), false);
    });
    const missing = document.getElementById('missing-finish');
    if (missing) missing.onclick = () => edit(last,true);
  }

  function edit(original, missing) {
    const initial = new Date(original.adjustedAt ?? original.at), now = new Date();
    if (missing) {
      const suggested = new Date(selectedDay + 'T18:00:00').getTime();
      initial.setTime(Math.min(now.getTime(), Math.max(original.at+1000, suggested)));
    }
    const format = date => localDay(date)+'T'+localTime(date);
    const label = missing ? '빠뜨린 퇴근 입력' : labels[original.action]+' 시각 수정';
    show('출퇴근 기록부', label,
      '<form id="edit-time"><label class="field">날짜와 시각<input type="datetime-local" step="1" required value="'+
      format(initial)+'"></label><p class="form-error" role="alert"></p><div class="actions">'+
      '<button type="submit" class="primary">저장</button><button type="button" class="secondary" id="back-log">취소</button></div></form>');
    const form = document.getElementById('edit-time'), input = form.querySelector('input');
    const initialValue = input.value;
    document.getElementById('back-log').onclick = () => open(selectedDay);
    form.onsubmit = async event => {
      event.preventDefault();
      const at = !missing && input.value === initialValue
        ? initial.getTime() : new Date(input.value).getTime();
      const finishId = missing ? crypto.randomUUID() : null;
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await commit(s => {s.attendance = attendance.correct(s.attendance || [], original, at, finishId);});
        if (form.isConnected && document.getElementById('modal').open) open(localDay(new Date(at)));
      } catch (error) {
        form.querySelector('[role="alert"]').textContent = error.message;
      } finally {button.disabled = false;}
    };
  }
  return {open};
}
