// The room redraws once the PNGs are ready, even if they arrived after the first frame.
const itemImages = Object.fromEntries(Object.keys(lootDefs).map(id => {
 const image = new Image();
 image.src = './assets/images/items/' + id + '.png';
 return [id,image];
}));
const roomImagesReady = Promise.all(Object.values(itemImages).map(image => image.decode().catch(() => {})));
function drawItem(ctx,id,x,y,scale,bottom=false){
 const image=itemImages[id];
 if(!image?.complete || !image.naturalWidth)return;
 const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,bottom?y-h:y,w,h);
}
// Sky bands, distant hills, and trees use the same local-time palette.
const skyPalettes = {
 night:['#253554','#354766','#4d6076','#63777f','#516774','#3e535e','#334955','#415963'],
 dawn:['#9c94ae','#d4b0b1','#f1bd93','#efd29e','#a2999c','#807f86','#626c70','#74817d'],
 day:['#a2beb5','#c1cbb2','#e8cd9c','#d4b48c','#93a69b','#758f82','#58776b','#688779'],
 dusk:['#887b9b','#cd91a0','#f2ab83','#e7bb8e','#9d8c96','#777582','#5a626f','#6a7178']
};
const skyStops = [[0,'night',1],[5,'night',1],[6,'dawn',0.45],[7,'day',0],
 [17,'day',0],[18,'dusk',0.5],[19,'night',1],[24,'night',1]];
function skyAt(date) {
 const hour=date.getHours()+date.getMinutes()/60;
 const end=skyStops.findIndex(stop=>stop[0]>hour), [a,first,dimA]=skyStops[end-1], [b,last,dimB]=skyStops[end];
 const fraction=(hour-a)/(b-a);
 const colors=skyPalettes[first].map((hex,i)=>{
   const target=skyPalettes[last][i];
   const channel=n=>Math.round(parseInt(hex.slice(n,n+2),16)*(1-fraction)+parseInt(target.slice(n,n+2),16)*fraction);
   return 'rgb('+[1,3,5].map(channel).join(',')+')';
 });
 const moon=hour<6||hour>=18;
 const arc=((hour-(moon?18:6)+24)%24)/12;
 return {colors,moon,x:Math.round(18+85*arc),y:Math.round(64-42*Math.sin(Math.PI*arc)),
   dim:dimA+(dimB-dimA)*fraction,label:hour<5||hour>=19?'밤':hour<7?'해돋이':hour<17?'낮':'노을'};
}
const clockDigits=['111101101101111','010110010010111','111001111100111','111001111001111',
 '101101111001001','111100111001111','111100111101111','111001010010010','111101111101111','111101111001111'];
