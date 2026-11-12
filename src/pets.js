// Room coordinates are 360 × 166. Only the selected companion is saved.
const labPets = (() => {
  const kinds = {
    black:['까만색 고양이','cat'], calico:['삼색 고양이','cat'], white:['흰색 고양이','cat'],
    cheese:['치즈 고양이','cat'], jindo:['진돗개','dog'], poodle:['푸들','dog'], corgi:['웰시코기','dog']
  };
  const poses = {
    walk:'산책 중', watch:'앉아서 구경 중', groom:'앞발로 세수 중', sniff:'냄새 맡는 중', perk:'귀를 쫑긋하는 중',
    approach:'책상으로 가는 중', lookUp:'책상 위를 살피는 중', crouch:'도약 준비 중', up:'뛰어오르는 중',
    settle:'자리를 잡는 중', sleep:'낮잠 중', stretch:'기지개 켜는 중', down:'내려오는 중'
  };
  const floor = 152;
  const pick = (values, random) => values[Math.floor(random()*values.length)];
  function start(random=Math.random, species='cat') {
    return {species, mode:'walk', x:54, y:floor, fromX:54, fromY:floor, to:67+random()*34, face:1,
      t:0, limit:0, stops:0, nextDesk:1+Math.floor(random()*2), landing:null, onDesk:false};
  }
  function pause(s, mode, seconds) { s.mode=mode; s.t=0; s.limit=seconds; }
  function move(s, mode, x) {
    pause(s,mode,0); s.fromX=s.x; s.fromY=s.y; s.to=x;
    if(x!==s.x)s.face=Math.sign(x-s.x);
  }
  function stroll(s, random) {
    const sign = s.x<72 ? 1 : s.x>287 ? -1 : random()<0.5 ? -1 : 1;
    move(s,'walk',Math.max(24,Math.min(336,s.x+sign*(28+random()*84))));
  }
  function beside(x) { return x<180 ? x+24 : x-24; }
  function descend(s) {
    s.onDesk=false; s.landing=null;
    move(s,'down',beside(s.x));
  }
  function afterStop(s, scene, random) {
    if(s.stops<s.nextDesk){stroll(s,random);return;}
    s.stops=0; s.nextDesk=2+Math.floor(random()*3);
    if(!scene.sites.length){pause(s,'settle',2+random()*3);return;}
    s.landing=pick(scene.sites,random);
    move(s,'approach',beside(s.landing));
  }
  function step(s, dt, random, scene) {
    if(s.landing!==null && !scene.sites.includes(s.landing)){
      if(s.onDesk || s.mode==='up')descend(s);
      else {s.landing=null;stroll(s,random);}
    }
    s.t+=dt;
    if(s.mode==='walk' || s.mode==='approach'){
      const dx=s.to-s.x, distance=dt*(s.mode==='approach'?24:17);
      if(Math.abs(dx)>distance){s.x+=s.face*distance;return;}
      s.x=s.to;
      if(s.mode==='approach'){s.face=Math.sign(s.landing-s.x);pause(s,'lookUp',1.1+random());}
      else {
        s.stops++;
        const gestures=s.species==='cat'?['groom','watch','perk']:['sniff','perk','watch'];
        pause(s,pick(gestures,random),2.5+random()*4);
      }
      return;
    }
    if(s.mode==='up' || s.mode==='down'){
      const rising=s.mode==='up', p=Math.min(1,s.t/.85), end=rising?scene.top:floor;
      s.x=s.fromX+(s.to-s.fromX)*p;
      s.y=s.fromY+(end-s.fromY)*p-Math.sin(Math.PI*p)*12;
      if(p===1){
        if(rising){s.onDesk=true;pause(s,s.species==='cat'?'groom':'settle',3+random()*3);}
        else stroll(s,random);
      }
      return;
    }
    if(s.t<s.limit)return;
    switch(s.mode){
      case 'lookUp': pause(s,'crouch',.45);break;
      case 'crouch': move(s,'up',s.landing);break;
      case 'sniff': pause(s,'perk',1+random()*2);break;
      case 'groom': if(s.onDesk)pause(s,'settle',2);else afterStop(s,scene,random);break;
      case 'settle': pause(s,'sleep',60+random()*120);break;
      case 'sleep': pause(s,'stretch',2+random()*2);break;
      case 'stretch': if(s.onDesk)descend(s);else stroll(s,random);break;
      default: afterStop(s,scene,random);
    }
  }
  return {kinds,poses,start,step};
})();
