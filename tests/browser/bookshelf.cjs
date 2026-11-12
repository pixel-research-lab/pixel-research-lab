const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:18954/';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWsAAAAASUVORK5CYII=','base64');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
 try{
  const issues=[];
  async function page(demo,mobile=false){
   const ctx=await browser.newContext({viewport:mobile?{width:390,height:840}:{width:1460,height:960}});
   const p=await ctx.newPage();p.setDefaultTimeout(8500);p.on('pageerror',e=>issues.push(e.message));
   assert.equal((await p.goto(new URL('?demo='+demo,base).href)).status(),200);return p;
  }
  const p=await page('books'),modal=p.locator('#modal');
  const click=(attr,id)=>modal.locator('[data-'+attr+'="'+id+'"]').first().click();
  await click('book-action','add');await p.locator('[name=title]').fill('논문 테스트');
  await p.locator('[name=url]').fill('zotero://select/library/items/ABCD1234');
  await p.locator('[name=notesUrl]').fill('https://example.org/notes');
  await p.locator('#book-form [type=submit]').click();await p.locator('[name=place]').fill('4쪽 그림 2');
  await p.locator('#reading-form button').click();await click('book-action','new-note');
  await p.locator('#book-note').fill('실험 관찰');await p.locator('[data-rich-picker]').setInputFiles({name:'curve.png',mimeType:'image/png',buffer:png});
  await p.locator('.rich-caption').fill('그림 1');await p.locator('[data-r-action=code]').click();await p.getByRole('textbox',{name:'코드 입력'}).fill('print(1)');
  await p.locator('[name=question]').fill('두 곡선이 벌어지는 이유는?');await p.locator('#shelf-note [type=submit]').click();
  await modal.locator('.book-note img').waitFor();assert.equal(await modal.locator('figcaption').innerText(),'그림 1');
  await click('book-action','edit-note');await p.locator('.rich-figure img').waitFor();
  assert.equal(await p.getByRole('textbox',{name:'코드 입력'}).inputValue(),'print(1)');
  await p.locator('.rich-caption').fill('그림 2');await p.locator('#shelf-note [type=submit]').click();
  await modal.getByText('그림 2',{exact:true}).waitFor();
  await click('book-action','review');assert.equal(await p.locator('#review-question').innerText(),'두 곡선이 벌어지는 이유는?');
  await p.locator('#review-answer').fill('검증 오차가 커지기 때문');await p.locator('#review-form [type=submit]').click();
  await modal.waitFor({state:'hidden'});
  const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('pixel-workspace-preview.v1')));
  const saved=await state(),newCard=saved.reviews.find(c=>c.question.includes('두 곡선이 벌어지는 이유'));
  assert.equal(saved.books[newCard.sourceBook].title,'논문 테스트');assert.ok(saved.reading[newCard.sourceBook].place.includes('4쪽'));
  assert.equal(newCard.firstDue,await p.evaluate(()=>reviewSchedule.addDays(reviewSchedule.today(),1)));
  await p.locator('.monitor-hotspot').click();await click('comms','add');await p.locator('[name=name]').fill('스터디');await p.locator('[name=url]').fill('https://example.org/chat');
  await p.locator('#room-link [type=submit]').click();await p.getByRole('link',{name:'스터디 ↗'}).waitFor();
  await click('comms','sample');await p.getByText(/#lab-updates에 새 글/).waitFor();assert.equal((await p.locator('#notice-count').innerText()).trim(),'· 1');
  await click('comms','read');await p.waitForFunction(()=>document.getElementById('notice-count').textContent==='');
  await p.reload();await modal.getByText('논문 테스트',{exact:true}).waitFor();
  assert.ok(Object.values((await state()).roomNotices)[0].read);
  const no=await page('reward',true);await no.locator('[data-do=grade-no]').click();assert.match(await no.locator('.review-reward').innerText(),/\+1 XP · \+0 token/);
  assert.match(await no.locator('.review-reward').innerText(),/1\/40/);assert.ok(await no.getByText(/출처 · 실험 노트/).count());
  assert.ok(await no.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const yes=await page('reward');assert.equal(await yes.getByText(/출처 · 실험 노트/).count(),0);
  await yes.locator('[data-do=compare-review]').click();await yes.locator('[data-do=grade-yes]').click();
  assert.match(await yes.locator('.review-reward').innerText(),/\+10 XP · \+6 token/);assert.match(await yes.locator('.review-reward').innerText(),/10\/40/);
  assert.deepEqual(issues,[]);console.log('PASS: shelf, rich notes/re-edit, next-day sourced review, bookmark, link, inbox/read, reload, mobile, correct and missed XP.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
