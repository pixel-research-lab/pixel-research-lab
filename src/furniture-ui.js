function arrangeFurniture({getState,show,commit,toast}){
  const initial=getState(),look=studio.wallet(initial).fitted,room=look.room;
  const points=furniture.positions(look,initial.placements), touched=new Set();
  let selected='monitor',drag=null;
  show('연구실 꾸미기',studio.items[room].name+' · 가구 배치',
    '<div class="layout-stage"><canvas id="layout-art" width="360" height="166" aria-label="가구 배치 미리보기"></canvas><div class="layout-pieces"></div></div>'+
    '<div class="layout-tools"><label>가구 <select id="layout-choice">'+Object.keys(points).map(k=>'<option value="'+k+'">'+furniture.names[k]+'</option>').join('')+'</select></label>'+
    '<div class="layout-arrows">'+[['←','왼쪽',-3,0],['→','오른쪽',3,0],['↑','위',0,-2],['↓','아래',0,2]].map(([s,n,x,y])=>
      '<button type="button" class="panel-action" data-dx="'+x+'" data-dy="'+y+'" aria-label="'+n+'으로 이동">'+s+'</button>').join('')+'</div></div>'+
    '<p class="muteline">가구를 끌거나 화살표로 옮기세요. 배치 비용은 무료예요.</p>'+
    '<div class="actions"><button id="layout-save" class="primary">배치 저장</button><button id="layout-cancel" class="secondary">취소</button></div>');
  const canvas=document.getElementById('layout-art'),stage=canvas.parentElement,pieces=stage.querySelector('.layout-pieces');
  const select=document.getElementById('layout-choice'),buttons={};
  function selectPiece(k){
    selected=k;select.value=k;
    for(const [key,btn] of Object.entries(buttons))btn.setAttribute('aria-pressed',String(key===k));
  }
  function redraw(){
    const placements=Object.fromEntries(Object.entries(points).map(([k,p])=>[room+'-'+k,p]));
    paintRoom(initial.slots,new Date(),{...look,placements},canvas);
    for(const [k,btn] of Object.entries(buttons))furniture.cssBox(btn,furniture.rect(look,k,points[k]));
  }
  function move(k,x,y){
    points[k]=furniture.settle(look,k,{x,y},points);touched.add(k);redraw();
  }
  function arrows(dx,dy){const p=points[selected];move(selected,p.x+dx,p.y+dy);}
  function finish(e){
    if(!drag || e.pointerId!==drag.id)return;
    const d=drag;drag=null;
    if(e.type==='pointercancel'||e.type==='lostpointercapture'){move(d.key,d.start.x,d.start.y);}
    if(d.btn.hasPointerCapture(d.id))d.btn.releasePointerCapture(d.id);
  }
  for(const k of Object.keys(points)){
    const btn=document.createElement('button');buttons[k]=btn;btn.type='button';btn.dataset.piece=k;
    btn.title=furniture.names[k];btn.setAttribute('aria-label',furniture.names[k]+' 이동');pieces.append(btn);
    btn.onfocus=()=>selectPiece(k);
    btn.onpointerdown=e=>{
      if(drag || !e.isPrimary || e.button!==0)return;
      e.preventDefault();btn.focus({preventScroll:true});selectPiece(k);
      drag={id:e.pointerId,btn,key:k,x:e.clientX,y:e.clientY,start:{...points[k]}};
      btn.setPointerCapture(e.pointerId);
    };
    btn.onpointermove=e=>{
      if(!drag || e.pointerId!==drag.id)return;
      const r=canvas.getBoundingClientRect();
      move(k,drag.start.x+(e.clientX-drag.x)*360/r.width,drag.start.y+(e.clientY-drag.y)*166/r.height);
    };
    btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=finish;
    btn.onkeydown=e=>{
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(delta){e.preventDefault();arrows(...delta);}
    };
  }
  select.onchange=()=>selectPiece(select.value);
  for(const btn of document.querySelectorAll('.layout-arrows button'))btn.onclick=()=>arrows(+btn.dataset.dx,+btn.dataset.dy);
  const dialog=canvas.closest('dialog'),save=document.getElementById('layout-save');
  document.getElementById('layout-cancel').onclick=()=>dialog.close();
  save.onclick=async()=>{
    if(save.disabled)return;
    save.disabled=true;stage.inert=true;
    const edits=Object.fromEntries([...touched].map(k=>[room+'-'+k,{...points[k]}]));
    try{
      await commit(s=>{
        if(studio.wallet(s).fitted.room!==room)throw Error('현재 연구실이 바뀌었어요. 배치 창을 다시 열어 주세요.');
        s.placements={...s.placements,...edits};
      });
      if(canvas.isConnected && dialog.open){dialog.close();toast('가구 배치를 저장했어요.');}
    }catch(err){toast(err.message);}
    finally{save.disabled=false;stage.inert=false;}
  };
  selectPiece(selected);redraw();
}
