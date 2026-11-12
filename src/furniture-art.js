// Draw the same furniture in the shop, layout editor and live room.
function drawBench(R,id,room){
  const {left:x,right,top:y,wood,rim,frame}=room,w=right-x;
  R(x,y+39,w+2,4,'#98856d'); R(x,y+2,w,9,frame);R(x+1,y,w,4,rim);R(x+1,y+4,w,3,wood);
  for(const leg of [x+5,right-10]){
    R(leg,y+8,5,34,frame);R(leg+1,y+10,2,30,id==='roof'?'#939d9c':wood);
  }
  if(id==='garden'){
    R(x+8,y+31,w-19,3,'#67816c');
    for(let i=4;i<w-3;i+=12)R(x+i,y+1,6,1,'#d5ad75');
    R(right-52,y+12,37,17,'#80774f');R(right-50,y+14,33,12,'#d0ab70');
    for(let i=0;i<7;i++)R(right-48+i*4,y+14,1,12,'#937a56');
  }else if(id==='roof'){
    for(let i=0;i<27;i++){R(x+9+i,y+34-i,3,2,frame);R(right-12-i,y+34-i,3,2,frame);}
    R(right-57,y+12,38,19,'#687580');R(right-54,y+15,32,4,'#81919b');R(right-49,y+16,16,1,rim);
  }else{
    const cabinet=right-(id==='river'?76:61),cw=id==='river'?59:44;
    R(cabinet,y+8,cw,29,frame);
    for(let i=0;i<2;i++){R(cabinet+2,y+10+i*12,cw-4,10,wood);R(cabinet+cw/2-4,y+14+i*12,8,2,rim);}
    if(id==='river'){R(x+14,y+8,39,30,wood);R(x+16,y+10,35,26,'#6c635d');R(x+17,y+23,33,2,rim);R(x+3,y+6,w-6,1,'#edc5a4');}
  }
}
function drawChair(R,id,room){
  const {chair:x,seat,frame,rim}=room;
  const w={studio:29,garden:26,roof:33,river:38}[id],y=id==='river'?109:113;
  R(x,y,w,19,frame);R(x+2,y+1,w-4,15,seat);
  R(x+4,y+3,w-8,2,id==='river'?'#8fb6ab':rim);
  if(id==='garden')for(let dx=4;dx<w-3;dx+=4)R(x+dx,y+5,1,10,'#d1b88c');
  if(id==='roof')for(let dy=5;dy<=13;dy+=3)R(x+4,y+dy,w-8,1,'#a4acaf');
  if(id==='river'){R(x+12,y-7,14,7,frame);R(x+9,y-11,20,6,seat);}
  R(x+Math.floor(w/2)-2,130,5,19,frame);
  R(x-2,135,w+4,4,frame);R(x,135,w,2,seat);
  if(id!=='studio'){R(x-4,128,3,9,frame);R(x+w+1,128,3,9,frame);R(x-5,127,7,2,seat);R(x+w-3,127,7,2,seat);}
  R(x+3,148,w-6,2,frame);R(x+1,150,5,2,'#39493f');R(x+w-6,150,5,2,'#39493f');
}
function drawScreen(R,x,y,w,room,skin){
  const graphite=skin==='graphite',amber=skin==='amber';
  const frame=amber?'#92765e':graphite?'#384653':room.frame;
  const ink=amber?'#e7b264':graphite?'#aad6d0':'#b7ca9e';
  R(x+1,y+1,w,38,'#778978');R(x,y,w,38,frame);
  R(x+2,y+2,w-4,33,amber?'#dbc9a6':graphite?'#5e6a78':room.rim);
  R(x+4,y+4,w-8,28,amber?'#3c352c':graphite?'#354856':'#3e6356');
  for(let i=0;i<4;i++)R(x+7,y+7+i*4,Math.round((w-12)*[.59,.28,.13,.21][i]),i===0?2:1,ink);
  const a=x+Math.floor(w*.56);
  if(graphite){for(let i=0;i<w*.32;i++)R(a+i,y+20-Math.round(4*Math.sin(i*.43)),1,1,ink);}
  else if(amber){R(a,y+21,3,1,ink);R(a+6,y+22,5,2,ink);}
  else{R(a,y+13,9,2,ink);R(a,y+15,2,5,ink);R(a+7,y+15,2,5,ink);R(a+2,y+21,5,5,'#cc9968');}
  R(x+w-8,y+35,3,1,ink);R(x+Math.floor(w/2)-3,y+38,6,6,frame);R(x+Math.floor(w/2)-9,y+44,18,2,frame);
  R(x+Math.floor(w*.19),y+47,Math.round(w*.60),2,'#81887c');
  for(let i=0;i<w*.5;i+=4)R(x+Math.ceil(w*.23)+i,y+47,2,1,'#dedbc5');
}
function drawEquipment(R,look,pos,date){
  const room=furniture.rooms[look.room];
  const mon=furniture.rect(look,'monitor',pos.monitor);
  drawScreen(R,mon.x,mon.y,mon.w,room,look.monitor);
  for(const [id,variant,ox,oy] of [['aux','dual',106,100],['laptop','laptop',50,103]]){
    if(pos[id])drawGear((x,y,w,h,c)=>R(x+pos[id].x-ox,y+pos[id].y-oy,w,h,c),variant);
  }
  const calendar=furniture.rect(look,'calendar',pos.calendar),cx=calendar.x,cy=calendar.y;
  const night=look.calendar==='midnight',green=look.calendar==='botanic';
  R(cx+1,cy+3,20,24,'#738471');R(cx,cy+2,20,24,night?'#d9dcdb':'#eee4c9');R(cx,cy+2,20,green||night?8:5,green?'#678b64':night?'#57617e':'#b67258');
  R(cx+4,cy,2,4,room.frame);R(cx+14,cy,2,4,room.frame);
  if(green||night){for(let i=0;i<4;i++)R(cx+3+4*i,cy+6-i%2,green?3:1,green?2:1,'#e6dba0');}
  for(let i=0;i<9;i++)R(cx+3+(i%3)*5,cy+11+Math.floor(i/3)*4,2,2,i===4?'#bf775b':'#97a18b');
  const s=furniture.rect(look,'speaker',pos.speaker),mint=look.speaker==='mint-audio',walnut=look.speaker==='walnut-audio';
  R(s.x,s.y,s.w,s.h,room.frame);R(s.x+1,s.y+1,12,15,mint?'#93bfac':walnut?'#93654c':'#ad9776');
  if(mint){for(let i=0;i<4;i++)R(s.x+2,s.y+3+i*2,10,1,'#50796b');R(s.x+9,s.y+12,3,2,'#efdab0');}
  else for(const [dy,d] of [[3,4],[9,6]]){const x=s.x+7-d/2;R(x,s.y+dy,d,d,'#3f4c45');R(x+1,s.y+dy+1,d-2,d-2,walnut?'#c7a367':'#647968');}
  const clock=furniture.rect(look,'clock',pos.clock),x=clock.x,y=clock.y+1,peach=look.clock==='peach-clock',flip=look.clock==='flip-clock';
  R(x,y,24,10,peach?'#ad7867':flip?'#494b4b':room.frame);R(x+1,y+1,22,7,peach?'#fae1ac':'#293d38');
  R(x+2,y+10,3,1,room.frame);R(x+19,y+10,3,1,room.frame);
  if(flip){R(x+11,y+1,1,7,'#737673');R(x+2,y+4,20,1,'#454e4b');}
  let digitX=x+3;
  for(const ch of attendance.time(date)){
    if(ch===':'){R(digitX,y+3,1,1,'#aa986c');R(digitX,y+5,1,1,'#aa986c');digitX+=2;continue;}
    [...clockDigits[Number(ch)]].forEach((bit,i)=>{if(bit==='1')R(digitX+i%3,y+2+Math.floor(i/3),1,1,peach?'#754e44':flip?'#ede6ce':'#edcf87');});
    digitX+=4;
  }
}
