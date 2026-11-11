// Pixel units match the 360 × 166 room and its interactive furniture.
function drawWall(R,wall){
  if(wall==='linen'){
    R(0,3,360,118,'#d8cdb3');
    for(let x=1;x<360;x+=6){R(x,3,1,118,'#c6b99e');for(let y=4+(x%7);y<121;y+=9)R(x+1,y,3,1,'#e2d8bc');}
  }else if(wall==='brick'){
    R(0,3,360,118,'#ddbaa3');
    for(let row=0;row<15;row++)for(let col=-1;col<19;col++){
      const x=20*col+10*(row%2), y=3+row*8;
      R(x,y,19,7,['#c88e78','#ce9a83','#c59380'][Math.abs(col+2*row)%3]);R(x+1,y+1,13,1,'#dbac92');
    }
  }else if(wall==='indigo'){
    R(0,3,360,118,'#75859a');
    for(let x=0;x<360;x+=14){R(x,3,6,118,'#66798e');R(x+8,3,1,118,'#afaa92');}
  }
}
function drawFloor(R,floor){
  if(floor==='parquet'){
    R(0,128,360,38,'#99755c');
    for(let y=128;y<166;y++)for(let x=0;x<360;x+=8){
      const rise=Math.floor(x/8)%2?7-(y%8):y%8;
      R(x+rise,y,1,1,'#d7ad80');R(x+(rise+1)%8,y,1,1,'#795d49');
      if((y+rise)%3===0)R(x+(rise+5)%8,y,2,1,'#ae8a6a');
    }
  }else if(floor==='tile'){
    R(0,128,360,38,'#708780');
    for(let y=128,row=0;y<166;y+=8,row++)for(let x=-8,col=0;x<360;x+=16,col++){
      R(x,y,15,7,(row+col)%2?'#a5b9ac':'#ded4b5');
      R(x+1,y+1,5,1,(row+col)%2?'#b6c6b6':'#e9e0c3');
    }
  }else if(floor==='terrazzo'){
    R(0,128,360,38,'#b2a7b3');
    for(let i=0;i<295;i++){const x=(i*73+Math.floor(i/7)*29)%360,y=128+(i*19+Math.floor(i/5)*7)%38;
      R(x,y,1+i%3,1+i%2,['#e3d3b9','#897e90','#c48e86','#ebe2d2'][i%4]);}
  }
}
function drawNewView(R,room,sky){
  const [, ,low,horizon,far,near,trunk,leaf]=sky.colors;
  const lit=sky.dim>.5?'#f6d690':'#cfcebb';
  if(room==='garden'){
    for(let x=15;x<110;x++){const y=64+Math.round(Math.sin(x/9)*3);R(x,y,1,92-y,far);}
    for(let i=0;i<4;i++){
      const x=21+i*21,y=62+(i%2)*3;
      R(x,y,16,18,'#95b2a0');R(x+1,y+1,14,16,near);
      for(let j=0;j<8;j++){R(x+j,y-j,1,1,'#d2d2b0');R(x+15-j,y-j,1,1,'#d2d2b0');}
      R(x+7,y-7,1,24,'#c4caae');R(x,y+7,16,1,'#c4caae');
    }
    R(15,82,95,10,trunk);
    for(let i=0;i<44;i++){const x=15+(i*17)%92,y=78+(i*11)%10;R(x,y,3,4,leaf);if(i%4===0)R(x,y,2,2,'#d9aa85');}
  }else if(room==='roof' || room==='river'){
    for(let i=0;i<15;i++){
      const x=13+7*i, w=5+i%4, y=49+(i*13)%21;
      R(x,y,w,82-y,far);R(x+1,y-2,w-3,2,far);
      for(let j=y+3;j<75;j+=5)if(i%3!==1)R(x+2,j,2,1,lit);
    }
    if(room==='roof'){
      R(15,78,95,14,trunk);
      for(const [x,y,w] of [[16,71,29],[48,76,28],[80,68,29]]){
        R(x,y,w,92-y,near);R(x-1,y,w+2,2,lit);
        for(let j=x+3;j<x+w-3;j+=6)R(j,y+6,3,4,trunk);
      }
      R(21,59,10,11,'#818a8c');R(20,60,12,2,'#adb4ac');R(22,70,2,3,trunk);R(28,70,2,3,trunk);
      R(87,58,1,10,trunk);R(82,60,10,1,trunk);R(84,58,6,1,trunk);
    }else{
      const water=sky.dim>.55?'#4d687c':'#75a5ae';
      R(15,71,95,21,water);R(15,72,95,1,horizon);
      for(let i=0;i<32;i++)R(15+(i*29)%92,76+(i*7)%15,2+i%3,1,i%3?low:'#b7c9bd');
      R(15,74,95,2,trunk);
      for(const x of [31,82]){
        R(x,59,2,22,trunk);R(x+4,59,2,22,trunk);R(x,59,6,2,lit);
        for(let d=1;d<17;d++){R(x-d,60+Math.floor(d*.8),1,1,lit);R(x+5+d,60+Math.floor(d*.8),1,1,lit);}
      }
    }
  }
}
function drawGear(R,gear){
  if(gear==='dual'||gear==='bench'){
    R(106,66,33,25,'#46524e');R(108,68,29,20,'#c7bfa7');R(109,69,27,18,'#424d62');
    for(let i=0;i<22;i++){const h=3+Math.round(4*Math.sin(i/3)+i/4);R(111+i,84-h,1,1,'#c5be90');}
    R(111,71,9,1,'#aea4b6');R(120,91,5,8,'#675e54');R(115,98,15,2,'#837566');
  }
  if(gear==='laptop'||gear==='bench'){
    R(52,87,23,15,'#585856');R(54,89,19,10,'#667f8c');R(56,91,11,1,'#e4cb99');
    R(57,94,7,1,'#b6cebd');R(50,101,27,2,'#b7b6ad');R(56,101,15,1,'#777c7a');
  }
}

