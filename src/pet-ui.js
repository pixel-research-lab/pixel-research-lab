function createPetUI({getState,show,commit,toast}){
  const $=id=>document.getElementById(id), actor=$('room-pet'), sprite=$('pet-sprite');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let id,animal,scene,last=0,frame=0,drawAt=0,pose='';
  const selected=()=>getState().pet ?? (studio.previewCredit?'black':'none');
  function renderActor(){
    const still=reduce.matches, mode=still?'watch':animal.mode;
    actor.style.left=((still?54:animal.x)/360*100)+'%';actor.style.top=((still?152:animal.y)/166*100)+'%';
    if(pose!==mode){
      pose=mode;
      const activity=pose==='sleep'?(animal.onDesk?'책상에서 낮잠 중':'바닥에서 낮잠 중'):labPets.poses[pose];
      actor.title=labPets.kinds[id][0]+' · '+activity;
      $('pet-name').textContent=actor.title;
      actor.setAttribute('aria-label',actor.title+' · 쓰다듬기');actor.dataset.pose=pose;
    }
    paintPet(sprite,id,mode,still?0:animal.t,still?-1:animal.face);
  }
  function animate(ms){
    frame=0;if(!id||id==='none'||document.hidden||$('home').hidden||reduce.matches)return;
    if(ms-drawAt>=70){
      if(last)labPets.step(animal,Math.min(.18,(ms-last)/1000),Math.random,scene);
      last=ms;drawAt=ms;renderActor();
    }
    frame=requestAnimationFrame(animate);
  }
  function wake(){
    cancelAnimationFrame(frame);frame=0;last=0;drawAt=0;
    if(!id||id==='none')return;
    if(reduce.matches)renderActor();
    else if(!document.hidden&&!$('home').hidden)frame=requestAnimationFrame(animate);
  }
  function refresh(){
    const state=getState(), look=studio.wallet(state).fitted;
    scene={top:furniture.rooms[look.room].top,sites:furniture.landingSites(look,furniture.positions(look,state.placements),state.slots)};
    const next=selected();
    if(id!==next){
      id=next;pose='';actor.hidden=id==='none';
      if(id!=='none'){animal=labPets.start(Math.random,labPets.kinds[id][1]);renderActor();}
      wake();
    }else if(!frame&&id!=='none'&&!reduce.matches&&!document.hidden&&!$('home').hidden)wake();
    if(id==='none')$('pet-name').textContent='연구실 반려동물';
    $('pet-change').textContent=id==='none'?'반려동물 만나기':'동료 바꾸기';
  }
  actor.onclick=()=>{
    actor.classList.remove('petted');void actor.offsetWidth;actor.classList.add('petted');
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
  document.addEventListener('visibilitychange',wake);reduce.addEventListener('change',wake);
  return {refresh};
}