function paintRoom(slots,date=new Date()){
 const c=document.getElementById('room-art'),q=c.getContext('2d');
 const R=(x,y,w,h,col)=>{q.fillStyle=col;q.fillRect(x,y,w,h)};
 const sky=skyAt(date), [top,mid,low,horizon,far,near,trunk,leaf]=sky.colors;
 const wall='#a6b39a',line='#33483e',shadow='#6d826f',wood='#ba895e',bright='#e1b47f',dark='#755b46',edge='#554e40';
 R(0,0,360,166,wall);
 for(let y=3;y<116;y+=12)for(let x=3+(y%2)*4;x<360;x+=12){R(x,y,1,1,'#93a58b');R(x+1,y+1,1,1,'#c0c7a5');}
 R(0,0,360,3,'#7a8c73');R(0,121,360,3,'#526858');R(0,124,360,4,'#81947e');R(0,128,360,38,'#b69b79');
 for(let y=132;y<166;y+=8){R(0,y,360,1,'#947f66');for(let x=(y%3)*37;x<360;x+=89){R(x,y-6,1,6,'#91816a');R(x+4,y-2,6,1,'#c5ad8c');}}
 // Recessed timber window and a terraced skyline.
 R(12,11,105,91,shadow);R(10,8,105,91,dark);R(12,10,101,86,bright);R(15,13,95,79,'#8cb3af');
 R(15,13,95,17,top);R(15,30,95,15,mid);R(15,45,95,23,low);R(15,68,95,24,horizon);
 q.save();q.beginPath();q.rect(15,13,95,79);q.clip();
 if(sky.dim>.45){
   q.globalAlpha=(sky.dim-.45)/.55;
   for(const [x,y] of [[23,23],[37,36],[48,18],[76,25],[88,38],[103,19],[69,49]]){
     R(x,y,1,1,'#f5e7c1');if(x===37||x===76)R(x-1,y,3,1,'#ded7c3');
   }
   q.globalAlpha=1;
 }
 const {x,y}=sky;
 if(sky.moon){
   const rows=[[0,3],[-2,3],[-3,3],[-3,4],[-2,6],[-1,6],[1,4]];
   rows.forEach(([dx,w],i)=>R(x+dx,y+i-3,w,1,'#f6eac0'));
 }else{
   R(x-4,y-6,8,12,'#ffe0a1');R(x-6,y-4,12,8,'#ffe0a1');R(x-7,y-2,14,4,'#ffe0a1');
 }
 q.globalAlpha=(1-sky.dim)*.85;
 R(18,29,20,2,'#d9d8bc');R(23,27,12,2,'#d9d8bc');R(75,43,20,2,'#eadaaf');q.restore();
 for(let x=15;x<110;x++){let h=62+Math.round(4*Math.sin(x/9)+4*Math.cos(x/15)); R(x,h,1,92-h,far);let z=72+Math.round(6*Math.cos(x/13));R(x,z,1,92-z,near);}
 for(const [x,y,h] of [[19,63,29],[29,70,21],[102,64,28],[91,73,19],[37,75,17]]){R(x,y,2,h,trunk);for(let k=0;k<4;k++)R(x-k-1,y+3+k*4,4+k*2,3,leaf);}
 R(60,13,4,80,wood);R(61,13,1,80,'#eed0a1');R(15,55,95,3,wood);R(15,55,95,1,bright);
 R(6,95,114,5,dark);R(7,94,112,2,bright);
 // Book shelf, note board and wall calendar.
 R(135,43,86,3,shadow);R(133,40,89,3,dark);R(134,39,87,2,bright);R(141,43,3,4,dark);R(212,43,3,4,dark);
 const bcols=['#a4624d','#638277','#d4b776','#80889a','#9c775f','#688b8b','#c29b60'];
 for(let i=0;i<7;i++){const x=139+i*5,h=11+(i*7)%10;R(x,39-h,4,h,bcols[i]);R(x+1,40-h,1,h-2,'#d6c9a6');R(x,35,4,1,edge);}
 R(183,36,18,3,'#7e7561');R(184,33,15,3,'#d5be8b');R(186,31,16,2,'#729286');drawItem(q,'plant',201,19,1.6);
 R(243,15,59,42,shadow);R(241,13,60,42,dark);R(243,15,56,38,'#c5a075');
 for(let y=18;y<52;y+=4)for(let x=246;x<298;x+=5)R(x,y,1,1,'#b18d68');
 for(const [x,y,col] of [[245,19,'#e5c984'],[262,17,'#d8d6ab'],[276,22,'#eddfb0'],[260,34,'#e8ba8a']]){R(x+1,y+1,13,12,'#ab8f69');R(x,y,13,12,col);R(x+5,y-1,2,2,'#885a45');R(x+2,y+4,7,1,'#9b9475');R(x+2,y+7,5,1,'#9b9475');}
 R(317,19,20,24,shadow);R(316,18,20,24,'#efe2bd');R(316,18,20,5,'#b67258');R(320,16,2,4,edge);R(330,16,2,4,edge);for(let i=0;i<9;i++)R(319+(i%3)*5,26+Math.floor(i/3)*4,2,2,i===4?'#bc7255':'#9ea489');
 // Desk, drawer, monitor and two-link task lamp.
 R(38,142,268,4,'#9d896e');R(38,106,264,8,edge);R(39,103,265,5,bright);R(39,106,265,3,wood);R(43,110,5,35,dark);R(44,113,2,29,wood);R(292,109,5,35,dark);
 R(245,111,44,28,edge);R(247,113,40,24,wood);R(248,114,37,10,'#d2a271');R(248,126,37,9,'#c7996b');R(263,117,8,2,dark);R(263,128,8,2,dark);R(248,139,4,5,dark);R(282,139,4,5,dark);
 R(144,56,57,37,shadow);R(142,54,58,38,line);R(144,56,54,32,'#d6cdae');R(146,58,50,28,'#3e6356');R(149,61,32,2,'#aabc8b');R(149,65,13,1,'#829c79');R(149,71,5,1,'#9bb283');R(151,73,8,1,'#9bb283');
 R(174,67,9,3,'#b7c9a0');R(174,69,2,6,'#d0d6ab');R(181,69,2,6,'#d0d6ab');R(176,77,5,5,'#d39c64');R(167,83,23,1,'#819c79');R(190,89,3,1,'#81a77b');
 R(166,92,8,8,edge);R(162,98,17,3,dark);R(153,101,36,2,'#768979');for(let x=156;x<187;x+=4)R(x,101,2,1,'#dfdac0');R(194,101,5,2,'#738578');
 for(let i=0;i<17;i++){R(270+i,96-i,3,3,edge);R(285-i,79-Math.floor(i*.65),3,2,dark);}
 R(263,66,12,3,'#ad6d42');R(261,69,14,4,'#dfab60');R(259,73,18,2,'#f0c77d');R(261,75,13,1,'#f7db97');R(269,98,4,4,edge);R(264,101,16,2,dark);
 R(322,119,25,23,edge);R(324,121,21,19,'#92a188');R(324,122,20,2,'#acb299');R(333,129,5,2,edge);R(321,140,27,2,dark);
 // Chair faces the bench.
 R(148,113,29,18,edge);R(150,112,25,16,'#6a8c78');R(152,113,21,3,'#92a58a');R(149,128,27,3,'#587663');R(158,131,7,7,dark);R(144,136,32,4,edge);R(146,135,29,3,'#799680');
 R(157,140,5,9,edge);R(149,148,21,2,edge);R(146,149,6,3,line);R(167,149,6,3,line);
 const positions=[80,122,221];
 slots.forEach((id,i)=>{
   if(id)drawItem(q,id,positions[i],103,1.45,true);
   else R(positions[i]+4,102,12,1,'#a98a67');
 });
 if(sky.dim>0){
   q.save();q.globalAlpha=.34*sky.dim;R(0,0,360,166,'#162641');
   q.globalAlpha=.19*sky.dim;
   for(let i=0;i<27;i++){const w=9+Math.floor(i*.66);R(267-w,76+i,w*2,1,'#ffe7a3');}
   q.globalAlpha=.62*sky.dim;R(259,73,18,2,'#ffe09a');R(261,75,14,1,'#fff3bc');
   R(246,103,41,1,'#ffe4a1');R(250,104,32,1,'#f8ce84');q.restore();
 }
 // Four luminous digits in the footprint of the clickable desk clock.
 R(196,92,24,10,edge);R(197,93,22,7,'#283c37');R(198,102,3,1,dark);R(215,102,3,1,dark);
 let digitX=199;
 for(const ch of attendance.time(date)){
   if(ch===':'){R(digitX,95,1,1,'#dbbd78');R(digitX,97,1,1,'#dbbd78');digitX+=2;continue;}
   [...clockDigits[Number(ch)]].forEach((bit,i)=>{if(bit==='1')R(digitX+i%3,94+Math.floor(i/3),1,1,'#edcf87');});
   digitX+=4;
 }
 c.setAttribute('aria-label',sky.label+' 풍경의 작업 책상. '+slots.map((id,i)=>(i+1)+'번 자리 '+(id?lootDefs[id][0]:'비어 있음')).join(', '));
}
