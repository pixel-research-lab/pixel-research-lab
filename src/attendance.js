// Study time is reconstructed from button presses, including presses made offline.
const attendance = (() => {
  const actions = ['start', 'pause', 'resume', 'finish'];
  const next = {
    idle: {start:'working'},
    working: {pause:'paused', finish:'idle'},
    paused: {resume:'working', finish:'idle'}
  };
  function valid(events) {
    if (!Array.isArray(events)) return false;
    const ids = new Set();
    for (const event of events) {
      if (!event || typeof event.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(event.id) ||
          ids.has(event.id) || !actions.includes(event.action) ||
          (event.adjustedAt !== undefined && (!Number.isSafeInteger(event.adjustedAt) || event.adjustedAt <= 0 || event.adjustedAt > 8640000000000000)) ||
          !Number.isSafeInteger(event.at) || event.at <= 0 || event.at > 8640000000000000) return false;
      ids.add(event.id);
    }
    return true;
  }
  function timeline(events = []) {
    const ordered = [...events].sort((a,b) => a.at - b.at || (a.id < b.id ? -1 : 1));
    const actionsInOrder = [];
    let status = 'idle';
    for (const event of ordered) {
      const target = next[status][event.action];
      if (!target) continue;
      actionsInOrder.push(event);
      status = target;
    }
    // Original presses define session order. Independent offline edits can cross.
    // Keep both requested times, but calculate with the original times at conflicting boundaries.
    const times = actionsInOrder.map(e => e.adjustedAt ?? e.at);
    for (let i = 1; i < times.length; i++) {
      if (times[i] > times[i-1]) continue;
      if (times[i] === actionsInOrder[i].at && times[i-1] === actionsInOrder[i-1].at) continue;
      times[i-1] = actionsInOrder[i-1].at;
      times[i] = actionsInOrder[i].at;
      i = Math.max(0,i-2);
    }
    const accepted = actionsInOrder.map((e,i) => e.adjustedAt === undefined ? e : {
      ...e, at:times[i], recordedAt:e.at, conflicted:times[i] !== e.adjustedAt
    });
    const spans = [];
    let since = null;
    for (const e of accepted) {
      if (since !== null) spans.push([since,e.at]);
      since = ['start','resume'].includes(e.action) ? e.at : null;
    }
    return {status, since, spans, accepted};
  }
  function correct(events, original, at, finishId, now = Date.now()) {
    if (!Number.isSafeInteger(at) || at <= 0 || at > now)
      throw Error('현재 시각보다 늦은 기록을 저장할 수 없어요.');
    const before = timeline(events);
    const edit = !finishId;
    const target = edit ? before.accepted.find(e => e.id === original.id) : before.accepted.at(-1);
    if (!target || target.id !== original.id || target.at !== original.at || target.adjustedAt !== original.adjustedAt ||
        target.action !== original.action || (!edit && before.status === 'idle'))
      throw Error('출퇴근 기록이 바뀌었어요. 기록부를 다시 열어 주세요.');
    if (edit) {
      const i = before.accepted.indexOf(target);
      if (at <= (before.accepted[i-1]?.at ?? 0) || at >= (before.accepted[i+1]?.at ?? Infinity))
        throw Error('출근·휴식·재개·퇴근 순서를 유지하는 시각을 입력해 주세요.');
    } else if (at <= target.at) throw Error('퇴근은 마지막 동작보다 뒤여야 해요.');
    const recorded = Math.max(at, (target.recordedAt ?? target.at)+1);
    const updated = edit ? events.map(e => e.id === target.id ? {...e, adjustedAt:at} : e)
      : [...events, {id:finishId,action:'finish',at:recorded,adjustedAt:at}];
    const expected = before.accepted.map(e => e.id);
    if (!edit) expected.push(finishId);
    const actual = timeline(updated).accepted;
    if (expected.length !== actual.length || actual.some((e,i) => e.id !== expected[i]) ||
        actual.find(e => e.id === (finishId || target.id))?.at !== at)
      throw Error('출근·휴식·재개·퇴근 순서를 유지하는 시각을 입력해 주세요.');
    return updated;
  }
  function dayStart(date, offset = 0) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset).getTime();
  }
  function dayTotal(timeline, date, now) {
    const from = dayStart(date), to = Math.min(now, dayStart(date,1));
    const overlap = (a,b) => Math.max(0, Math.min(b,to) - Math.max(a,from));
    let total = timeline.since === null ? 0 : overlap(timeline.since,now);
    for (const [a,b] of timeline.spans) total += overlap(a,b);
    return total;
  }
  const two = n => String(n).padStart(2,'0');
  function duration(ms) {
    const seconds = Math.floor(ms/1000);
    return [Math.floor(seconds/3600), Math.floor(seconds/60)%60, seconds%60].map(two).join(':');
  }
  function time(date) {return two(date.getHours()) + ':' + two(date.getMinutes());}
  return {valid, correct, timeline, dayStart, dayTotal, duration, time, next};
})();
