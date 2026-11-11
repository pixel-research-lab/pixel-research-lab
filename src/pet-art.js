// Hand-pixelled silhouettes: round cheeks, two eyes and a distinct coat for each companion.
function paintPet(canvas,id,pose='watch',time=0,face=1){
  const c=canvas.getContext('2d'),cat=labPets.kinds[id][1]==='cat',curly=id==='poodle',short=id==='corgi';
  const colors={
    black:['#353247','#514b65','#79718b','#272638','#ebcb79'],
    calico:['#fff0d5','#efb277','#765e59','#67505a','#665950'],
    white:['#fff5e6','#e3dcda','#ccc1c4','#918389','#5d8690'],
    cheese:['#f6bf75','#ffe0a5','#c8894e','#8c6656','#716049'],
    jindo:['#ead0a7','#fff1d8','#c3a486','#887365','#584d48'],
    poodle:['#c28c70','#e3ab82','#a17262','#77565b','#4b4144'],
    corgi:['#e6a15f','#fff0d7','#c18351','#906451','#54484a']
  };
  const [fur,cream,accent,outline,iris]=colors[id],pink=id==='black'?'#d195a7':'#e7a29e';
  const R=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const round=(x,y,w,h,color)=>{
    R(x+2,y,w-4,h,color);R(x+1,y+1,w-2,h-2,color);R(x,y+2,w,h-4,color);
  };
  function bun(x,y,w,h,col){
    round(x,y,w,h,outline);round(x+1,y+1,w-2,h-2,col);
  }
  function ear(x,y,right,depth){
    for(let n=0;n<depth;n++){
      const w=Math.min(8,2+n),left=right?x+8-w:x;
      R(left,y+n,w,1,outline);if(w>2)R(left+1,y+n,w-2,1,fur);
      if(n>2&&n<depth-1)R(left+2,y+n,Math.max(1,w-4),1,pink);
    }
  }
  c.clearRect(0,0,36,32);c.save();c.imageSmoothingEnabled=false;
  if(face<0){c.translate(36,0);c.scale(-1,1);}
  const sleep=pose==='sleep',walking=pose==='walk'||pose==='approach';
  const step=Math.floor(time*4)%2,bob=walking?step:0;
  if(sleep){
    const breath=Math.floor(time*.75)%2;
    bun(4,18-breath,25,12+breath,fur);round(7,20-breath,12,6,cream);
    if(id==='calico')round(8,19-breath,7,5,accent);
    if(!curly){ear(16,15,0,5);ear(25,15,1,5);}else{round(15,16,7,7,accent);round(24,15,7,7,cream);}
    bun(15,19,17,10,fur);
    if(id==='corgi'||id==='jindo')round(20,23,10,5,cream);
    R(19,23,3,1,outline);R(25,23,3,1,outline);R(23,25,2,1,pink);
    R(17,25,2,1,pink);round(7,25,12,5,accent);R(13,25,5,2,cream);
    c.restore();const z=Math.floor(time)%3;R(28+z,10-z,3,1,'#667487');R(29+z,11-z,1,1,'#667487');R(28+z,12-z,3,1,'#667487');return;
  }
  // Tail and paws stay visible behind the oversized face.
  if(cat){
    bun(3,18+bob,6,9,fur);R(3,16+step,3,6,outline);R(4,17+step,2,5,id==='black'?cream:accent);R(6,24,5,3,fur);
  }else if(id==='jindo'){bun(2,18+bob,9,8,cream);R(5,20+bob,3,3,accent);}
  else{round(3,20+bob,7,6,accent);round(3,19+bob,5,4,cream);}
  bun(walking?6:8,18+bob,walking?21:18,12-bob,fur);
  round(14,22,10,7,cat&&id==='calico'?'#fff3dd':cream);
  for(const [x,dy] of [[9,walking?step:0],[21,walking?1-step:0]]){
    R(x,27-dy,5,4,outline);R(x,27-dy,4,3,fur);R(x+1,28-dy,3,1,cream);
  }
  const y=bob+(short?1:0),look=walking?1:Math.floor(time/2)%2;
  c.save();c.translate(look,y);
  if(!curly){ear(8,cat?4:short?1:3,0,8);ear(22,cat?4:short?1:3,1,8);}
  // A broad lower head with squared pixel corners and soft whisker pads.
  // A row mask rounds the forehead and chin without flattening the cheeks.
  const head=[[11,26],[9,28],[8,29],[7,30],[7,30],[6,31],[6,31],[6,31],
    [6,31],[6,31],[7,30],[7,30],[8,29],[9,28],[11,26],[13,24]];
  for(let j=0;j<head.length;j++){
    const [left,right]=head[j],width=right-left+1;R(left,8+j,width,1,outline);
    if(j && j<head.length-1){const before=head[j-1],after=head[j+1],a=Math.max(left+1,before[0],after[0]),b=Math.min(right-1,before[1],after[1]);R(a,8+j,b-a+1,1,fur);}
  }
  if(curly){
    for(const [x,yy,w] of [[4,9,7],[3,13,7],[4,17,6],[26,9,7],[27,13,7],[26,17,6]]){round(x,yy,w,7,accent);}
    for(const [x,yy] of [[8,7],[12,5],[17,5],[22,7]]){round(x,yy,8,6,cream);R(x+2,yy,3,1,outline);}
  }else if(id==='calico'){
    round(8,9,9,8,accent);round(21,9,8,6,cream);R(10,6,2,4,accent);
  }else if(id==='cheese'){
    R(13,9,2,4,accent);R(17,9,2,5,accent);R(21,9,2,3,accent);R(8,15,3,1,accent);R(27,15,2,1,accent);
  }else if(short){
    R(17,9,3,6,cream);R(16,13,4,4,cream);round(10,18,18,6,cream);
  }else if(id==='black'){
    R(11,9,5,1,accent);R(10,10,3,1,accent);R(12,13,3,1,cream);R(23,13,3,1,cream);
  }else{R(11,10,5,1,cream);R(22,10,4,1,cream);}
  const blink=time%4.65>4.46;
  for(const x of [12,23]){
    if(blink){R(x,17,3,1,outline);R(x+1,16,2,1,outline);}
    else{
      R(x,15,3,4,'#38323c');R(x-1,16,5,2,id==='black'?'#c8a968':iris);
      R(x+1,15,2,3,'#342f3b');R(x-1,14,3,2,'#fff5dd');R(x+2,18,1,1,'#ead7b6');
    }
  }
  R(9,19,3,1,pink);R(26,19,3,1,pink);
  if(!cat){round(14,18,12,6,cream);R(18,18,4,2,'#4a4144');}
  R(18,18,3,1,cat?pink:'#51474a');R(19,19,1,2,outline);R(17,21,2,1,outline);R(20,21,2,1,outline);
  if(!cat && time%5<2.7){R(19,21,3,2,pink);R(20,23,1,1,pink);}
  if(cat){R(5,18,4,1,accent);R(6,20,3,1,accent);R(29,18,3,1,accent);}
  c.restore();c.restore();
}
