// Run against the guest furniture preview. Exercise real mouse and touch coordinates.
const {chromium}=require('playwright'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=new URL(process.argv[2]);url.searchParams.set('demo','furniture');await page.goto(url.href);
  const item=id=>page.locator('[data-studio-item="'+id+'"]');
  const tab=id=>page.locator('[data-studio-tab="'+id+'"]');
  const wallet=()=>page.locator('#token-balance').innerText();
  const close=()=>page.locator('#close-modal').click();
  async function buy(id){await item(id).click();await page.locator('#studio-buy').click();await page.waitForFunction(()=>document.querySelector('#studio-buy')?.textContent==='사용 중');}
  await buy('river');assert.match(await wallet(),/1,550/);
  await tab('clock').click();await buy('flip-clock');assert.match(await wallet(),/1,515/);
  await tab('gear').click();await buy('bench');assert.match(await wallet(),/1,355/);
  await close();
  const arrange=()=>page.locator('[data-do=arrange]').click();
  const clock=page.locator('.desk-clock'), oldClock=await clock.getAttribute('style');
  const oldNotes=await page.locator('#monitor-notes').getAttribute('style');
  async function drag(id,delta,touch=false){
    const piece=page.locator('[data-piece="'+id+'"]');await piece.scrollIntoViewIfNeeded();
    const r=await piece.boundingBox(),art=await page.locator('#layout-art').boundingBox();
    const x=r.x+r.width/2,y=r.y+r.height/2,end=x+delta*art.width/360;
    if(touch){
      const client=await page.context().newCDPSession(page);
      for(const [type,pos] of [['touchStart',x],['touchMove',end],['touchEnd',null]])await client.send('Input.dispatchTouchEvent',{type,touchPoints:pos===null?[]:[{x:pos,y}]});
      await client.detach();
    }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(end,y,{steps:8});await page.mouse.up();}
  }
  await arrange();assert.equal(await page.locator('[data-piece]').count(),6);
  await drag('clock',75);await page.locator('#layout-cancel').click();
  assert.equal(await clock.getAttribute('style'),oldClock);
  await arrange();await drag('clock',75);await drag('monitor',-60);
  await page.locator('#layout-save').click();await page.locator('#modal').waitFor({state:'hidden'});
  const newClock=await clock.getAttribute('style'),newNotes=await page.locator('#monitor-notes').getAttribute('style');
  assert.notEqual(oldClock,newClock);assert.notEqual(oldNotes,newNotes);assert.match(await wallet(),/1,355/);
  await clock.click();assert.match(await page.locator('#modal').innerText(),/출퇴근/);await close();
  await page.locator('[data-do=studio]').click();await tab('room').click();await buy('studio');await close();
  assert.notEqual(await clock.getAttribute('style'),newClock);
  await page.locator('[data-do=studio]').click();await buy('river');await tab('clock').click();
  assert.equal(await item('flip-clock').getAttribute('aria-pressed'),'true');await close();
  url.search='';await page.goto(url.href);await page.locator('#room-name').filter({hasText:'한강뷰'}).waitFor();
  assert.equal(await clock.getAttribute('style'),newClock);assert.equal(await page.locator('#monitor-notes').getAttribute('style'),newNotes);
  await page.setViewportSize({width:390,height:844});await arrange();await drag('calendar',-85,true);
  const expected=await page.locator('[data-piece=calendar]').evaluate(el=>el.style.left);
  assert.ok(parseFloat(expected)<80);await page.locator('#layout-save').click();
  await page.locator('#modal').waitFor({state:'hidden'});
  assert.equal(await page.locator('.wall-calendar').evaluate(el=>el.style.left),expected);
  await page.locator('.wall-calendar').click();assert.match(await page.locator('#modal').innerText(),/달력|일정/);
  assert.deepEqual(errors,[]);console.log('PASS: room move, included furniture, cosmetics, actual mouse/touch placement, cancel, return, notes, click targets and balance');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
