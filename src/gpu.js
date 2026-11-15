// Permanent catalog IDs and token prices: purchases also travel in exported saves.
const gpuLab = (() => {
  const slots = {
    core:['GPU 코어','연산을 맡는 작은 칩'],
    memory:['메모리','계산할 자료를 담는 메모리'],
    board:['기판','부품과 전원을 이어 주는 회로'],
    cooler:['쿨러','열을 식히는 방열판과 팬']
  };
  const models = [
    {id:'gpu-sprout',name:'새싹 GPU',tag:'첫 번째 조립',description:'작은 초록 기판과 싱글 팬. 내 연구실의 첫 GPU예요.',color:'#80a880',fans:1,prices:[60,40,30,20]},
    {id:'gpu-discovery',name:'탐구 GPU',tag:'넓어진 연구실',description:'구리빛 회로와 듀얼 팬을 갖춘 연구실의 든든한 장비예요.',color:'#d6a361',fans:2,prices:[120,85,65,50]},
    {id:'gpu-galaxy',name:'은하 GPU',tag:'오래 모은 결실',description:'별빛 표시등과 트리플 팬. 꾸준한 연구로 완성하는 수집 목표예요.',color:'#a39ac7',fans:3,prices:[240,160,110,90]}
  ];
  const items={};
  for(const model of models){
    model.requires=Object.keys(slots).map((slot,i)=>{
      const id=model.id+'-'+slot;
      items[id]={id,name:model.name+' '+slots[slot][0],category:'gpu-part',price:model.prices[i],slot,model:model.id};
      return id;
    });
    model.total=model.prices.reduce((a,b)=>a+b,0);
    items[model.id]={...model,category:'gpu',price:0};
  }
  const get=id=>models.find(m=>m.id===id);
  const progress=(model,wallet)=>model.requires.filter(id=>wallet.owned.has(id)).length;
  return {slots,models,items,get,progress};
})();
