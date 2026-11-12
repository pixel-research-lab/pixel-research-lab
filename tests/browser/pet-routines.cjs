// Run against the guest playtest. Advance animation frames for the long naps.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      const nativeFrame=window.requestAnimationFrame.bind(window);
      const cancel=window.cancelAnimationFrame.bind(window);
      const pending=new Map();
      let offset=0;
      window.requestAnimationFrame=cb=>{
        const id=nativeFrame(ms=>{pending.delete(id);cb(ms+offset);});
        pending.set(id,cb);return id;
      };
      window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
      window.advanceFrame=()=>{
        offset+=100;
        const work=Array.from(pending);
        for(const [id,cb] of work){cancel(id);pending.delete(id);cb(performance.now()+offset);}
      };
    });
    await page.goto(process.argv[2]);
    const actor=page.locator('#room-pet');
    await actor.waitFor({state:'visible'});
    const coats=new Set();
    for(const id of ['black','calico','white','cheese','jindo','poodle','corgi']){
      await page.locator('#pet-change').click();
      const card=page.locator('[data-pet="'+id+'"]');
      coats.add(await card.locator('canvas').evaluate(c=>c.toDataURL()));
      await card.click();await page.locator('#adopt-pet').click();
      await page.locator('#modal').waitFor({state:'hidden'});
      const cycle=await page.evaluate(()=>{
        const el=document.querySelector('#room-pet'), art=document.querySelector('#room-art');
        const scenes=[], poses=new Set();
        let sleepingFrames=0, visit=0;
        for(let n=0;n<6000;n++){
          window.advanceFrame();
          const pose=el.dataset.pose;
          poses.add(pose);
          if(pose==='sleep'){
            if(sleepingFrames===0){
              const b=el.getBoundingClientRect(),a=art.getBoundingClientRect();
              scenes.push({fits:b.left>=a.left && b.right<=a.right,activity:el.title,
                y:parseFloat(el.style.top)*166/100});
            }
            sleepingFrames++;
          }
          if(pose==='stretch' && sleepingFrames){scenes.at(-1).seconds=sleepingFrames*.1;sleepingFrames=0;visit++;}
          if(visit===2 && pose==='walk')break;
        }
        return {poses:[...poses],scenes};
      });
      assert.equal(cycle.scenes.length,2,id);
      for(const nap of cycle.scenes){
        assert.ok(nap.fits && Math.abs(nap.y-103)<.01,id);
        assert.match(nap.activity,/책상에서 낮잠/);
        assert.ok(nap.seconds>=59 && nap.seconds<=181,id);
      }
      assert.ok(cycle.poses.includes(['jindo','poodle','corgi'].includes(id)?'settle':'groom'));
      assert.ok(cycle.poses.includes('down') && cycle.poses.includes('lookUp'));
    }
    assert.equal(coats.size,7);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#room-pet').dataset.pose==='watch');
    const still=await actor.getAttribute('style');
    await page.evaluate(()=>{for(let i=0;i<100;i++)window.advanceFrame();});
    assert.equal(await actor.getAttribute('style'),still);
    await actor.click();assert.ok(await actor.evaluate(el=>el.classList.contains('petted')));
    await page.reload();await page.locator('#pet-name').filter({hasText:'웰시코기'}).waitFor();
    await page.locator('#pet-change').click();await page.locator('#no-pet').click();
    await actor.waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);
    console.log('PASS: seven coats adopted, two nap cycles each on a mobile viewport, reduced motion, petting, reload and removal');
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
