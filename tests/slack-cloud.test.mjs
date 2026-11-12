import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac,randomBytes} from 'node:crypto';
import {routes} from '../slack-cloud/worker.mjs';
import {deliver,metadata} from '../slack-cloud/events.mjs';
import {firebaseUser} from '../slack-cloud/security.mjs';

function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../slack-cloud/schema.sql',import.meta.url),'utf8'));
 function stmt(sql,args=[]){const q=sqlite.prepare(sql);return {bind:(...v)=>stmt(sql,v),first:async()=>q.get(...args)||null,
  all:async()=>({results:q.all(...args)}),run:async()=>({meta:{changes:q.run(...args).changes}})};}
 return {prepare:stmt,batch:async statements=>{sqlite.exec('BEGIN');try{for(const s of statements)await s.run();sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
test('a single Slack approval delivers to both devices of the same Firebase user; DM and read state stay private',async()=>{
 const env={DB:database(),APP_ORIGIN:'https://lab.example',FIREBASE_PROJECT:'test',SLACK_CHANNEL:'C123',SLACK_TEAM:'T123',SLACK_APP_ID:'A123',
    SIGNING_SECRET:'test-only',SLACK_CLIENT_ID:'client',CLIENT_SECRET:'sample',TOKEN_KEY:randomBytes(32).toString('base64')};
 const identity=new Map([['device-a','uid1'],['device-b','uid1'],['other-device','uid2']]);
 let exchanges=0;
 const call=async(method,params,token)=>{
   if(method==='oauth.v2.access'){exchanges++;return {team:{id:'T123'},authed_user:{id:'U1',access_token:'example-user-secret',scope:'channels:read,channels:history,im:read,im:history,users:read'}};}
   if(method==='users.conversations'){
     assert.equal(token,'example-user-secret');
     return params.cursor ? {channels:[{id:'C123',name:'테스트'}]} : {channels:[],response_metadata:{next_cursor:'next'}};
   }
   if(method==='conversations.info'){
     assert.equal(token,'example-user-secret');
     if(params.channel.startsWith('D'))return {channel:{is_im:true,user:'U2'}};
     return {channel:{is_member:true,is_private:false,name:'테스트'}};
   }
   if(method==='users.info')return {user:{name:'연구자'}};throw Error('unexpected request');
 };
 const run=routes({identify:req=>identity.get(req.headers.get('Authorization')),call});
 const ask=(path,device,data)=>run(new Request(env.APP_ORIGIN+'/api/slack/'+path,{method:data?'POST':'GET',
   headers:{Authorization:device,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),env,{waitUntil(){}});
 const start=await(await ask('start','device-a',{dm:true})).json(),state=new URL(start.url).searchParams.get('state');
 assert.equal(new URL(start.url).searchParams.get('team'),'T123');
 const go=()=>run(new Request(env.APP_ORIGIN+'/api/slack/callback?state='+state+'&code=sample'),env,{});
 const ticket=new URLSearchParams(new URL((await go()).headers.get('location')).hash.slice(1)).get('slack_finish');
 assert.ok(ticket);assert.match((await go()).headers.get('location'),/slack_error/);
 assert.equal((await ask('finish','other-device',{ticket})).status,400);
 assert.equal((await ask('finish','device-a',{ticket})).status,200);
 assert.equal((await ask('finish','device-a',{ticket})).status,400);assert.equal(exchanges,1);
 assert.equal((await(await ask('feed','device-b')).json()).linked,true);
 const link=await env.DB.prepare('SELECT * FROM links WHERE uid=?').bind('uid1').first();assert.notEqual(link.secret,'example-user-secret');
 const ts=(Date.now()/1000).toFixed(6),event={type:'event_callback',team_id:'T123',api_app_id:'A123',event_id:'EvABCDE',event:{type:'message',user:'U2',channel:'DABC',channel_type:'im',ts,text:'private body'}};
 const row=metadata(event,env);assert.ok(row);assert.ok(!JSON.stringify(row).includes('private body'));assert.equal(metadata({...event,team_id:'TOTHER'},env),null);
 await deliver(row,link,env,call);await deliver(row,link,env,call);
 const feed=async d=>(await(await ask('feed',d)).json()).rows;
 assert.equal((await feed('device-a'))[0].kind,'dm');assert.equal((await feed('device-b')).length,1);assert.deepEqual(await feed('other-device'),[]);
 await ask('read','other-device',{id:row.id});assert.equal((await feed('device-a'))[0].read,false);
 await ask('read','device-b',{id:row.id});assert.equal((await feed('device-a'))[0].read,true);
 await deliver({...row,id:'EvOTHER',sender:'U9'},link,env,call);assert.equal((await feed('device-a')).length,1);
 const signed=async(ts,signature)=>run(new Request(env.APP_ORIGIN+'/api/slack/events',{method:'POST',
    headers:{'X-Slack-Request-Timestamp':ts,'X-Slack-Signature':signature},body:'{"type":"url_verification","challenge":"test"}'}),env,{});
 const stamp=String(Math.floor(Date.now()/1000)), payload='{"type":"url_verification","challenge":"test"}';
 const mac='v0='+createHmac('sha256',env.SIGNING_SECRET).update('v0:'+stamp+':'+payload).digest('hex');
 assert.equal((await(await signed(stamp,mac)).json()).challenge,'test');assert.equal((await signed(stamp,'v0='+'0'.repeat(64))).status,401);
 assert.equal((await ask('feed','stranger')).status,401);
 await ask('disconnect','device-a',{});assert.deepEqual(await feed('device-b'),[]);
});
test('Firebase identity never accepts a caller supplied UID or an unsigned token',async()=>{
 for(const auth of ['Bearer uid1','Bearer abc.def.ghi',null])assert.equal(await firebaseUser(new Request('https://lab.example',{headers:auth?{Authorization:auth}:{}}),'test'),null);
});
