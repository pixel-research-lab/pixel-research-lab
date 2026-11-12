const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:18976/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined});
 const notices=[],linked=new Set(),requests=[],errors=[];let approvals=0;
 async function device(uid,windows=false){
   const context=await browser.newContext({serviceWorkers:'block',...(windows?{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'}:{})});
   await context.route('**/dist/cloud-account.js',r=>r.fulfill({contentType:'application/javascript',body:
     'window.pixelAccount={uid:'+JSON.stringify(uid)+',init(h){h.guest();h.busy(false)},slackToken:async()=>'+JSON.stringify(uid)+',edit:async()=>true};'}));
   await context.route('**/api/slack/**',async r=>{
     const path=new URL(r.request().url()).pathname.split('/').pop(),who=r.request().headers().authorization?.slice(7);
     assert.equal(who,uid);
     let result={};
     if(path==='feed')result={linked:linked.has(who),ready:true,rows:linked.has(who)?notices:[]};
     if(path==='start')result={url:'https://slack.com/oauth/v2/authorize?state=fixture'};
     if(path==='finish'){approvals++;linked.add(who);}
     if(path==='read')notices.find(x=>x.id===r.request().postDataJSON().id).read=true;
     return r.fulfill({json:result});
   });
   await context.route('https://slack.com/oauth/v2/authorize?state=fixture',r=>r.fulfill({contentType:'text/html',body:'<a href="'+base+'#slack_finish=test-ticket">Allow Slack preview</a>'}));
   const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   await page.goto(base);return page;
 }
 try{
   const mac=await device('same-lab');await mac.locator('#home-slack-toggle').check();await mac.locator('#home-slack-connect').click();
   await mac.locator('#cloud-slack-form [name=dm]').check();await mac.locator('#cloud-slack-form button').click();
   await mac.getByRole('link',{name:'Allow Slack preview'}).click();
   await mac.locator('#home-slack-text').filter({hasText:'새 알림이 없어요'}).waitFor();
   assert.equal(approvals,1);
   const win=await device('same-lab',true),other=await device('different-lab');
   await win.locator('#home-slack-card').waitFor();assert.equal(approvals,1);
   notices.push({id:'EvTEST',kind:'dm',label:'연구자',url:'https://app.slack.com/client/TTEST/DTEST',at:Date.now(),read:false});
   for(const page of [mac,win,other])await page.evaluate(()=>window.dispatchEvent(new Event('online')));
   for(const page of [mac,win])await page.locator('#home-slack-text').filter({hasText:'연구자님에게 Slack DM'}).waitFor();
   await win.locator('#home-slack-read').click();await win.locator('#home-slack-text').filter({hasText:'새 알림이 없어요'}).waitFor();
   await mac.evaluate(()=>window.dispatchEvent(new Event('online')));await mac.locator('#home-slack-text').filter({hasText:'새 알림이 없어요'}).waitFor();
   assert.equal(await other.locator('#home-slack-card').isVisible(),false);assert.equal(approvals,1);
   assert.equal(requests.some(url=>/127\.0\.0\.1:1938[79]/.test(url)),false);assert.deepEqual(errors,[]);
   console.log('PASS: one OAuth return, two isolated browser profiles, shared unread/read state, unrelated account isolation, no local receiver requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
