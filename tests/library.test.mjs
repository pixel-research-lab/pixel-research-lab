import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parts,materialize,compare,emptyLab} from '../cloud/model.js';
import {noticeFor,dmManifest,prepare} from '../slack-bridge/slack.mjs';
const js=name=>readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8');
const library=runInNewContext(js('rich-body')+js('library-data')+'\nlibraryData',{URL,TextEncoder});
const book=crypto.randomUUID(),memo=crypto.randomUUID();
test('saved library round-trips with notes, positions and old save support',()=>{
 const state={...emptyLab(),books:{[book]:{title:'논문',type:'논문',created:1,url:'zotero://open-pdf/library/items/ABCD1234?page=4'}},
   reading:{[book]:{place:'4쪽',status:'읽는 중',at:5}},bookNotes:{[memo]:{book,at:3,question:'왜?',body:[{type:'text',text:'메모'}]}}};
 const read=materialize(Array.from(parts(state),([id,value])=>({id,value})).reverse());
 assert.deepEqual(read.bookNotes,state.bookNotes);assert.deepEqual(read.reading,state.reading);
 assert.ok(library.valid(read));assert.ok(library.valid(emptyLab()));
 assert.equal(library.link('javascript:alert(1)'), '');assert.equal(library.link('https://x:p@a.com'),'');assert.equal(library.link('zotero://action/run',true),'');
 const row=(id,value,clock)=>({id,value,clock,actor:'actor'});
 assert.ok(compare(row('book~'+book,{removed:true},1),row('book~'+book,state.books[book],50))>0);
 assert.ok(compare(row('notice~T_Ev1',{read:true},1),row('notice~T_Ev1',{read:false},10))>0);
});
const config={team:'TTEST',channel:'CBOARD',channelName:'news'};
const event=(extra={},payload={})=>({type:'events_api',payload:{team_id:config.team,event_id:'Ev123',...payload,event:{type:'message',channel_type:'channel',channel:config.channel,user:'UOTHER',ts:'1722500000.100200',text:'PRIVATE TEXT',...extra}}});
test('channel notices omit message contents and only selected workspace and new top-level posts pass',async()=>{
 const n=await noticeFor(event(),config);
 assert.equal(n.label,'#news');assert.ok(library.notice(n));assert.ok(!JSON.stringify(n).includes('PRIVATE'));
 for(const envelope of [event({channel:'COTHER'}),event({},{team_id:'TOTHER'}),event({subtype:'message_changed'}),event({thread_ts:'17'}),event({bot_id:'BTEST'}),event({},{event_id:undefined})])assert.equal(await noticeFor(envelope,config),null);
});
test('DM opt-in checks authenticated counterpart and rejects sent messages',async()=>{
 const dm={channel_type:'im',channel:'DTEST'},personal={...config,personal:'local',user:'UME'};
 const lookup=async method=>method==='conversations.info'?{channel:{is_im:true,user:'UOTHER'}}:{user:{name:'연구자'}};
 assert.equal(await noticeFor(event(dm),config,lookup),null);
 assert.equal(await noticeFor(event({...dm,user:'UME'}),personal,lookup),null);
 assert.equal(await noticeFor(event(dm),personal,async()=>({channel:{user:'UDIFF',is_im:true}})),null);
 const n=await noticeFor(event(dm),personal,lookup);assert.equal(n.kind,'dm');assert.equal(n.label,'연구자');assert.ok(library.notice(n));
});
test('receiver validates workspace and membership before opening the socket; DM scopes require opt-in',async()=>{
 const input={app:'xapp-test',bot:'xoxb-test',team:'TTEST',channel:'CBOARD'};
 const base=JSON.parse(readFileSync(new URL('../slack-bridge/manifest.json',import.meta.url)));
 assert.deepEqual(dmManifest(base).settings.event_subscriptions.user_events,['message.im']);assert.equal(base.oauth_config.scopes.user,undefined);
 await assert.rejects(prepare(input,async()=>({team_id:'TOTHER'})),/워크스페이스/);
 await assert.rejects(prepare(input,async m=>m==='auth.test'?{team_id:'TTEST'}:{channel:{is_member:false}}),/초대/);
 const ok=await prepare(input,async m=>m==='auth.test'?{team_id:'TTEST'}:m==='conversations.info'?{channel:{is_member:true,name:'news'}}:{url:'wss://test.invalid'});
 assert.equal(ok.config.channelName,'news');assert.equal(ok.config.personal,'');
});