function drawArchitecture(R,room,sky){
  if(room==='garden'){
    // Copper greenhouse pipes, hanging vine and a planter by the desk.
    R(1,4,358,2,'#8a7a61');R(3,5,2,112,'#8a7a61');R(353,5,2,112,'#8a7a61');
    R(306,6,1,12,'#6e705d');R(302,18,9,6,'#bc8f65');R(300,17,13,2,'#956b50');
    for(let i=0;i<10;i++)R(299+(i*5)%14,15+(i*7)%18,3,2,i%2?'#647d60':'#88a27b');
    R(9,125,15,13,'#ae7459');R(7,124,19,3,'#ce9671');R(13,137,10,2,'#8a7059');
    R(16,102,1,23,'#5d775a');
    for(let i=0;i<5;i++){R(10+i%2,106+i*3,6,2,'#739270');R(17,103+i*4,6,2,'#607f62');}
  }else if(room==='roof'){
    R(0,4,360,3,'#796d61');R(0,4,360,1,'#bcab8c');
    for(const x of [5,118,225,350])for(let i=0;i<8;i++)R(x+i,6+i,3,2,'#8e806f');
    for(const y of [100,116,135]){R(5,y,25,2,'#6d7773');R(6,y,23,1,'#a9aaa0');}
    R(6,99,2,40,'#737a75');R(27,99,2,40,'#737a75');
    R(10,107,11,9,'#a08a72');R(12,109,5,2,'#ded0ac');
    R(10,126,14,9,'#838e9a');R(13,128,6,2,'#c5c5b0');
  }else if(room==='river'){
    // A second picture window extends the view into the far corner of the room.
    R(305,52,50,45,'#6c7d7a');R(303,50,50,45,'#726a5c');R(305,52,46,41,'#d7c7a8');
    const [top,mid,low,,far,near]=sky.colors;
    R(307,54,42,10,top);R(307,64,42,9,mid);R(307,73,42,7,low);
    for(let i=0;i<7;i++){
      const x=308+i*6,y=68+(i*7)%10;
      R(x,y,4,82-y,far);if(i%2)R(x+1,y+2,1,1,'#e6ce99');
    }
    R(307,81,42,10,sky.dim>.55?'#4e697a':'#78a6ad');
    for(let i=0;i<12;i++)R(308+(i*13)%38,83+(i*3)%7,3,1,i%2?mid:low);
    R(307,79,42,1,near);R(322,76,1,7,near);R(337,76,1,7,near);
    R(327,53,2,39,'#cab299');R(301,94,54,2,'#b59875');
    // Built-in bookshelves are part of this floor plan and travel with the room.
    R(4,105,28,33,'#866d55');R(6,107,24,29,'#685e50');
    for(let i=0;i<9;i++)R(8+(i%5)*4,110+Math.floor(i/5)*13,3,9,['#a59b86','#b78068','#83978e'][i%3]);
    R(6,120,24,2,'#bd9d77');R(4,136,28,2,'#c4a67d');
  }
}
