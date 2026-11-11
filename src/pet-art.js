// Each cell is one pixel on the 26 × 18 canvas. Sprites face left in the atlas.
// A single palette follows a pet through every pose, including its ear and paw markings.
const paintPet = (() => {
  const coats = {
    // outline, fur, shade, bib, marking, second marking, toe, eye, lower eye, inner ear
    black: ['#17181a','#393a3b','#303132','#999a99','#393a3b','#414243','#d5d3cb','#2b4126','#82a466','#d99a94'],
    calico:['#53443b','#f3e9d6','#d8c9b9','#fff3e2','#c88750','#494342','#f8efdb','#364635','#72815c','#e9aaa0'],
    white: ['#82766e','#fbf7ec','#dbd3ca','#fffdf5','#cdc4b8','#b0a498','#f9f6ee','#283952','#617caa','#e9a9a5'],
    cheese:['#55391f','#d99048','#b96c32','#f1bc79','#b86c31','#e7a45c','#df9a51','#55351c','#925326','#ebae94'],
    jindo: ['#735e48','#dac19a','#c0a17e','#f7e7ca','#c4a783','#e4cdaa','#f2e0bc','#3a302a','#65513b','#c89784'],
    poodle:['#594134','#ad7953','#906043','#c49168','#926345','#c28e63','#ae7e59','#362c27','#584034','#ac7959'],
    corgi: ['#765033','#db974e','#c38241','#fff0d6','#bd793d','#eba95b','#f4e7cb','#463325','#755032','#dda38a']
  };
  const palette = Object.fromEntries(Object.entries(coats).map(([id,colors]) =>
    [id,Object.fromEntries([...'#fsbmwpeit'].map((key,i)=>[key,colors[i]]))]));

  const heads = {
    cat: [
      '.##...##.',
      '#wf#.#tt#',
      '#fff#fft#',
      '#fffffff#',
      '#fffffff#',
      '#feffeff#',
      '#fibbiff#',
      '.#bbbbb#.',
      '..###ss..'
    ],
    jindo: [
      '..#....#.',
      '.#w#..#t#',
      '.#ff##ft#',
      '.#ffffff#',
      '.#ffffff#',
      '.#efffef#',
      '#bibbbiw#',
      'e#bbbbb#.',
      '.##bbbs..'
    ],
    poodle: [
      '...##.##..',
      '.##ww#wf#.',
      '.#wffwfw##',
      '#mfffffmw#',
      '#sfffffmfs#',
      '.#efffemss#',
      '#bibbbiwws#',
      'e#bbbbb#ms#',
      '..##bss.##.'
    ],
    corgi: [
      '.#.....#..',
      '#w#...#t#.',
      '#wt#.#ft#.',
      '#fff#fft#.',
      '.#ffbfff#.',
      '.#efbfef#.',
      '.#ibbbif#.',
      'e#bbbbb#..',
      '..##bbb...'
    ]
  };
  const body = {
    stand: [
      '.##############.',
      '#bfffmffmffmfff#',
      '#bffmmffmffmfff#',
      '#bfffffffffffff#',
      '#bssssssssssfff#',
      '.############fs#'
    ],
    sit: [
      '.##########...',
      '#bfffmffmww##.',
      '#bfffmffffffw#',
      '#bfffffffffff#',
      '#bfffffssffff#',
      '#bff#s#ffffmw#',
      '#pff##ffmwwff#',
      '.###..########'
    ],
    loaf: [
      '...#########....',
      '..#ffmfffwwf##..',
      '.#fffmffffffws#.',
      '#bfffffffffffss#',
      '#bbffsfffff#ffs#',
      '#ppf#pssff#ppss#',
      '.##############.'
    ]
  };
  const tails = {
    cat:     ['.......#.','......#w#','......#f#','######ff#','fffffff#.','#######..'],
    jindo:   ['....####.','...#bbfw#','...#f##f#','...##.#f#','..####fs#','###fffs#.','fffff##..'],
    poodle:  ['.....###.','....#wwf#','....#ffs#','.....##s#','....#fs#.','.###fs#..','ffffs#...'],
    corgi:   ['..##.','.#ww#','##fs#','ffs#.','###..'],
    folded: ['#####....','ffwwf##..','###sffw#.','...##ff#.', '....#fs#.'],
    curled: ['.......##.','.....##ff#','...##ffss#','.##fff###.','#wwf##....','.###......']
  };
  return function paintPet(canvas,id,pose='stand',time=0,face=-1){
    const ctx=canvas.getContext('2d'),color=palette[id];
    const cat=labPets.kinds[id][1]==='cat',kind=cat?'cat':id;
    const asleep=pose==='sleep',loaf=asleep||pose==='rest',sit=pose==='watch';
    const air=pose==='up'||pose==='down',walk=pose==='walk'||pose==='approach';
    const stride=walk?Math.floor(time*5)%4:0;
    ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    ctx.scale(canvas.width/26,canvas.height/18);
    if(face>0){ctx.translate(26,0);ctx.scale(-1,1);}
    function pixel(x,y,key,w=1,h=1){ctx.fillStyle=color[key];ctx.fillRect(x,y,w,h);}
    function stamp(rows,x,y){
      rows.forEach((line,row)=>{for(let i=0;i<line.length;i++)if(line[i]!=='.')pixel(x+i,y+row,line[i]);});
    }
    const low=id==='corgi'?1:0, bob=walk && stride===1?1:0;
    let headX=1,headY;
    if(loaf){
      const breath=asleep && time%3.8>2.9?-1:0;
      if(asleep)stamp(tails.curled,12,12);else stamp(tails.folded,15,12);
      stamp(body.loaf,4,11);
      headX=2;headY=(asleep?8:5)+breath;
    }else if(sit){
      stamp(tails.folded,16,12);stamp(body.sit,5,10);
      headX=3;headY=3;
    }else{
      const y=9+low+bob, tailX=id==='corgi'?19:16;
      const tipLift=Math.floor(time*1.15)%2;
      const tailY=y-(cat?3:kind==='corgi'?1:4)-tipLift;
      stamp(tails[kind],tailX,tailY);
      if(id==='black'){pixel(tailX+7,tailY+1,'b');pixel(tailX+7,tailY+2,'p');}
      // Offset the far paws by half a stride. Hind legs fold in under the belly in flight.
      const swing=[0,-1,0,1][stride],lift=air?2:0;
      function leg(x,top,bottom,fill,toe){
        pixel(x,top,'#',3,bottom-top+1);pixel(x+1,top,fill,1,bottom-top);pixel(x+1,bottom,toe);
      }
      leg(6-swing,y+3,17-lift-(stride===3?1:0),'s','s');leg(15+swing,y+3,17-lift-(stride===1?1:0),'s','s');
      stamp(body.stand,4,y);
      if(id==='cheese'){pixel(5,y+1,'b',2,2);pixel(8,y+3,'b',8);}
      leg(4+swing,y+5,17-lift-(stride===1?1:0),'f','p');
      leg(17-swing,y+4,17-lift-(stride===3?1:0),'f','p');
      if(id==='poodle'){
        pixel(3+swing,15-lift,'s',3);pixel(17-swing,15-lift,'w',3);
      }
      headY=2+low+bob+(air?1:0);
    }
    // Place coat islands inside the same silhouette in each pose.
    if(id==='calico'){
      const y=loaf?13:sit?12:11+bob;
      pixel(11,y,'w',3,2);pixel(13,y-1,'w',2);pixel(15,y,'m',3,2);
    }else if(id==='white' && loaf){
      pixel(13,11,'w',2);pixel(15,12,'m',3);pixel(18,14,'s',1,2);
    }
    stamp(heads[kind],headX,headY);
    if(id==='calico'){
      pixel(headX+1,headY+2,'w',2,3);pixel(headX+5,headY+3,'m',3,2);
    }else if(id==='cheese'){
      pixel(headX+3,headY+3,'m',1,2);pixel(headX+5,headY+3,'m');
    }
    const eyes=cat?[2,5]:[2,6],eyeY=headY+5;
    if(asleep || time%5.2>5.02){
      for(const x of eyes){pixel(headX+x,eyeY,'f');pixel(headX+x,eyeY+1,'e',asleep?2:1);}
    }else if(sit && Math.floor(time/2.5)%2 && cat){
      for(const x of eyes){pixel(headX+x,eyeY,'f');pixel(headX+x,eyeY+1,'b');pixel(headX+x+1,eyeY,'e');pixel(headX+x+1,eyeY+1,'i');}
    }
    ctx.restore();
  };
})();
