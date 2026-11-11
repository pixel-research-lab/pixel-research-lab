// Review intervals are calendar days in the researcher's local time zone.
const reviewSchedule = (() => {
  const intervals = [1, 3, 7, 14];
  function today(date = new Date()) {
    const two = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate());
  }
  function addDays(day, count) {
    const date = new Date(day + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0,10);
  }
  function validDay(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(day + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === day;
  }
  const defaultLimit = 6;
  // One saved draw must fit the sync record's 100,000-character JSON limit
  // even when every imported card ID has the maximum length (100).
  const maxLimit = 970;
  function validLimit(value) {
    return Number.isSafeInteger(value) && value >= 1 && value <= maxLimit;
  }
  function validDraw(draw) {
    return draw && Number.isSafeInteger(draw.createdAt) && draw.createdAt > 0 && validDay(draw.day) && Array.isArray(draw.ids) && validLimit(draw.ids.length) &&
      draw.ids.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) &&
      new Set(draw.ids).size === draw.ids.length;
  }
  function valid(cards) {
    if (!Array.isArray(cards)) return false;
    const ids = new Set();
    for (const card of cards) {
      if (!card || typeof card.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(card.id) || ids.has(card.id) ||
          typeof card.question !== 'string' || !card.question.trim() || card.question.length > 500 ||
          typeof card.answer !== 'string' || !card.answer.trim() || card.answer.length > 4000 ||
          !validDay(card.firstDue) || !Array.isArray(card.attempts)) return false;
      ids.add(card.id);
      const days = new Set();
      for (const attempt of card.attempts) {
        if (!attempt || !validDay(attempt.due) || !validDay(attempt.day) || attempt.day < attempt.due ||
            typeof attempt.correct !== 'boolean' || days.has(attempt.due)) return false;
        days.add(attempt.due);
      }
    }
    return true;
  }
  function progress(card, beforeDay) {
    // Replaying actual study days keeps later offline practice when the two devices'
    // schedules diverged. A second answer on the same day cannot advance the streak.
    const turns = [...card.attempts].sort((a,b)=>a.day.localeCompare(b.day) ||
      Number(a.correct)-Number(b.correct) || a.due.localeCompare(b.due));
    let due = card.firstDue, streak = 0, xp = 0, finished = null, retry = false, correctTurns = 0;
    for (const attempt of turns) {
      if (beforeDay && attempt.day >= beforeDay) break;
      if (attempt.day < due) continue;
      retry = !attempt.correct;
      if (attempt.correct) {
        streak++; correctTurns++;
        xp = Math.max(xp, streak * 10);
      } else {
        xp = Math.max(xp, streak * 10 + 1);
        streak = 0;
      }
      if (streak === 4) { finished = attempt.day; due = null; break; }
      due = addDays(attempt.day, intervals[streak]);
    }
    return {due, streak, xp, finished, retry, correctTurns};
  }
  function dailyRandom(day, id) {
    // The same dated card gets the same uniform score regardless of device or input order.
    let hash = 2166136261;
    for (const char of day + '/' + id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return (((hash ^ (hash >>> 16)) >>> 0) + 1) / 4294967297;
  }
  function draw(cards, day, limit) {
    const candidates = [];
    const dayTime = Date.parse(day);
    for (const card of cards) {
      // Today's answers count toward completion, never toward selecting replacements.
      const {due, retry} = progress(card, day);
      if (!due || due > day) continue;
      const overdueDays = (dayTime - Date.parse(due)) / 86400000;
      const score = -Math.log(dailyRandom(day, card.id)) / (1 + Math.sqrt(overdueDays));
      candidates.push({id:card.id, retry, due, score});
    }
    candidates.sort((a,b) => Number(b.retry) - Number(a.retry) ||
      (a.retry && b.retry ? a.due.localeCompare(b.due) : 0) ||
      a.score - b.score || (a.id < b.id ? -1 : Number(a.id > b.id)));
    return {day, ids:candidates.slice(0, limit).map(card => card.id)};
  }
  return {today, addDays, valid, progress, defaultLimit, maxLimit, validLimit, validDraw, draw};
})();
