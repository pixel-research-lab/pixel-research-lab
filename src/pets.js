// Room coordinates are 360 × 166. Motion is local; the companion choice is saved.
const labPets=(()=>{
  const kinds={
    black:['까만색 고양이','cat'],
    calico:['삼색 고양이','cat'],
    white:['흰색 고양이','cat'],
    cheese:['치즈 고양이','cat'],
    jindo:['진돗개','dog'],
    poodle:['푸들','dog'],
    corgi:['웰시코기','dog']
  };
  const poses={walk:'어슬렁거리는 중',watch:'앉아서 바라보는 중',approach:'책상으로 가는 중',up:'책상에 뛰어오르는 중',sleep:'책상에서 낮잠 중',down:'바닥으로 내려오는 중'};
  const floor=152,desk=103,landing=239;
  function start(random=Math.random){return {mode:'walk',x:54,y:floor,from:54,to:85+random()*100,face:1,t:0,limit:0,visits:0};}
  function idle(s,mode,seconds){s.mode=mode;s.t=0;s.limit=seconds;}
  function go(s,mode,target){s.mode=mode;s.t=0;s.from=s.x;s.to=target;s.face=target>=s.x?1:-1;}
  function step(s,dt,random=Math.random){
    s.t+=dt;
    if(s.mode==='walk'||s.mode==='approach'){
      const dx=s.to-s.x,dist=dt*(s.mode==='approach'?20:15);
      if(Math.abs(dx)>dist){s.x+=s.face*dist;return;}
      s.x=s.to;
      if(s.mode==='approach'){go(s,'up',landing);return;}
      s.visits++;idle(s,'watch',2+random()*4);return;
    }
    if(s.mode==='watch' && s.t>=s.limit){
      if(s.visits>=3||random()<.36){go(s,'approach',266);s.visits=0;}
      else{const target=s.x<180?182+random()*115:42+random()*98;go(s,'walk',target);}
    }else if(s.mode==='up'||s.mode==='down'){
      const up=s.mode==='up',p=Math.min(1,s.t/.85);
      s.x=s.from+(s.to-s.from)*p;
      s.y=(up?floor:desk)+(up?desk-floor:floor-desk)*p-Math.sin(Math.PI*p)*16;
      if(p===1){if(up)idle(s,'sleep',8+random()*12);else go(s,'walk',90+random()*90);}
    }else if(s.mode==='sleep'&&s.t>=s.limit){go(s,'down',269);}
  }
  function remark(s,date,timeline,due){
    const day=reviewSchedule.today(date),now=date.getTime(),turns=(s.reviews||[]).flatMap(c=>c.attempts).filter(a=>a.day===day);
    const finished=s.quests.filter(q=>q.status==='done'&&reviewSchedule.today(new Date(q.ended))===day).length;
    if(timeline.status==='paused')return ['쉬는 시간엔 나랑 창밖 좀 보자.','잠깐 눈을 쉬어도 괜찮아. 내가 책상을 지킬게.'];
    const last=timeline.accepted.at(-1);
    if(last?.action==='finish'&&last.at>=attendance.dayStart(date))return ['오늘도 수고했어. 내일 여기서 만나!','퇴근 도장 찍었네. 오늘 연구실은 내가 맡을게.'];
    if(timeline.status==='working'&&now-timeline.since>=75*60000)return ['한참 집중했네. 물 한 모금 마시고 올래?','오래 앉아 있었어. 나랑 기지개 한 번 켜자.'];
    const latestTurn=turns.slice().sort((a,b)=>(b.at||0)-(a.at||0))[0];
    const latestQuest=s.quests.reduce((t,q)=>q.status==='done'?Math.max(t,q.ended):t,0);
    const lastWork=timeline.status==='working'?timeline.since:0;
    if(lastWork && now-lastWork<120000 && lastWork>Math.max(latestQuest,latestTurn?.at||0))return ['연구 시작했네! 내 자리도 네 옆이야.','오늘 첫 관찰이 나오면 나한테도 들려줘.'];
    if(latestTurn && !latestTurn.correct && (!latestQuest || latestQuest < (latestTurn.at || attendance.dayStart(date))))return ['오늘 막힌 질문, 내일 다시 만나면 돼.','한 번 헷갈린 곳을 찾았네. 그게 다음 복습의 시작이야.'];
    if(finished)return ['오늘 연구 퀘스트 '+finished+'개 끝냈네. 어떤 관찰이 제일 재밌었어?','관찰을 일지에 남겼구나. 오늘도 하나 알아냈네.'];
    if(turns.length)return ['오늘 복습한 거 봤어. 기억이 한 번 더 단단해졌네.','질문을 다시 꺼내 봤구나. 이번에는 뭐가 달랐어?'];
    if(due)return ['오늘 풀 질문이 '+due+'개야. 제일 궁금한 것부터 볼까?','복습 카드가 기다리고 있어. 한 장만 같이 열어 보자.'];
    if(timeline.status==='working')return ['연구 시작했구나. 옆에 조용히 있을게.','첫 관찰이 나오면 나한테도 들려줘.'];
    if(s.quests.some(q=>q.status==='active'))return ['열어 둔 도전 카드가 있어. 지난 예측부터 읽어 볼까?','진행 중인 퀘스트에 관찰 하나만 보태 보자.'];
    return ['오늘은 어떤 질문을 가져왔어?','창가에 자리를 잡았어. 준비되면 같이 시작하자.'];
  }
  return {kinds,poses,start,step,remark};
})();
