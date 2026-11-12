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
  return {kinds,poses,start,step};
})();
