// Use a fresh guest context: never touch the signed-in researcher's save or Chrome profile.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({args:['--enable-automation']});
 try{
  const session=await browser.newBrowserCDPSession();
  const command=(await session.send('Browser.getBrowserCommandLine')).arguments[0];
  assert.match(command,/headless[-_]shell/, 'Use the headless shell, not a desktop Chrome app');
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Seoul',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];let popups=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('popup',()=>popups++);
  page.setDefaultTimeout(12000);
  await page.clock.install({time:new Date('2026-11-16T20:00:00+09:00')});
  await page.goto(process.argv[2]||'http://127.0.0.1:18966/');
  await page.locator('#shift-main').waitFor();
  await page.evaluate(()=>roomImagesReady);
  const room=page.locator('#room-art');
  const label=()=>room.getAttribute('aria-label');
  const pixel=([x,y])=>page.evaluate(([x,y])=>Array.from(document.querySelector('#room-art').getContext('2d').getImageData(x,y,1,1).data),[x,y]);
  const monitor=await page.evaluate(()=>{const look={room:'studio'},pos=furniture.positions(look);const r=furniture.rect(look,'monitor',pos.monitor);return [r.x+7,r.y+7];});
  const lamp=[267,84];
  const off=[34,43,43,255];
  assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  assert.deepEqual(await pixel(monitor),off);
  const lampOff=await pixel(lamp);
  const out=process.env.POWER_ARTIFACTS;
  if(out){mkdirSync(out,{recursive:true});await room.screenshot({path:out+'/night-off.png'});}
  await page.locator('#shift-main').click();
  await page.waitForFunction(()=>document.querySelector('#shift-main').textContent==='잠시 비움');
  assert.match(await label(),/모니터 켜짐, 스탠드 켜짐/);
  assert.notDeepEqual(await pixel(monitor),off);assert.notDeepEqual(await pixel(lamp),lampOff);
  if(out)await room.screenshot({path:out+'/night-working.png'});
  await page.locator('#shift-main').click();
  assert.match(await label(),/모니터 켜짐, 스탠드 켜짐/); // Paused is still clocked in.
  await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.equal(await page.locator('#shift-main').innerText(),'연구 재개');
  assert.match(await label(),/모니터 켜짐, 스탠드 켜짐/);
  await page.locator('#shift-main').click();
  await page.locator('#shift-out').click();
  assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  assert.deepEqual(await pixel(monitor),off);assert.deepEqual(await pixel(lamp),lampOff);
  await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  await page.locator('#shift-main').click();
  for(const [time,expected] of [['2026-11-17T05:59:00+09:00','켜짐'],['2026-11-17T06:00:00+09:00','꺼짐'],['2026-11-17T12:00:00+09:00','꺼짐'],['2026-11-17T17:59:00+09:00','꺼짐'],['2026-11-17T18:00:00+09:00','켜짐']]){
   await page.clock.setSystemTime(new Date(time));await page.clock.fastForward(1000);
   assert.match(await label(),new RegExp('모니터 켜짐, 스탠드 '+expected),time);
   if(out && time.includes('T12:'))await room.screenshot({path:out+'/day-working.png'});
  }
  await page.locator('[data-do=studio]').click();
  assert.match(await page.locator('#studio-preview').getAttribute('aria-label'),/모니터 켜짐, 스탠드 켜짐/);
  await page.locator('#close-modal').click();await page.locator('[data-do=arrange]').click();
  assert.match(await page.locator('#layout-art').getAttribute('aria-label'),/모니터 켜짐, 스탠드 켜짐/);
  await page.locator('#layout-cancel').click();
  // All room-specific frames, cosmetics, extra monitors and laptop screens honor power.
  const variations=await page.evaluate(()=>{
   const issues=[];let checked=0;
   for(const room of Object.keys(furniture.rooms))for(const monitor of ['standard','graphite','amber'])for(const powered of [false,true]){
    const c=document.createElement('canvas');c.width=360;c.height=166;
    const look={room,monitor,gear:'bench',powered},pos=furniture.positions(look);
    paintRoom([null,null,null],new Date(),look,c);
    const rect=furniture.rect(look,'monitor',pos.monitor);
    const points=[[rect.x+7,rect.y+7],[pos.aux.x+5,pos.aux.y-29],[pos.laptop.x+6,pos.laptop.y-12]];
    for(const point of points){const color=[...c.getContext('2d').getImageData(...point,1,1).data].join(',');if((color==='34,43,43,255')===powered)issues.push({room,monitor,powered,point,color});checked++;}
   }
   return {issues,checked};
  });
  assert.deepEqual(variations.issues,[]);assert.equal(variations.checked,72);
  // Backfilling a forgotten checkout updates room power through the normal record manager.
  await page.locator('.desk-clock').click();await page.locator('#missing-finish').click();
  await page.locator('#edit-time [type=submit]').click();await page.locator('#log-date').waitFor();
  await page.locator('#close-modal').click();
  assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('준비 완료'));
  await context.setOffline(true);await page.reload();await page.evaluate(()=>roomImagesReady);
  assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  await page.locator('#shift-main').click();assert.match(await label(),/모니터 켜짐, 스탠드 켜짐/);
  await page.locator('#shift-out').click();assert.match(await label(),/모니터 꺼짐, 스탠드 꺼짐/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-vla-lab.v1')));
  assert.equal(saved.quests.length,0);assert.deepEqual(saved.slots,['plant',null,null]);
  await context.setOffline(false);await page.clock.fastForward(20*60*1000);
  assert.equal(popups,0);assert.equal(context.pages().length,1);
  assert.deepEqual(errors,[]);
  console.log('PASS: attendance buttons, paused reload, clock boundaries, shop/layout, 72 screen pixels, backfilled checkout, offline save, 20-minute idle with no extra tabs; browser='+command);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
