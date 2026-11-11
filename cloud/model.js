// Each quest earns one reward. Completing it on two devices still produces one entry.
export const emptyLab = () => ({version:1,quests:[],attendance:[],reviews:[],inventory:{plant:1},slots:['plant',null,null],offer:0,seenOffers:[0]});
const phase = {ready:1, active:2, done:3};
export function parts(state) {
  const entries = new Map();
  const extras = {...state.inventory};
  for (const event of state.attendance || []) entries.set('time~'+event.id,event);
  for (const {attempts, ...card} of state.reviews || []) {
    entries.set('review~'+card.id,card);
    for (const turn of attempts) entries.set('grade~'+card.id+'~'+turn.due,turn);
  }
  for (const quest of state.quests) {
    entries.set('q~'+quest.id, quest);
    if (quest.status === 'done') extras[quest.loot] = (extras[quest.loot] || 0) - 1;
  }
  for (const [id,n] of Object.entries(extras)) if (n>0) entries.set('gift~'+id,n);
  state.slots.forEach((item,i)=>entries.set('slot~'+i,item));
  entries.set('board',{offer:state.offer,seenOffers:state.seenOffers});
  return entries;
}
export function changes(before, after, seed=false) {
  const old = parts(before), next = parts(after), result = [];
  for (const [id,value] of next) {
    if (JSON.stringify(old.get(id)) !== JSON.stringify(value) ||
        (seed && id.startsWith('q~'))) result.push({id,value});
  }
  return result;
}
export function compare(a,b) {
  if (!b) return 1;
  if (a.id.startsWith('grade~')) {
    // Keep the first day this turn was answered. On a same-day disagreement, schedule another review.
    if (a.value.day !== b.value.day) return a.value.day < b.value.day ? 1 : -1;
    if (a.value.correct !== b.value.correct) return a.value.correct ? -1 : 1;
  }
  if (a.id.startsWith('q~')) {
    const progress = phase[a.value.status]-phase[b.value.status];
    if (progress) return progress;
  }
  return a.clock-b.clock || (a.actor<b.actor?-1:a.actor>b.actor?1:0);
}
export function materialize(rows) {
  const state=emptyLab(), slots=[], gift={...state.inventory};
  const attempts = new Map();
  for (const row of rows) {
    const {id,value}=row;
    if (id.startsWith('review~')) state.reviews.push({...value, attempts:[]});
    if (id.startsWith('grade~')) {
      const cardId = id.split('~')[1];
      if (!attempts.has(cardId)) attempts.set(cardId,[]);
      attempts.get(cardId).push(value);
    }
    if (id.startsWith('q~')) state.quests.push(value);
    if (id.startsWith('time~')) state.attendance.push(value);
    if (id.startsWith('gift~')) gift[id.slice(5)]=value;
    if (id.startsWith('slot~')) slots[Number(id.slice(5))]=row;
    if (id==='board') Object.assign(state,value);
  }
  for (const card of state.reviews) card.attempts = attempts.get(card.id) || [];
  state.inventory=gift;
  state.quests.sort((a,b)=>a.created-b.created || a.id.localeCompare(b.id));
  for (const q of state.quests) if(q.status==='done') state.inventory[q.loot]=(state.inventory[q.loot]||0)+1;
  // If two devices moved the same single item, keep the newer placement.
  const available={...state.inventory};
  const ordered=[0,1,2].sort((a,b)=>(slots[b]?.clock||0)-(slots[a]?.clock||0) ||
    (slots[b]?.actor||'').localeCompare(slots[a]?.actor||'') || a-b);
  for(const i of ordered){
    const item=slots[i]?slots[i].value:state.slots[i];
    state.slots[i]=item && available[item]>0?item:null;
    if(state.slots[i]) available[item]--;
  }
  return state;
}
