const api='https://slack.com/api/';
export async function callSlack(method,token,params={}){
  const response=await fetch(api+method,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),signal:AbortSignal.timeout(12000)});
  const result=await response.json();
  if(!result.ok)throw Error(method+' · '+(result.error||'slack_error'));
  return result;
}
export function dmManifest(base){
  const copy=structuredClone(base);
  copy.oauth_config.scopes.user=['im:history','im:read','users:read'];
  copy.settings.event_subscriptions.user_events=['message.im'];
  return copy;
}
export async function noticeFor(envelope,config,lookup=callSlack){
  const payload=envelope.payload,e=payload?.event;
  if(envelope.type!=='events_api' || payload.team_id!==config.team || e?.type!=='message' || e.subtype || e.bot_id || !e.user)return null;
  const id=payload.event_id, at=Math.floor(Number(e.ts)*1000);
  if(typeof id!=='string'||!/^Ev[A-Za-z0-9]+$/.test(id)||typeof e.channel!=='string'||!/^[CD][A-Z0-9]+$/.test(e.channel)||!Number.isSafeInteger(at))return null;
  const common={id:config.team+'_'+id,at,url:'https://app.slack.com/client/'+config.team+'/'+e.channel+'/'+e.ts};
  if(e.channel_type==='channel' && e.channel===config.channel && (!e.thread_ts||e.thread_ts===e.ts))return {...common,kind:'channel',label:'#'+config.channelName};
  if(!config.personal || e.channel_type!=='im' || e.user===config.user)return null;
  // A user token can only confirm its own DM, even when Slack delivers a bot event.
  const info=await lookup('conversations.info',config.personal,{channel:e.channel});
  if(!info.channel?.is_im || info.channel.user!==e.user)return null;
  const profile=(await lookup('users.info',config.personal,{user:e.user})).user;
  return {...common,kind:'dm',label:(profile.profile?.display_name||profile.real_name||profile.name||e.user).slice(0,120)};
}
export async function prepare(input,lookup=callSlack){
  const {app,bot,personal='',channel,team}=input;
  if(!/^xapp-/.test(app)||!/^xoxb-/.test(bot)||!/^C[A-Z0-9]+$/.test(channel)||!/^T[A-Z0-9]+$/.test(team))throw Error('토큰 종류와 워크스페이스·채널 ID를 확인해 주세요.');
  const identity=await lookup('auth.test',bot);
  if(identity.team_id!==team)throw Error('봇 토큰이 선택한 워크스페이스와 달라요.');
  const info=await lookup('conversations.info',bot,{channel});
  if(!info.channel?.is_member || info.channel.is_private)throw Error('선택한 공개 채널에서 앱을 먼저 초대해 주세요.');
  const config={app,bot,personal,channel,team,channelName:info.channel.name};
  if(personal){
    if(!/^xoxp-/.test(personal))throw Error('개인 DM은 본인 사용자 토큰으로만 연결할 수 있어요.');
    const me=await lookup('auth.test',personal);
    if(me.team_id!==team || me.bot_id)throw Error('본인 워크스페이스의 사용자 토큰을 확인해 주세요.');
    config.user=me.user_id;
  }
  const ticket=await lookup('apps.connections.open',app);
  if(!ticket.url?.startsWith('wss://'))throw Error('Slack 연결 주소를 받지 못했어요.');
  return {config,ticket:ticket.url};
}
export function listen(config,ticket,onNotice,onStatus){
  let stopped=false,ws,timer,attempt=0;
  const pending=new Set();
  const retry=()=>{
    if(stopped)return;
    onStatus(false);
    timer=setTimeout(async()=>{
      try{const next=await callSlack('apps.connections.open',config.app);if(!stopped)attach(next.url);}
      catch{retry();}
    },Math.min(30000,1000*2**Math.min(attempt++,5)));
  };
  function attach(url){
    ws=new WebSocket(url);
    ws.onmessage=async ({data})=>{
      let msg;try{msg=JSON.parse(data);}catch{return;}
      if(msg.envelope_id)ws.send(JSON.stringify({envelope_id:msg.envelope_id}));
      if(msg.type==='hello'){attempt=0;onStatus(true);return;}
      if(msg.type==='disconnect'){ws.close();return;}
      const key=msg.payload?.event_id;if(!key||pending.has(key))return;
      pending.add(key);
      try{const notice=await noticeFor(msg,config);if(notice&&!stopped)onNotice(notice);}
      catch(error){if(!stopped)onStatus(ws.readyState===1,'알림 확인 실패 · '+error.message);}
      finally{pending.delete(key);}
    };
    ws.onclose=retry;ws.onerror=()=>ws.close();
  }
  attach(ticket);
  return ()=>{stopped=true;clearTimeout(timer);if(ws)ws.close();};
}
