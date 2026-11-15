// Code-native pixel art, using the room's existing 360 × 166 coordinate system.
function gpuFan(R,x,y,r,color,phase=0){
  R(x-r+2,y-r,r*2-3,r*2+1,'#273c3d');R(x-r,y-r+2,r*2+1,r*2-3,'#273c3d');
  for(let i=1;i<r;i++){
    const j=phase%2?Math.max(1,Math.round(i*.55)):0;
    R(x+i,y-j,1,2,color);R(x-i,y+j,1,2,color);
    R(x+j,y+i,2,1,color);R(x-j,y-i,2,1,color);
  }
  R(x-1,y-1,3,3,'#ded7b6');
}
function drawGPUBoard(canvas,model,owned){
  const q=canvas.getContext('2d'),R=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(x,y,w,h);};
  q.clearRect(0,0,180,76);
  const has=slot=>owned.has(model.id+'-'+slot);
  R(11,64,158,2,'#c7c5aa');
  q.globalAlpha=has('board')?1:.25;
  R(16,19,148,41,'#355f52');R(18,21,144,37,'#527d61');
  R(13,16,3,47,'#737c73');R(9,16,6,3,'#9ba695');
  for(let x=45;x<129;x+=4)R(x,60,3,4,'#d2ac60');
  for(let y=26;y<57;y+=9){R(23,y,130,1,'#9eb483');R(25+(y%7)*8,y-3,1,8,'#9eb483');}
  q.globalAlpha=has('memory')?1:.22;
  for(const x of [30,48,114,132]){R(x,27,12,9,'#283e3d');R(x+2,30,8,2,'#8c9f93');R(x,24,12,2,'#d1b775');}
  q.globalAlpha=has('core')?1:.22;
  R(73,28,31,27,'#263d39');R(77,32,23,19,'#aab5a2');R(81,35,15,13,model.color);
  if(has('cooler')){
    q.globalAlpha=1;R(23,21,132,36,'#435455');R(25,23,128,3,model.color);R(25,53,128,2,model.color);
    const centers=model.fans===1?[89]:model.fans===2?[61,118]:[48,89,130];
    for(const x of centers)gpuFan(R,x,40,12,'#8eaaa3');
    R(156,28,5,22,'#a8b4a4');for(let y=30;y<49;y+=4)R(157,y,5,1,'#617b74');
  }
  q.globalAlpha=1;
}
function drawGPURig(R,id,powered,date){
  const model=gpuLab.get(id);if(!model)return;
  const x=316,y=108;
  R(x+2,y+36,34,3,'#716653');R(x,y,33,36,'#344747');R(x+2,y+2,29,32,'#6c817a');
  R(x+4,y+4,20,24,'#263b3d');R(x+5,y+5,18,22,'#3d5654');
  R(x+6,y+18,16,6,model.color);R(x+7,y+24,13,1,'#d2ad68');
  for(let i=0;i<model.fans;i++)R(x+8+i*5,y+20,3,2,powered?'#e8ddb5':'#4a5d55');
  const phase=powered && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?date.getSeconds()%2:0;
  gpuFan(R,x+14,y+11,5,powered?model.color:'#71827c',phase);
  R(x+26,y+5,3,2,powered?'#e6c676':'#384d49');R(x+26,y+10,3,16,'#344747');
  for(let n=0;n<4;n++)R(x+26,y+11+n*4,3,1,powered?model.color:'#78897a');
  R(x+4,y+30,19,1,'#a6b2a0');R(x+3,y+36,4,2,'#354746');R(x+26,y+36,4,2,'#354746');
}
