// Catalog keys are permanent save identifiers. Prices are shared by checkout and replay.
const studio = (() => {
  const categories = {room:'이사',wall:'벽지',floor:'바닥',gear:'장비'};
  const catalog = {
    room:[
      ['studio','숲속 연구실',0,'창 너머 소나무가 보이는 첫 작업실','#748c75'],
      ['garden','온실 연구실',140,'유리 온실과 덩굴이 보이는 정원','#719b82'],
      ['roof','옥탑 연구실',250,'낮은 옥상 너머로 펼쳐지는 도심','#848fa4'],
      ['river','한강뷰 연구실',450,'다리 아래로 물빛이 흐르는 강변','#5d94a2']],
    wall:[
      ['sage','세이지 벽지',0,'연둣빛 잔점 무늬','#a6b39a'],
      ['linen','크림 리넨',25,'세로로 짜인 밝은 직물','#d6c9aa'],
      ['brick','살구 벽돌',40,'햇볕에 바랜 붉은 벽돌','#c78f78'],
      ['indigo','남빛 줄무늬',55,'짙은 남빛과 가는 금빛 선','#657792']],
    floor:[
      ['oak','오크 마루',0,'따뜻한 나무 널판','#b69b79'],
      ['parquet','헤링본 마루',35,'엇갈려 맞물리는 참나무 조각','#aa785b'],
      ['tile','체커 타일',45,'청록과 아이보리 바둑판','#88a39c'],
      ['terrazzo','라일락 테라조',65,'연보랏빛 돌 속에 박힌 색 조각','#aba1b1']],
    gear:[
      ['single','기본 모니터',0,'연구실의 첫 모니터','#729482'],
      ['laptop','휴대용 노트북',70,'책상 왼쪽에 놓인 작은 노트북','#ac9f91'],
      ['dual','듀얼 모니터',100,'두 번째 화면에 펼친 실험 그래프','#887e9a'],
      ['bench','분석 워크스테이션',160,'듀얼 모니터와 노트북을 함께 배치','#a78359']]
  };
  const items = Object.fromEntries(Object.entries(catalog).flatMap(([category,rows]) =>
    rows.map(([id,name,price,description,color])=>[id,{id,category,name,price,description,color}])));
  const fees = {easy:15,standard:30,hard:60};
  const questPay = q => fees[q.difficulty || 'standard'];
  const reviewPay = 6, agendaPay = 10;
  const previewCredit = 0;
  function wallet(s) {
    const done = s.quests.filter(q=>q.status==='done');
    const claims = new Set(Object.keys(s.agendaClaims || {}));
    for(const [key,value] of Object.entries(s.agendaDone || {})) if(value) claims.add(key);
    const earned = done.reduce((sum,q)=>sum+questPay(q),0)
      + (s.reviews||[]).reduce((sum,c)=>sum+reviewSchedule.progress(c).correctTurns*reviewPay,0)
      + claims.size*agendaPay;
    const total = earned + previewCredit;
    const owned = new Set(Object.values(items).filter(i=>i.price===0).map(i=>i.id));
    let spent = 0;
    // Offline devices can spend the same balance. Replay within each purchaser's observed budget.
    const receipts = Object.values(s.purchases || {}).sort((a,b)=>a.budget-b.budget || a.at-b.at || a.id.localeCompare(b.id));
    for(const r of receipts){
      const item = items[r.sku];
      if(item && !owned.has(item.id) && spent+item.price<=Math.min(total,r.budget)){
        owned.add(item.id);spent+=item.price;
      }
    }
    const fitted = {};
    for(const [category,rows] of Object.entries(catalog)){
      const id = s.fittings?.[category];
      fitted[category] = owned.has(id) && items[id].category===category ? id : rows[0][0];
    }
    return {earned,total,spent,balance:total-spent,owned,fitted};
  }
  function equip(s,id,uuid,now){
    const item=items[id], w=wallet(s);
    if(!item)throw Error('카탈로그에서 항목을 찾지 못했어요.');
    if(!w.owned.has(id)){
      if(w.balance<item.price)throw Error('token이 부족해요.');
      s.purchases={...s.purchases,[uuid]:{id:uuid,sku:id,at:now,budget:w.total}};
    }
    s.fittings={...s.fittings,[item.category]:id};
  }
  const baseIds = tracks.map(t=>t.id);
  const axisId = id=>baseIds.includes(id) || (typeof id==='string' && /^s-[a-f0-9-]{36}$/.test(id));
  function axes(s){
    const defs=Object.values(s.skillDefs||{});
    return [...tracks.map(t=>({id:t.id,base:t.id,name:t.name,visible:true,...s.skillDefs?.[t.id]})),
      ...defs.filter(d=>!baseIds.includes(d.id)).sort((a,b)=>a.created-b.created || a.id.localeCompare(b.id))];
  }
  function scores(s){
    const points=new Map();
    const add=(id,n)=>points.set(id,(points.get(id)||0)+n);
    for(const q of s.quests)if(q.status==='done')add(q.focusSkill===undefined?q.track:q.focusSkill,1);
    for(const c of s.reviews||[])if(c.focusSkill)add(c.focusSkill,reviewSchedule.progress(c).xp);
    return axes(s).filter(x=>x.visible).map(x=>({...x,xp:points.get(x.id)||0}));
  }
  function valid(s){
    const map=(value,check)=>value===undefined || (!!value && typeof value==='object' &&
      !Array.isArray(value) && Object.entries(value).every(([id,v])=>check(id,v)));
    const safe=n=>Number.isSafeInteger(n) && n>=0;
    const focus=x=> x===undefined || x===null || axisId(x);
    return map(s.purchases,(id,r)=>/^[a-f0-9-]{36}$/.test(id) && r?.id===id &&
      Object.hasOwn(items,r.sku) && items[r.sku].price>0 && safe(r.at) && safe(r.budget)) &&
      map(s.fittings,(key,id)=>Object.hasOwn(items,id) && items[id].category===key) &&
      map(s.agendaClaims,(key,v)=>/^(l-[0-9a-f-]{36}|g-[0-9a-f]{64})$/.test(key) && v===true) &&
      map(s.skillDefs,(id,d)=>axisId(id) && d?.id===id && baseIds.includes(d.base) &&
        typeof d.name==='string' && !!d.name.trim() && d.name.length<=32 && typeof d.visible==='boolean' && safe(d.created)) &&
      s.quests.every(q=>q && focus(q.focusSkill) && (q.difficulty===undefined || Object.hasOwn(fees,q.difficulty))) &&
      (s.reviews||[]).every(c=>c && focus(c.focusSkill));
  }
  return {categories,catalog,items,fees,questPay,reviewPay,agendaPay,previewCredit,wallet,equip,axes,scores,valid};
})();
