// Only embedded in the standalone playtest, never in the published game.
function curveImage(answer=false){
  const canvas=document.createElement('canvas');canvas.width=560;canvas.height=270;
  const c=canvas.getContext('2d');
  c.fillStyle='#faf7e8';c.fillRect(0,0,560,270);c.font='bold 18px sans-serif';c.fillStyle='#344f42';
  c.fillText(answer?'검증 오차가 다시 커지는 구간':'학습을 더 오래 하면 어떻게 될까?',28,34);
  c.strokeStyle='#aeb6a3';c.beginPath();c.moveTo(64,60);c.lineTo(64,218);c.lineTo(530,218);c.stroke();
  const draw=(ys,color)=>{c.strokeStyle=color;c.lineWidth=4;c.beginPath();ys.forEach((v,i)=>i?c.lineTo(76+70*i,v):c.moveTo(76,v));c.stroke();};
  draw([75,113,145,173,188,196,201],'#4c7863');draw([82,121,146,163,151,137,119],'#b27755');
  c.font='15px sans-serif';c.fillStyle='#4c7863';c.fillText('학습 오차',422,196);c.fillStyle='#935d42';c.fillText('검증 오차',437,107);
  c.fillStyle='#52614e';c.fillText('오차',18,81);c.fillText('학습 횟수 →',402,246);
  if(answer){c.lineWidth=2;c.setLineDash([4,4]);c.strokeStyle='#947041';c.strokeRect(284,96,219,72);}
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}
// Open a fresh, unsaved quest so a returning visitor can try the same picture.
async function openSizeExample(){
  if(new URLSearchParams(location.search).get('demo')!=='image-size')return;
  const blob=await curveImage();
  document.querySelector('#home [data-do="new"]').click();
  const editor=document.querySelector('#register-form [data-rich-editor]');
  if(!editor)return;
  richEditor.insertFiles(editor,[new File([blob],'학습 곡선.png',{type:'image/png'})]);
  editor.querySelector('.image-resize-frame').scrollIntoView({block:'center'});
}
async function startPlaytest(hooks){
  const key='pixel-workspace-preview.v1';
  if(localStorage.getItem(key)){hooks.guest();await openSizeExample();return;}
  const today=reviewSchedule.today(),id=crypto.randomUUID();
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const attendance=['start','pause','resume','finish'].map((action,index)=>({
    id:crypto.randomUUID(),action,at:new Date(yesterday).setHours([9,12,13,18][index],0,0,0)
  }));
  hooks.busy(true);
  try{
    const materials={},ids={};
    for(const answer of [false,true]){
      const blob=await curveImage(answer);
      const info=await labFiles.inspect(blob),fid=crypto.randomUUID();
      await labFiles.put('guest:'+key,info.sha,blob);
      ids[answer?'answer':'prompt']=fid;
      materials[fid]={id:fid,inline:true,parent:id,section:answer?'answer':'prompt',name:answer?'검증-오차-해설.png':'두-오차-곡선.png',...info};
    }
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({
      version:1,field:'',showOffer:false,quests:[],attendance,inventory:{plant:1},slots:['plant',null,null],offer:0,seenOffers:[0],
      pet:'black',materials,reviews:[{id,question:'그림에서 과적합을 의심할 만한 구간은 어디일까?',answer:'학습 오차는 계속 줄지만 검증 오차가 다시 커지는 뒤쪽 구간이야.',questionBody:[
        {type:'text',text:'두 오차 곡선을 비교해 보세요.'},{type:'image',ref:ids.prompt,caption:'그림 1. 학습 횟수에 따른 오차'},
        {type:'text',text:'어느 구간에서 과적합을 의심할 수 있을까요?'}],
        answerBody:[{type:'text',text:'학습 오차가 줄어드는 동안 검증 오차가 다시 커지는 구간이에요.'},
        {type:'image',ref:ids.answer,caption:'그림 2. 점선은 두 곡선이 벌어지는 구간'},
        {type:'code',lang:'python',text:'best_epoch = min(range(len(val_loss)), key=val_loss.__getitem__)\nprint("검증 오차가 가장 낮은 지점:", best_epoch)'}],
        attempts:[],firstDue:today}]}));
  }catch{hooks.alert('예제 자료를 준비하지 못했어요. 직접 파일을 첨부해 볼 수 있어요.');}
  finally{hooks.guest();hooks.busy(false);}
  await openSizeExample();
}
