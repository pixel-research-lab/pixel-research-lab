const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const base=process.argv[2]||'http://127.0.0.1:18968/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(base);await page.evaluate(()=>roomImagesReady);
  assert.equal(await page.locator('.loot-cell').count(),50);
  assert.equal(await page.locator('#loot-count').innerText(),'1 / 50종');
  assert.equal(await page.locator('.loot-cell[data-owned=false]').count(),49);
  assert.ok(await page.locator('#loot img').evaluateAll(imgs=>imgs.every(i=>i.complete && i.naturalWidth===16)));
  const groups=await page.evaluate(()=>Object.keys(lootGroups));
  for(const group of groups){await page.locator('#loot-group').selectOption(group);assert.equal(await page.locator('.loot-cell').count(),10);}
  await page.locator('#loot-owned').check();assert.equal(await page.locator('.loot-cell').count(),0);assert.ok(await page.getByText('이 분류에서 아직 얻은 전리품이 없어요.').isVisible());
  await page.locator('#loot-group').selectOption('');assert.equal(await page.locator('.loot-cell').count(),1);await page.locator('#loot-owned').uncheck();
  // A real quest completion with a legacy inventory must unlock something new.
  await page.evaluate(()=>{
   const s=labSave.read({version:1,quests:[],inventory:{plant:1,lens:2,mug:1,floppy:1},slots:['plant','mug','floppy'],offer:0,seenOffers:[0]});
   s.quests.push({id:'repeat-intro',title:requests[0][0],question:'색깔과 모양을 비교한 결과는?',track:'design',skill:0,card:0,status:'active',created:Date.now()});
   localStorage.setItem('pixel-vla-lab.v1',JSON.stringify(s));
  });
  await page.reload();await page.locator('[data-do=quest][data-arg=repeat-intro]').click();
  await page.locator('#finding').fill('두 조건을 비교했고 같은 렌즈가 아닌 새 전리품을 확인했다.');
  await page.locator('#finish-form [type=submit]').click();
  const awarded=await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-vla-lab.v1')).quests[0].loot);
  assert.ok(!['plant','lens','mug','floppy'].includes(awarded));
  await page.locator('[data-do=place-loot]').click();await page.locator('[data-do=slot][data-arg="0"]').click();await page.locator('#close-modal').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-vla-lab.v1')));
  assert.equal(saved.slots[0],awarded);assert.equal(saved.inventory.lens,2);assert.equal(saved.inventory[awarded],1);
  assert.deepEqual(saved.slots.slice(1),['mug','floppy']);
  await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.ok((await page.locator('#desk-summary').innerText()).includes(await page.evaluate(id=>lootDefs[id][0],awarded)));
  // Offline reload includes all 43 new images and the updated save validator.
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('준비 완료'));
  await context.setOffline(true);await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.ok(await page.locator('#loot img').evaluateAll(imgs=>imgs.every(i=>i.complete && i.naturalWidth)));
  assert.ok(await page.evaluate(()=>labSave.valid(JSON.parse(localStorage.getItem('pixel-vla-lab.v1')))));
  await context.setOffline(false);
  const directory=process.env.LOOT_ARTIFACTS;
  if(directory)mkdirSync(directory,{recursive:true});
  await page.setViewportSize({width:390,height:844});await page.locator('#loot-group').selectOption('cosmos');
  assert.equal(await page.locator('.loot-cell').count(),10);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.loot-cell[data-arg=telescope]').click();assert.match(await page.locator('#modal-body').innerText(),/별 찾는 망원경/);
  await page.locator('#close-modal').click();
  if(directory)await page.locator('#loot').locator('..').screenshot({path:directory+'/loot-mobile.png'});
  // Preview every collectible on a desk and validate import/export of the complete collection.
  const all=await page.evaluate(()=>{
   const s=JSON.parse(localStorage.getItem('pixel-vla-lab.v1'));
   s.inventory=Object.fromEntries(Object.keys(lootDefs).map(id=>[id,1]));s.slots=['terrarium','telescope','catlamp'];
   const restored=labSave.read(JSON.stringify({format:'pixel-research-lab',formatVersion:1,state:s}));
   localStorage.setItem('pixel-vla-lab.v1',JSON.stringify(restored));return restored;
  });
  assert.equal(Object.keys(all.inventory).length,50);
  await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.equal(await page.locator('#loot-count').innerText(),'50 / 50종');
  await page.setViewportSize({width:1440,height:1000});
  if(directory){
   await page.locator('#room-art').screenshot({path:directory+'/loot-desk.png'});
   const catalog=await page.evaluate(()=>({groups:lootGroups,items:lootDefs}));
   const sheet=await context.newPage();
   await sheet.setViewportSize({width:1200,height:1040});
   await sheet.setContent('<html lang="ko"><meta charset="utf-8"><style>body{margin:0;padding:28px;background:#f6f0dc;color:#34493c;font:14px system-ui}h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;margin:18px 0 8px}.grid{display:grid;grid-template-columns:repeat(10,1fr);gap:8px}.item{text-align:center;background:#e6e7d3;border:1px solid #b8bfa5;padding:8px 4px;border-radius:5px;min-height:100px;display:grid;place-items:center}.item img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated}.item span{font-size:12px}</style><h1>픽셀 연구실 · 전리품 50종</h1><p>기존 7종 + 새 장식 43종</p>'+Object.entries(catalog.groups).map(([group,name])=>'<h2>'+name+'</h2><div class="grid">'+Object.entries(catalog.items).filter(([,item])=>item[2]===group).map(([id,item])=>'<div class="item"><img src="'+new URL('assets/images/items/'+id+'.png',base)+'"><span>'+item[0]+'</span></div>').join('')+'</div>').join('')+'</html>');
   await sheet.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await sheet.screenshot({path:directory+'/loot-catalog.png',fullPage:true});await sheet.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: 50 icons, five groups, owned filter, real reward without legacy duplicates, placement/reload, offline assets, 390px layout and full-collection save round trip');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
