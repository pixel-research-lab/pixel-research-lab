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
  function progress(card) {
    // Replaying actual study days keeps later offline practice when the two devices'
    // schedules diverged. A second answer on the same day cannot advance the streak.
    const turns = [...card.attempts].sort((a,b)=>a.day.localeCompare(b.day) ||
      Number(a.correct)-Number(b.correct) || a.due.localeCompare(b.due));
    let due = card.firstDue, streak = 0, xp = 0, finished = null;
    for (const attempt of turns) {
      if (attempt.day < due) continue;
      if (attempt.correct) {
        streak++;
        xp = Math.max(xp, streak * 10);
      } else {
        xp = Math.max(xp, streak * 10 + 1);
        streak = 0;
      }
      if (streak === 4) { finished = attempt.day; due = null; break; }
      due = addDays(attempt.day, intervals[streak]);
    }
    return {due, streak, xp, finished};
  }
  return {today, addDays, valid, progress};
})();
