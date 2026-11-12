// Run against a seeded guest preview, with Playwright and optionally CHROME_BIN on PATH.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const png=fs.readFileSync(require.resolve('../../assets/images/mascot.png'));
const sha=crypto.createHash('sha256').update(png).digest('hex');
const url=process.argv[2];
async function transfer(p,el,event){
  await el.evaluate((el,[data,event])=>{
    const dt=new DataTransfer(),bytes=Uint8Array.from(atob(data),v=>v.charCodeAt(0));
    dt.items.add(new File([bytes],'hidden-filename.png',{type:'image/png'}));
    const rect=el.getBoundingClientRect();
    el.dispatchEvent(event==='paste'?new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}):
      new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:rect.right-2,clientY:rect.top+12}));
  },[png.toString('base64'),event]);
}
async function dragWidth(page,figure,targetPercent,touch=false){
  const area=figure.locator('.image-resize-area'), frame=figure.locator('.image-resize-frame');
  const handle=figure.getByRole('slider',{name:'그림 너비'});
  await handle.scrollIntoViewIfNeeded();
  const box=await handle.boundingBox(), column=await area.boundingBox(), start=await frame.boundingBox();
  const x=box.x+box.width/2, y=box.y+box.height/2, end=x+(column.width*targetPercent/100-start.width)/2;
  if(touch){
    const client=await page.context().newCDPSession(page);
    try{
      for(const [type,point] of [['touchStart',x],['touchMove',end],['touchEnd',null]]){
        await client.send('Input.dispatchTouchEvent',{type,touchPoints:point===null?[]:[{x:point,y}]});
      }
    }finally{await client.detach();}
  }else{
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(end,y,{steps:6});await page.mouse.up();
  }
  await page.waitForFunction(el=>el.getAttribute('aria-busy')!=='true',await handle.elementHandle());
  const actual=await figure.locator('img').boundingBox();
  assert.ok(Math.abs(actual.width-column.width*targetPercent/100)<=2,'expected '+targetPercent+'% of '+column.width+', got '+actual.width);
  const ratio=await figure.locator('img').evaluate(el=>el.naturalWidth/el.naturalHeight);
  assert.ok(Math.abs(actual.height-actual.width/ratio)<=1,'preserve original aspect ratio');
}
async function main(){
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN || undefined});
  try{
    const errors=[];
    async function open(mobile=false){
      const ctx=await browser.newContext({viewport:mobile?{width:375,height:812}:{width:1450,height:940},hasTouch:mobile});
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6000);
      assert.equal((await p.goto(url)).status(),200);
      await p.waitForFunction(()=>!document.querySelector('main').inert && document.querySelector('[data-do="review"]'));
      return p;
    }
    const p=await open(),q=p.locator('#question'),modal=p.locator('#modal');
    const close=()=>p.locator('#close-modal').click();
    await p.locator('[data-do="review"]').first().click();
    await p.locator('.rich-image img').waitFor();assert.equal(await p.getByText(/그림 2\./).count(),0);
    assert.equal(await modal.locator('code').count(),0);
    await p.locator('[data-do="compare-review"]').click();
    assert.equal(await modal.locator('.rich-figure figcaption').count(),2);
    assert.ok(await modal.locator('.tok-string').count());
    const sample=modal.locator('.rich-figure').first(), sampleAnswer=modal.locator('.rich-figure').last();
    await sampleAnswer.locator('img').waitFor();await dragWidth(p,sampleAnswer,72);
    assert.equal(await sample.locator('.user-sized').count(),0);
    await close();
    await p.locator('[data-do="new"]').first().click();
    const width=(await modal.boundingBox()).width;assert.ok(width>=900&&width<=1000,width);
    await q.fill('앞뒤');await q.press('Home');await q.press('ArrowRight');
    await transfer(p,q,'paste');
    assert.deepEqual(await p.locator('.rich-paragraph').allInnerTexts(),['앞','뒤']);
    assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('.rich-paragraph:last-child')),true);
    await p.keyboard.insertText('그림 아래 ');await p.locator('.rich-caption').fill('그림 1. 관찰 결과');
    await dragWidth(p,p.locator('.rich-piece.rich-figure'),42);
    await p.locator('.rich-paragraph').last().click();await p.keyboard.press('End');
    await p.locator('[data-r-action="code"]').click();
    const snippet='def inspect(x):\n    return "<샘플>" if x < 2 else None';
    await p.getByRole('textbox',{name:'코드 입력'}).fill(snippet);
    assert.ok(await p.locator('.code-stack .tok-keyword').count()>=4);
    await p.locator('[data-file-picker="quest"]').setInputFiles({name:'별도 자료.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n')});
    await p.locator('#register-form [type=submit]').click();await p.locator('#prediction-form').waitFor();
    const read=modal.locator('.rich-read');
    assert.deepEqual(await read.locator(':scope > *').evaluateAll(els=>els.map(el=>el.tagName)),['P','FIGURE','P','DIV']);
    assert.deepEqual(await read.locator('p').allInnerTexts(),['앞','그림 아래 뒤']);
    assert.equal(await read.locator('figcaption').innerText(),'그림 1. 관찰 결과');
    assert.equal(await read.locator('pre').textContent(),snippet);
    assert.equal(await modal.locator('.file-chip').count(),1);assert.ok(!(await modal.innerText()).includes('hidden-filename'));
    await read.locator('img').waitFor();
    assert.equal(await read.getByRole('slider',{name:'그림 너비',exact:true}).getAttribute('aria-valuenow'),'42');
    await dragWidth(p,read.locator('figure'),58);
    await p.locator('#prediction').fill('크기 변경 후에도 예측을 이어 쓴다');
    await close();await p.reload();await p.locator('[data-do=quest]').first().click();
    await p.locator('.rich-image img').waitFor();
    assert.equal(await p.locator('#prediction').inputValue(),'크기 변경 후에도 예측을 이어 쓴다');
    assert.equal(await modal.getByRole('slider',{name:'그림 너비',exact:true}).getAttribute('aria-valuenow'),'58');await close();
    await p.locator('[data-do=new-review]').click();
    await p.locator('#review-question').fill('직접 만든 복습');
    await transfer(p,p.locator('#review-question'),'drop');
    const prompt=p.locator('[data-rich-editor=prompt]'),answer=p.locator('[data-rich-editor=answer]');
    await prompt.locator('.rich-caption').fill('질문 그림');
    await prompt.locator('.rich-paragraph').last().fill('뒤 설명');
    await prompt.locator('[data-r-action="up"]').click();
    assert.equal((await prompt.locator('.rich-blocks').evaluate(el=>el.firstElementChild.tagName)),'FIGURE');
    await prompt.locator('[data-r-action="down"]').click();
    await answer.locator('[data-rich-picker]').setInputFiles({name:'secret.png',mimeType:'image/png',buffer:png});
    await answer.locator('.rich-caption').fill('정답 전용 캡션');
    await answer.locator('.rich-paragraph').last().fill('정답 뒷문단');
    await answer.locator('[data-r-action="code"]').click();
    await answer.locator('select').selectOption('json');await answer.locator('textarea').fill('{"ok": true}');
    await answer.locator('[data-r-action="code"]').click();await answer.locator('.rich-snippet').last().locator('[data-r-action="remove"]').click();
    await p.locator('#review-form [type=submit]').click();await modal.waitFor({state:'hidden'});
    await p.locator('[data-do=review-files]').click();await p.getByRole('button',{name:'직접 만든 복습'}).click();
    await modal.locator('.rich-image img').last().waitFor();assert.equal(await modal.locator('.tok-key').innerText(),'"ok"');
    await close();await p.locator('[data-do=save-panel]').click();const downloading=p.waitForEvent('download');
    await p.locator('[data-do=export-save]').click();const saved=fs.readFileSync(await (await downloading).path()), pack=JSON.parse(saved);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(pack.originals[sha],'base64')).digest('hex'),sha);
    const fresh=await open(true);await fresh.locator('[data-do=save-panel]').click();await fresh.locator('#save-file').setInputFiles({name:'save.json',mimeType:'application/json',buffer:saved});await fresh.locator('[data-do=apply-save]').click();
    await fresh.locator('#modal').waitFor({state:'hidden'});await fresh.locator('[data-do=quest]').first().click();
    await fresh.locator('.rich-image img').waitFor();
    assert.equal(await fresh.locator('.rich-figure [role=slider]').getAttribute('aria-valuenow'),'58');
    await dragWidth(fresh,fresh.locator('.rich-figure'),38,true);
    assert.equal(await fresh.locator('.rich-read pre').textContent(),snippet);
    await fresh.locator('#close-modal').click();await fresh.locator('[data-do=new-review]').click();
    const overflow=()=>fresh.locator('#modal').evaluate(el=>el.scrollWidth>el.clientWidth || el.getBoundingClientRect().width>innerWidth);
    assert.equal(await overflow(),false);await fresh.locator('[data-rich-editor=answer] [data-rich-picker]').setInputFiles({name:'mobile.png',mimeType:'image/png',buffer:png});
    await fresh.locator('[data-rich-editor=answer] img').waitFor();assert.equal(await overflow(),false);
    assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile, middle paste, drop, picker, captions, reorder/delete, highlighted code, question/answer separation, save reload and backup restoration.');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
