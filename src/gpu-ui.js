function createGPUUI({getState,show,commit,toast}){
  const $=id=>document.getElementById(id);
  let selected=gpuLab.models[0].id,saving=false;
  function open(){
    const scroll=$('modal').open && $('gpu-workshop')?$('modal').scrollTop:0;
    const s=getState(),w=studio.wallet(s),model=gpuLab.get(selected),count=gpuLab.progress(model,w);
    const built=w.owned.has(model.id),active=w.fitted.gpu===model.id;
    const remaining=model.requires.reduce((sum,id)=>sum+(w.owned.has(id)?0:gpuLab.items[id].price),0);
    show('부품을 모아 만드는 연구 장비','GPU 조립대',
      '<div id="gpu-workshop"><div class="studio-wallet"><span>내 지갑</span><strong>'+w.balance.toLocaleString('ko-KR')+' token</strong></div>'+
      '<p class="muteline">퀘스트 → 부품 구매 → 무료 조립 → 연구실 가동. 완성한 GPU는 출근할 때 함께 켜져요.</p>'+
      '<div class="gpu-models" aria-label="GPU 설계도">'+gpuLab.models.map(m=>'<button type="button" data-gpu-model="'+m.id+'" aria-pressed="'+(selected===m.id)+'"><strong>'+m.name+'</strong><small>'+m.total+' token · '+(w.owned.has(m.id)?'조립 완료':gpuLab.progress(m,w)+'/4 부품')+'</small></button>').join('')+'</div>'+
      '<div class="gpu-blueprint"><canvas id="gpu-board" width="180" height="76" role="img" aria-label="'+model.name+' 조립도, 부품 '+count+'개 보유"></canvas><div><small>'+model.tag+'</small><h3>'+model.name+'</h3><p>'+model.description+'</p><strong>'+count+' / 4 부품</strong><progress max="4" value="'+count+'" aria-label="부품 수집 진행률"></progress></div></div>'+
      '<div class="gpu-parts">'+model.requires.map(id=>{
        const part=gpuLab.items[id],owned=w.owned.has(id),short=part.price-w.balance;
        return '<article class="gpu-part" data-collected="'+owned+'"><span class="gpu-part-icon" aria-hidden="true">'+{core:'▦',memory:'▥',board:'▤',cooler:'✣'}[part.slot]+'</span><div><h4>'+gpuLab.slots[part.slot][0]+'</h4><p>'+gpuLab.slots[part.slot][1]+'</p><small>'+(owned?'✓ 보유 중':part.price+' token')+'</small></div><button type="button" class="panel-action" data-gpu-buy="'+id+'" '+(owned||short>0?'disabled':'')+'>'+(owned?'구매 완료':short>0?short+' token 부족':'구매')+'</button></article>';
      }).join('')+'</div><div class="gpu-checkout"><p>'+(built?'한 번 조립한 GPU는 무료로 다시 장착할 수 있어요.':count===4?'부품이 모두 모였어요. 이제 조립할 수 있어요!':'완성까지 '+remaining+' token · 조립 비용 없음')+'</p><button type="button" id="gpu-assemble" class="primary" '+(active||count<4?'disabled':'')+'>'+(active?'연구실에 장착 중':built?'이 GPU 장착':'조립하고 장착')+'</button></div>'+
      '<p class="gpu-note">게임 속 수집·꾸미기 장비예요. 실제 연산 자원이나 자동 token 수익은 제공하지 않아요.</p></div>');
    drawGPUBoard($('gpu-board'),model,w.owned);
    document.querySelectorAll('[data-gpu-model]').forEach(b=>b.onclick=()=>{selected=b.dataset.gpuModel;open();});
    document.querySelectorAll('[data-gpu-buy]').forEach(b=>b.onclick=()=>purchase(b.dataset.gpuBuy));
    $('gpu-assemble').onclick=()=>purchase(model.id);
    $('modal').scrollTop=scroll;
  }
  async function purchase(id){
    if(saving)return;
    const uid=window.pixelAccount.uid;
    saving=true;$('gpu-workshop').inert=true;
    try{
      await commit(s=>studio.buy(s,id,crypto.randomUUID(),Date.now()));
      if(uid===window.pixelAccount.uid && $('modal').open && $('gpu-workshop')){
        open();toast(gpuLab.items[id].category==='gpu'?gpuLab.items[id].name+'를 연구실에 장착했어요.':'부품을 구매했어요.');
      }
    }catch(error){
      if(uid===window.pixelAccount.uid && $('modal').open && $('gpu-workshop')){open();toast(error.message);}
    }finally{saving=false;}
  }
  function power(powered,id){
    const model=gpuLab.get(id);
    $('gpu-status').textContent=model?model.name+' · '+(powered?'가동 중':'전원 꺼짐'):'부품을 모아 첫 GPU를 조립해 보세요.';
    $('gpu-hotspot').hidden=!model;
    $('gpu-hotspot').setAttribute('aria-label',model?model.name+' · GPU 조립대 열기':'GPU 조립대 열기');
  }
  function paint(){
    const s=getState(),w=studio.wallet(s);
    power(attendance.timeline(s.attendance).status!=='idle',w.fitted.gpu);
    if($('modal').open && $('gpu-workshop') && !saving)open();
  }
  return {open:()=>{selected=studio.wallet(getState()).fitted.gpu||selected;open();},paint,power};
}
