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
          !Number.isSafeInteger(event.at) || event.at <= 0 || event.at > 8640000000000000) return false;
      ids.add(event.id);
    }
    return true;
  }
  function timeline(events = []) {
    const ordered = [...events].sort((a,b) => a.at - b.at || (a.id < b.id ? -1 : 1));
    const spans = [], accepted = [];
    let status = 'idle', since = null;
    for (const event of ordered) {
      const target = next[status][event.action];
      if (!target) continue;
      if (status === 'working') spans.push([since, event.at]);
      status = target;
      since = status === 'working' ? event.at : null;
      accepted.push(event);
    }
    return {status, since, spans, accepted};
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
  return {valid, timeline, dayStart, dayTotal, duration, time, next};
})();
