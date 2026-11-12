// Coordinates are room pixels. A desk item's anchor is its bottom-left corner.
const furniture = (() => {
  const rooms = {
    studio:{left:38,right:304,top:103,screen:58,chair:147,wood:'#ba895e',rim:'#e1b47f',frame:'#554e40',seat:'#6a8c78',details:'원목 서랍 책상 · 낮은 작업 의자 · 소형 모니터'},
    garden:{left:25,right:318,top:103,screen:64,chair:159,wood:'#b88451',rim:'#ebc78b',frame:'#476653',seat:'#94aa76',details:'대나무 상판 · 등나무 의자 · 세이지 모니터'},
    roof:{left:17,right:332,top:103,screen:73,chair:156,wood:'#9f795d',rim:'#d8af8c',frame:'#465260',seat:'#768695',details:'철제 작업대 · 메시 의자 · 와이드 모니터'},
    river:{left:8,right:350,top:103,screen:86,chair:166,wood:'#926d57',rim:'#d8aa8c',frame:'#454b58',seat:'#598985',details:'월넛 대형 책상 · 헤드레스트 의자 · 울트라와이드 모니터'}
  };
  const names={monitor:'모니터',clock:'탁상시계',speaker:'스피커',calendar:'벽 달력',aux:'보조 모니터',laptop:'노트북'};
  const objects=Object.keys(names);
  const roomKeys=Object.keys(rooms);
  function keysFor(look){
    return objects.filter(k=>k==='aux'?['dual','bench'].includes(look.gear):k==='laptop'?['laptop','bench'].includes(look.gear):true);
  }
  function size(look,key){
    const screen=rooms[look.room].screen;
    return {monitor:[screen,49],clock:[24,12],speaker:[14,18],calendar:[21,27],aux:[33,37],laptop:[27,17]}[key];
  }
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v)));
  function bounded(look,key,p){
    const room=rooms[look.room],[w,h]=size(look,key);
    if(key==='calendar')return {x:clamp(p.x,1,359-w),y:clamp(p.y,h+2,74)};
    return {x:clamp(p.x,room.left+2,room.right-w-1),y:clamp(p.y,room.top-3,room.top+1)};
  }
  function positions(look,placements={}){
    const room=rooms[look.room], monitor=look.room==='studio'?142:138;
    const defaults={monitor,clock:monitor+room.screen+3,speaker:room.right-17,calendar:316,aux:monitor-36,laptop:room.left+12};
    return Object.fromEntries(keysFor(look).map(k=>[k,bounded(look,k,placements[look.room+'-'+k] || {x:defaults[k],y:k==='calendar'?43:room.top})]));
  }
  function settle(look,key,requested,points){
    const anchor=bounded(look,key,requested);
    if(key==='calendar')return anchor;
    const r=rooms[look.room],[width]=size(look,key);
    const occupied=Object.entries(points).filter(([k])=>k!==key && k!=='calendar')
      .map(([k,p])=>[p.x,p.x+size(look,k)[0]]);
    occupied.push([258,287]); // The lamp stays on the bench.
    let best=null;
    for(let x=r.left+2;x<=r.right-1-width;x++){
      if(occupied.some(([l,h])=>x+width>l && x<h))continue;
      if(best===null || Math.abs(x-anchor.x)<Math.abs(best-anchor.x))best=x;
    }
    return best===null ? points[key] : {...anchor,x:best};
  }
  function rect(look,key,p){
    const [w,h]=size(look,key);return {x:p.x,y:p.y-h,w,h};
  }
  function cssBox(element,{x,y,w,h}){
    Object.assign(element.style,{left:x/360*100+'%',top:y/166*100+'%',width:w/360*100+'%',height:h/166*100+'%'});
  }
  function placeHotspots(look,pos){
    for(const [id,selector] of Object.entries({calendar:'.wall-calendar',clock:'.desk-clock',speaker:'.desk-speaker'})){
      cssBox(document.querySelector(selector),rect(look,id,pos[id]));
    }
    const monitor=rect(look,'monitor',pos.monitor);
    cssBox(document.getElementById('monitor-notes'),{x:monitor.x+2,y:monitor.y+22,w:monitor.w-4,h:12});
  }
  // Find stretches that fit the entire companion sprite, with space beside equipment.
  function landingSites(look,pos,slots){
    const r=rooms[look.room], spans=[[258,288]];
    for(const k of Object.keys(pos))if(k!=='calendar'){
      const {x,w}=rect(look,k,pos[k]);spans.push([x,x+w]);
    }
    for(const [i,x] of [80,122,221].entries())if(slots[i])spans.push([x,x+23]);
    const sites=[];
    const radius=20; // The pet button is 11% of the 360-pixel room.
    for(let x=r.left+radius;x<=r.right-radius;x++){
      if(spans.every(([l,h])=>x+radius<=l || x-radius>=h))sites.push(x);
    }
    return sites;
  }
  const positionsKey=id=>roomKeys.some(room=>objects.some(object=>id===room+'-'+object));
  return {rooms,names,keysFor,positions,rect,bounded,settle,cssBox,placeHotspots,landingSites,positionsKey};
})();
