// Used by both the original standalone demo and the hosted game.
const labSave = (() => {
  function valid(s) {
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const between = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
    const knownItem = id => typeof id === 'string' && Object.hasOwn(lootDefs, id);
    const offerIndex = n => between(n, 0, requests.length - 1);
    if (!object(s) || s.version !== 1 || !Array.isArray(s.quests) || !object(s.inventory) ||
        !Array.isArray(s.slots) || s.slots.length !== 3 || !offerIndex(s.offer) ||
        !Array.isArray(s.seenOffers) || !s.seenOffers.every(offerIndex)) return false;
    if ('attendance' in s && !attendance.valid(s.attendance)) return false;
    for (const [id, count] of Object.entries(s.inventory)) {
      if (!knownItem(id) || !Number.isSafeInteger(count) || count < 0) return false;
    }
    for (const id of s.slots) {
      if (id !== null && (!knownItem(id) || s.slots.filter(slot => slot === id).length > (s.inventory[id] || 0))) return false;
    }
    const ids = new Set();
    for (const q of s.quests) {
      if (!object(q) || typeof q.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(q.id) || ids.has(q.id)) return false;
      ids.add(q.id);
      const track = tracks.find(t => t.id === q.track);
      if (!track || !between(q.skill,0,track.skills.length-1) || !['ready','active','done'].includes(q.status) ||
          typeof q.question !== 'string' || !Number.isFinite(q.created)) return false;
      for (const name of ['title','prediction','predictionDraft','finding','verdict']) {
        if (name in q && typeof q[name] !== 'string') return false;
      }
      if ('draft' in q && (!object(q.draft) || typeof q.draft.finding !== 'string' ||
          typeof q.draft.verdict !== 'string' || !['1','2','3'].includes(q.draft.mastery))) return false;
      if (q.status !== 'ready' && !between(q.card,0,track.cards.length-1)) return false;
      if (q.status === 'done' && (!knownItem(q.loot) || !between(q.rankAfter,0,ranks.length-1) ||
          !between(q.rankBefore,0,ranks.length-1) || !Number.isFinite(q.ended))) return false;
    }
    return true;
  }
  function read(text) {
    const record = JSON.parse(text);
    const state = record?.format === 'pixel-research-lab' && record.formatVersion === 1 ? record.state : record;
    if (!valid(state)) throw new Error('픽셀 연구실 1단계 세이브 파일인지 확인해 주세요.');
    return state;
  }
  function download(state) {
    const date = new Date();
    const data = {format:'pixel-research-lab',formatVersion:1,exportedAt:date.toISOString(),state};
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pixel-lab-' + date.toISOString().replace(/[:.]/g,'-') + '.json';
    document.body.append(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  }
  return {valid,read,download};
})();
