function createPetUI({getState,show,commit,toast}){
  const $=id=>document.getElementById(id),actor=$('room-pet'),sprite=$('pet-sprite'),speech=$('pet-speech');
  const bubble=$('pet-bubble'),voice=$('pet-voice'),synth=window.speechSynthesis;
  const voiceKey='pixel-lab.pet-voice.v1';
  let voiced=false,holdUntil=0,nextAt=0,spoke=0;
  try{voiced=localStorage.getItem(voiceKey)==='yes';}catch{}
  function voiceLabel(){voice.textContent=voiced?'음성 끄기':'음성 켜기';voice.setAttribute('aria-pressed',String(voiced));}
  voiceLabel();voice.disabled=!synth;
  function speak(text){
    if(!voiced||!synth||document.hidden)return;
    synth.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=1.04;
    const korean=synth.getVoices().find(v=>v.lang.toLowerCase().startsWith('ko'));if(korean)utterance.voice=korean;
    utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error) && voiced){voiced=false;voiceLabel();try{localStorage.removeItem(voiceKey);}catch{}toast('한국어 음성을 재생할 수 없어 말풍선으로 보여 줄게요.');}};
    synth.speak(utterance);
  }
  voice.onclick=()=>{voiced=!voiced;try{localStorage.setItem(voiceKey,voiced?'yes':'no');}catch{}voiceLabel();
    if(voiced && nowLines.length)say(nowLines[lineIndex]);else synth?.cancel();};
  function say(line){
    if(!line||!animal||id==='none')return;
    const now=performance.now(),cat=labPets.kinds[id][1]==='cat';
    const prefix=spoke%3===0?(cat?'냐옹, ':'멍! '):'';
    const text=prefix+line;spoke++;
    speech.textContent=labPets.kinds[id][0]+' · '+text;bubble.textContent=text;
    bubble.hidden=false;holdUntil=now+8500;nextAt=now+(studio.previewCredit?14200:50000)+Math.random()*(studio.previewCredit?3500:20000);speak(text);
  }
  function tick(){
    if(!id||id==='none'||document.hidden||$('home').hidden)return;
    const now=performance.now();
    if(now>=nextAt && nowLines.length){
      lineIndex=(lineIndex+1)%nowLines.length;
      const asides={sleep:'따뜻하다… 잠깐 눈만 붙일게. zZ',up:'책상 위가 잘 보이겠다!',watch:'저기, 창밖에 뭐가 지나갔어.'};
      say(spoke%3===2 && asides[animal.mode]?asides[animal.mode]:nowLines[lineIndex]);
    }else if(now>=holdUntil)bubble.hidden=true;
  }
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let id,animal,last=0,frame=0,ink='',drawAt=0,lineIndex=0,nowLines=[],pose='';
  const selected=()=>getState().pet ?? (studio.previewCredit?'black':'none');
  function renderActor(){
    actor.style.left=(animal.x/360*100)+'%';actor.style.top=(animal.y/166*100)+'%';
    bubble.style.left='clamp(min(95px, 28%), '+(animal.x/360*100)+'%, max(calc(100% - 95px), 72%))';
    bubble.style.top=Math.max(3,(animal.y-27)/166*100)+'%';
    if(pose!==animal.mode){
      pose=animal.mode;actor.title=labPets.kinds[id][0]+' · '+labPets.poses[pose];
      actor.setAttribute('aria-label',actor.title+' · 말 걸기');actor.dataset.pose=pose;
    }
    paintPet(sprite,id,animal.mode,animal.t,animal.face);
  }
  function animate(ms){
    frame=0;if(!id||id==='none'||document.hidden||$('home').hidden||reduce.matches)return;
    if(ms-drawAt>=70){
      if(last)labPets.step(animal,Math.min(.18,(ms-last)/1000));
      last=ms;drawAt=ms;renderActor();
    }
    frame=requestAnimationFrame(animate);
  }
  function wake(){
    cancelAnimationFrame(frame);frame=0;last=0;drawAt=0;
    if(!id||id==='none')return;
    if(reduce.matches){animal={...labPets.start(),mode:'watch',t:0};renderActor();}
    else if(!document.hidden&&!$('home').hidden)frame=requestAnimationFrame(animate);
  }
  function refresh(date,timeline,due){
    const next=selected();
    if(id!==next){
      id=next;synth?.cancel();spoke=0;pose='';actor.hidden=id==='none';ink='';
      if(id!=='none'){animal=labPets.start();renderActor();}
      wake();
    }else if(!frame&&id!=='none'&&!reduce.matches&&!document.hidden&&!$('home').hidden)wake();
    voice.hidden=id==='none';if(id==='none'){bubble.hidden=true;speech.textContent='함께 지낼 동료를 골라 보세요.';$('pet-change').textContent='반려동물 만나기';return;}
    $('pet-change').textContent='동료 바꾸기';
    nowLines=labPets.remark(getState(),date,timeline,due);
    const content=nowLines[0]+id;
    if(content!==ink){ink=content;lineIndex=0;say(nowLines[0]);}
  }
  actor.onclick=()=>{
    if(!nowLines.length)return;
    actor.classList.remove('petted');void actor.offsetWidth;actor.classList.add('petted');
    lineIndex=(lineIndex+1)%nowLines.length;
    say(nowLines[lineIndex]);
  };
  $('pet-change').onclick=()=>{
    let pick=selected();
    show('작업 책상','연구실 반려동물','<div class="pet-grid">'+Object.entries(labPets.kinds).map(([key,[name]])=>
      '<button type="button" class="pet-card" data-pet="'+key+'"><canvas width="26" height="18" aria-hidden="true"></canvas>'+name+'</button>').join('')+
      '</div><div class="actions"><button type="button" class="primary" id="adopt-pet">함께 지내기</button><button type="button" class="textbtn" id="no-pet">혼자 지내기</button></div>');
    const cards=document.querySelectorAll('[data-pet]');
    function mark(){for(const b of cards)b.setAttribute('aria-pressed',String(pick===b.dataset.pet));$('adopt-pet').disabled=pick==='none';}
    for(const b of cards){paintPet(b.querySelector('canvas'),b.dataset.pet,b.dataset.pet==='white'?'rest':'stand',0,-1);b.onclick=()=>{pick=b.dataset.pet;mark();};}mark();
    async function apply(choice){
      const owner=window.pixelAccount.uid,dialog=$('adopt-pet');dialog.disabled=true;
      try{await commit(s=>{s.pet=choice;});if(owner===window.pixelAccount.uid && dialog===$('adopt-pet'))$('modal').close();}
      catch(err){toast(err.message);mark();}
    }
    $('adopt-pet').onclick=()=>apply(pick);$('no-pet').onclick=()=>apply('none');
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden && voiced)synth?.cancel();wake();});reduce.addEventListener('change',wake);
  return {refresh,tick};
}
