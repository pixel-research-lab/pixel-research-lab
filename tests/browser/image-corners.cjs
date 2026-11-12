// Exercise the visible photograph itself rather than targeting its slider by selector.
const {chromium, webkit}=require('playwright');
const assert=require('node:assert/strict');

async function dragCorner(page,img,corner,dx){
  await img.scrollIntoViewIfNeeded();
  const before=await img.boundingBox(),right=corner.endsWith('e'),bottom=corner.startsWith('s');
  const x=before.x+(right?before.width-3:3),y=before.y+(bottom?before.height-3:3);
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+dx,y+(bottom?-3:3),{steps:8});
  await page.mouse.up();
  const after=await img.boundingBox();
  const expected=right?2*dx:-2*dx;
  assert.ok(Math.abs(after.width-before.width-expected)<9,corner+' drag: '+before.width+' → '+after.width);
  assert.ok(Math.abs(before.height/before.width*after.width-after.height)<1);
  return [Math.round(before.width), Math.round(after.width)];
}

async function main(){
  const engine=process.argv[3] || 'chromium';
  const browser=await ({chromium,webkit}[engine]).launch(engine==='chromium'?{executablePath:process.env.CHROME_BIN}: {});
  try{
    const p=await browser.newPage({viewport:{width:1320,height:850}});
    const url=new URL(process.argv[2]);url.searchParams.set('demo','image-size');
    await p.goto(url.href);p.setDefaultTimeout(8000);
    const form=p.locator('#register-form'),img=form.locator('.rich-figure img');
    await img.waitFor();await img.evaluate(i=>i.decode());
    const changes=[];
    for(const [corner,dx] of [['ne',-60],['nw',-45],['sw',40],['se',50]])changes.push(await dragCorner(p,img,corner,dx));
    const slider=form.getByRole('slider',{name:'그림 크기',exact:true});
    await slider.focus();await slider.press('End');await slider.press('ArrowLeft');
    const percent=await slider.inputValue();assert.equal(percent,'99');
    await form.locator('button[type=submit]').click();
    const saved=p.locator('#modal .rich-image img');await saved.waitFor();
    assert.equal(await p.locator('#modal .image-size-bar input').inputValue(),percent);
    await saved.click();
    const viewer=p.locator('#file-view'), original=viewer.locator('img');await original.waitFor();
    changes.push(await dragCorner(p,original,'ne',-70));
    const savedPercent=await viewer.locator('.image-size-bar input').inputValue();
    assert.ok(Number(savedPercent)<99);
    await viewer.locator('.closebtn').click();
    assert.equal(await p.locator('#modal .image-size-bar input').inputValue(),savedPercent);
    url.search='';await p.goto(url.href);
    await p.locator('[data-do=quest]').first().click();await saved.waitFor();
    assert.equal(await p.locator('#modal .image-size-bar input').inputValue(),savedPercent);
    console.log(engine,'four corners and original viewer widths in px:',JSON.stringify(changes),'saved:',savedPercent+'%');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
