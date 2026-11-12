function createStudioUI({getState,show,toast,commit,escapeHTML:esc}){
  const $=id=>document.getElementById(id);
  let category='room', choice=null, saving=false;
  const number=n=>n.toLocaleString('ko-KR');
  function optionList(selected,optional=false){
    const rows=studio.axes(getState()).filter(x=>x.visible);
    return ((optional||!rows.length)?'<option value="">연결 안 함</option>':'')+
      rows.map(x=>'<option value="'+x.id+'"'+(x.id===selected?' selected':'')+'>'+esc(x.name)+'</option>').join('');
  }
  function shop(){
    const s=getState(), w=studio.wallet(s);
    if(!choice || studio.items[choice].category!==category)choice=w.fitted[category];
    const item=studio.items[choice],owned=w.owned.has(choice),applied=w.fitted[category]===choice;
    const label=applied?'사용 중':owned?(category==='room'?'다시 이사':'적용하기'):
      (category==='room'?'이사하기':'구매하고 적용')+' · '+item.price+' token';
    show('작업 책상','연구실 꾸미기','<div class="studio-wallet"><span>'+ (studio.previewCredit?'체험용 지갑':'내 지갑')+'</span><strong>'+number(w.balance)+' token</strong></div>'+
      (Object.values(s.fittings||{}).some(id=>!w.owned.has(id))?'<p class="muteline">다른 기기의 구매와 잔액이 겹쳤어요. 적용되지 않은 항목은 잔액을 확인한 뒤 다시 살 수 있어요.</p>':'')+
      '<canvas id="studio-preview" width="360" height="166" role="img"></canvas>'+
      '<div class="studio-tabs" aria-label="꾸미기 종류">'+Object.entries(studio.categories).map(([id,label])=>
        '<button data-studio-tab="'+id+'" aria-pressed="'+(category===id)+'">'+label+'</button>').join('')+'</div>'+
      '<div class="studio-grid">'+studio.catalog[category].map(([id,name,price,desc,color])=>
        '<button data-studio-item="'+id+'" aria-pressed="'+(id===choice)+'"><i aria-hidden="true" style="background:'+color+'"></i><span>'+name+
        '<small>'+(w.fitted[category]===id?'사용 중':w.owned.has(id)?'보유 중':price+' token')+'</small></span></button>').join('')+'</div>'+
      '<div class="studio-checkout"><div><strong>'+item.name+'</strong><p>'+(category==='room'?furniture.rooms[choice].details+' 포함':item.description)+'</p></div>'+
      '<button id="studio-buy" class="primary" '+(applied||(!owned&&w.balance<item.price)?'disabled':'')+'>'+
      (!owned&&w.balance<item.price?number(item.price-w.balance)+' token 부족':label)+'</button></div>');
    const looks=category==='room'?studio.wallet(s,choice).fitted:w.fitted;
    paintRoom(s.slots,new Date(),{...looks,[category]:choice,placements:s.placements},$('studio-preview'));
    document.querySelectorAll('[data-studio-tab]').forEach(b=>b.onclick=()=>{category=b.dataset.studioTab;choice=null;shop();});
    document.querySelectorAll('[data-studio-item]').forEach(b=>b.onclick=()=>{choice=b.dataset.studioItem;shop();});
    $('studio-buy').onclick=async e=>{
      if(saving)return;saving=true;e.currentTarget.disabled=true;
      const uid=window.pixelAccount.uid;
      try{
        await commit(next=>{
          if(studio.wallet(next).fitted.room!==w.fitted.room)throw Error('연구실이 바뀌었어요. 현재 방에서 다시 선택해 주세요.');
          studio.equip(next,item.id,crypto.randomUUID(),Date.now());
        });
        if(uid===window.pixelAccount.uid && $('modal').open && $('studio-preview')){
          shop();toast(category==='room'?item.name+'로 이사했어요.':item.name+' 적용 완료');
        }
      }catch(err){if(uid===window.pixelAccount.uid && $('modal').open && $('studio-preview')){shop();toast(err.message);}}
      finally{saving=false;}
    };
  }
  function chart(){
    const rows=studio.scores(getState()), target=$('skill-chart');
    if(!rows.length){target.textContent='스킬 설정에서 그래프에 표시할 스킬을 골라 주세요.';return;}
    const max=Math.max(1,...rows.map(x=>x.xp));
    const legend=rows.map(x=>'<li><span>'+esc(x.name)+'</span><b>'+x.xp+' XP</b></li>').join('');
    if(rows.length<=2){
      target.innerHTML='<div class="stat-bars">'+rows.map(x=>'<div class="stat-bar"><span>'+esc(x.name)+'</span><b>'+x.xp+
        ' XP</b><div><i style="width:'+100*x.xp/max+'%"></i></div></div>').join('')+'</div>';return;
    }
    const height=Math.max(236,rows.length*17);
    const centerY=height/2;
    const xy=(i,r)=>{
      const angle=i*2*Math.PI/rows.length-Math.PI/2;
      return [170+r*Math.cos(angle),centerY+r*Math.sin(angle)];
    };
    const polygon=f=>rows.map((x,i)=>xy(i,f(x)).join(',')).join(' ');
    const rings=[1,.75,.5,.25].map(f=>'<polygon class="radar-ring" points="'+polygon(()=>72*f)+'"/>').join('');
    const lines=rows.map((x,i)=>{const [a,b]=xy(i,72);return '<line x1="170" y1="'+centerY+'" x2="'+a+'" y2="'+b+'"/>';}).join('');
    // Keep closely spaced axes legible by distributing each side's labels vertically.
    const sides=[[],[]];
    const points=rows.map((row,i)=>{
      const [x,y]=xy(i,82),side=Math.round(x-170)===0?0:(x>170?1:-1);
      const point={name:row.name,x,y,side,labelY:y};
      if(side)sides[side>0?1:0].push(point);
      else point.labelY=y+(y<centerY?-10:10);
      return point;
    });
    for(const side of sides){
      side.sort((a,b)=>a.y-b.y);
      side.forEach((point,i)=>{point.labelY=Math.min(height-20-(side.length-1-i)*30,
        Math.max(point.y,i?side[i-1].labelY+30:20));});
    }
    const labels=points.map(({name,x,y,side,labelY})=>{
      const chars=Array.from(name),parts=[chars.slice(0,7).join('')];
      if(chars.length>7)parts.push(chars.slice(7,13).join('')+(chars.length>13?'…':''));
      const left=side===0?170:side>0?254:86;
      const leader=side?'<line class="label-line" x1="'+x+'" y1="'+y+'" x2="'+(left-3*side)+'" y2="'+labelY+'"/>':'';
      return '<g><title>'+esc(name)+'</title>'+leader+'<text style="text-anchor:'+
        (side===0?'middle':side>0?'start':'end')+'">'+parts.map((part,j)=>
          '<tspan x="'+left+'" y="'+(labelY+(j-(parts.length-1)/2)*13)+'">'+esc(part)+'</tspan>').join('')+'</text></g>';
    }).join('');
    target.innerHTML='<div class="radar-wrap"><svg viewBox="0 0 340 '+height+'" role="img" aria-label="'+rows.length+'각형 스킬 그래프">'+rings+lines+
      '<polygon class="radar-score" points="'+polygon(x=>72*x.xp/max)+'"/>'+rows.map((x,i)=>{const [a,b]=xy(i,72*x.xp/max);return '<circle cx="'+a+'" cy="'+b+'" r="2.5"/>';}).join('')+labels+
      '</svg><ol class="axis-list">'+legend+'</ol></div>';
  }
  function settings(){
    const defs=studio.axes(getState());
    show('스킬 수첩','스킬 설정','<p class="muteline">체크한 스킬이 그래프와 새 퀘스트에 나타나요. 이름을 바꿔도 쌓은 경험은 이어져요.</p>'+
      '<form id="axis-form">'+defs.map(d=>'<label class="axis-edit"><input type="checkbox" data-visible="'+d.id+'" '+(d.visible?'checked':'')+' aria-label="'+esc(d.name)+' 표시">'+
        '<input data-name="'+d.id+'" value="'+esc(d.name)+'" maxlength="32" required aria-label="'+esc(d.name)+' 이름"></label>').join('')+
      '<div class="axis-add"><label class="field">새 스킬 이름<input id="axis-new" maxlength="32" placeholder="예: 시각 추론"></label>'+
      '<label class="field">연습 방식<select id="axis-base">'+tracks.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('')+'</select></label></div>'+
      '<button class="primary" type="submit">설정 저장</button></form>');
    $('axis-form').onsubmit=async e=>{
      e.preventDefault();if(saving)return;
      const edited=[];
      for(const d of defs){
        const input=document.querySelector('[data-name="'+d.id+'"]'),name=input.value.trim();
        if(!name){input.focus();toast('스킬 이름을 입력해 주세요.');return;}
        const visible=document.querySelector('[data-visible="'+d.id+'"]').checked;
        if(name!==d.name||visible!==d.visible)edited.push({...d,name,visible,created:d.created||0});
      }
      const name=$('axis-new').value.trim();
      if(name)edited.push({id:'s-'+crypto.randomUUID(),name,visible:true,created:Date.now(),base:$('axis-base').value});
      const uid=window.pixelAccount.uid;
      saving=true;
      try{
        await commit(s=>{s.skillDefs={...s.skillDefs,...Object.fromEntries(edited.map(d=>[d.id,d]))};});
        if(uid===window.pixelAccount.uid && $('axis-form')){$('modal').close();toast('스킬 설정을 저장했어요.');}
      }catch(err){toast(err.message);}finally{saving=false;}
    };
  }
  function paint(){
    const w=studio.wallet(getState());
    $('token-balance').textContent=(studio.previewCredit?'체험 · ':'')+number(w.balance)+' token';
    $('room-name').textContent=studio.items[w.fitted.room].name;
    chart();
    // Refresh an open shop on remote edits; preserve unsaved skill form input.
    if($('modal').open && $('studio-preview') && !saving)shop();
  }
  return {shop:()=>{choice=null;shop();},settings,paint,optionList};
}
