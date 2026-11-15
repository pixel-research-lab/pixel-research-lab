// Fresh isolated guest only; never reuse the researcher's browser profile or account.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Seoul'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  await page.clock.install({time:new Date('2026-11-16T20:00:00+09:00')});
  await page.goto(process.argv[2]||'http://127.0.0.1:18969/');await page.evaluate(()=>roomImagesReady);
  const open=()=>page.locator('.gpu-strip [data-do=gpu]').click();
  await open();assert.equal(await page.locator('[data-gpu-model]').count(),3);
  assert.ok(await page.locator('#gpu-assemble').isDisabled());
  assert.equal(await page.locator('[data-gpu-buy]:disabled').count(),4);
  await page.locator('#close-modal').click();
  // Credit comes solely from completed quests, with a legacy desktop layout kept intact.
  await page.evaluate(()=>{
   const s={version:1,field:'GPU 연구실',quests:[],inventory:{plant:1,mug:40},slots:['mug','plant',null],offer:0,seenOffers:[0]};
   for(let i=0;i<40;i++)s.quests.push({id:'gpu-test-'+i,question:'완료한 연구',track:'read',skill:0,card:0,status:'done',created:i,ended:i+1,rankBefore:0,rankAfter:1,loot:'mug'});
   if(!labSave.valid(s))throw Error('Invalid fixture');
   localStorage.setItem('pixel-vla-lab.v1',JSON.stringify(s));
  });
  await page.reload();await open();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-vla-lab.v1')));
  const directory=process.env.GPU_ARTIFACTS;if(directory)mkdirSync(directory,{recursive:true});
  for(const model of ['gpu-sprout','gpu-discovery','gpu-galaxy']){
   await page.locator('[data-gpu-model='+model+']').click();
   for(const part of ['core','memory','board','cooler']){
    assert.ok(await page.locator('#gpu-assemble').isDisabled());
    await page.locator('[data-gpu-buy='+model+'-'+part+']').click();
    await page.waitForFunction(id=>document.querySelector('[data-gpu-buy="'+id+'"]').textContent==='구매 완료',model+'-'+part);
   }
   assert.ok(await page.locator('#gpu-assemble').isEnabled());
   const spent=await page.evaluate(()=>studio.wallet(JSON.parse(localStorage.getItem('pixel-vla-lab.v1'))).spent);
   await page.locator('#gpu-assemble').click();
   await page.waitForFunction(()=>document.querySelector('#gpu-assemble').textContent==='연구실에 장착 중');
   assert.equal(await page.evaluate(()=>studio.wallet(JSON.parse(localStorage.getItem('pixel-vla-lab.v1'))).spent),spent);
   if(directory)await page.locator('#modal').screenshot({path:directory+'/'+model+'.png'});
  }
  assert.equal(await page.evaluate(()=>studio.wallet(JSON.parse(localStorage.getItem('pixel-vla-lab.v1'))).balance),130);
  await page.locator('#close-modal').click();
  assert.match(await page.locator('#gpu-status').innerText(),/은하 GPU · 전원 꺼짐/);
  const before=await saved();assert.deepEqual(before.slots,['mug','plant',null]);assert.equal(before.quests.length,40);
  const label=()=>page.locator('#room-art').getAttribute('aria-label');
  assert.match(await label(),/은하 GPU 전원 꺼짐/);
  const off=await page.locator('#room-art').evaluate(c=>[...c.getContext('2d').getImageData(342,113,1,1).data]);
  await page.locator('#shift-main').click();assert.match(await label(),/은하 GPU 가동 중/);
  assert.match(await page.locator('#gpu-status').innerText(),/은하 GPU · 가동 중/);
  const on=await page.locator('#room-art').evaluate(c=>[...c.getContext('2d').getImageData(342,113,1,1).data]);assert.notDeepEqual(on,off);
  const fan=()=>page.locator('#room-art').evaluate(c=>[...c.getContext('2d').getImageData(324,113,12,12).data]);
  const spinning=await fan();await page.clock.fastForward(1000);assert.notDeepEqual(await fan(),spinning);
  await page.emulateMedia({reducedMotion:'reduce'});const still=await fan();await page.clock.fastForward(3000);assert.deepEqual(await fan(),still);
  if(directory)await page.locator('.room').screenshot({path:directory+'/gpu-room.png'});
  await page.locator('#shift-main').click();assert.match(await label(),/은하 GPU 가동 중/);
  await page.locator('#shift-out').click();assert.match(await label(),/은하 GPU 전원 꺼짐/);
  assert.match(await page.locator('#gpu-status').innerText(),/은하 GPU · 전원 꺼짐/);
  await page.locator('#gpu-hotspot').click();await page.locator('[data-gpu-model=gpu-sprout]').click();
  await page.locator('#gpu-assemble').click();await page.locator('#close-modal').click();
  await page.reload();await page.evaluate(()=>roomImagesReady);assert.match(await label(),/새싹 GPU 전원 꺼짐/);
  assert.equal(await page.evaluate(()=>studio.wallet(JSON.parse(localStorage.getItem('pixel-vla-lab.v1'))).balance),130);
  const all=await saved();assert.ok(await page.evaluate(s=>labSave.valid(labSave.read({format:'pixel-research-lab',formatVersion:1,state:s})),all));
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('준비 완료'));
  await context.setOffline(true);await page.reload();await page.evaluate(()=>roomImagesReady);await open();
  await page.locator('[data-gpu-model=gpu-discovery]').click();await page.locator('#gpu-assemble').click();
  await page.locator('#close-modal').click();assert.match(await label(),/탐구 GPU 전원 꺼짐/);
  await page.reload();assert.match(await label(),/탐구 GPU 전원 꺼짐/);
  await context.setOffline(false);
  await page.setViewportSize({width:390,height:844});await open();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth));
  if(directory)await page.locator('#modal').screenshot({path:directory+'/gpu-mobile.png'});
  await page.locator('#close-modal').click();
  assert.deepEqual((await saved()).slots,before.slots);assert.deepEqual((await saved()).quests,before.quests);
  assert.deepEqual(errors,[]);
  console.log('PASS: 12 part purchases, three assemblies, no duplicate charges, equip/LED/attendance, legacy save, offline reload/equip, 390px layout and no page errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
