import {unseal} from './security.mjs';
export async function slack(method, fields, token) {
  const response=await fetch('https://slack.com/api/'+method,{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:new URLSearchParams(fields),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('slack-unavailable');
  const result=await response.json();
  if(!result.ok)throw Error(result.error||'slack-unavailable');
  return result;
}
// users.conversations lists channels joined by the user who owns this token.
export async function joinedPublicChannel(id, token, call=slack) {
  let cursor = '';
  do {
    const page = await call('users.conversations', {
      types: 'public_channel', exclude_archived: 'true', limit: '200', cursor
    }, token);
    const channel = page.channels.find(item => item.id === id && !item.is_private);
    if (channel) return channel;
    cursor = page.response_metadata?.next_cursor || '';
  } while (cursor);
  return null;
}
export function metadata(payload,env) {
  const e=payload?.event;
  if(payload.type!=='event_callback'||payload.team_id!==env.SLACK_TEAM||payload.api_app_id!==env.SLACK_APP_ID||
     !/^Ev[A-Z0-9]+$/i.test(payload.event_id)|| e?.type!=='message'||e.subtype||e.bot_id||
     !/^[UW][A-Z0-9]+$/.test(e.user)||!/^\d{10}\.\d{1,6}$/.test(e.ts)) return null;
  const channel=e.channel_type==='channel' && e.channel===env.SLACK_CHANNEL && (!e.thread_ts||e.thread_ts===e.ts);
  const dm=e.channel_type==='im' && /^D[A-Z0-9]+$/.test(e.channel);
  if(!channel&&!dm)return null;
  return {id:payload.event_id,team:payload.team_id,channel:e.channel,sender:e.user,ts:e.ts,kind:dm?'dm':'channel',at:Math.floor(Number(e.ts)*1000)};
}
export async function deliver(row,link,env,call=slack) {
  if(row.kind==='dm' && (!link.dm||row.sender===link.member))return;
  const token=await unseal(link.secret,env.TOKEN_KEY,link.uid+'|'+link.member);
  let label;
  try {
    if(row.kind==='channel'){
      if(row.channel!==link.channel)return;
      const channel=await joinedPublicChannel(row.channel,token,call);
      if(!channel)return;
      label='#'+channel.name;
    }else{
      const {channel}=await call('conversations.info',{channel:row.channel},token);
      if(!channel.is_im||channel.user!==row.sender)return;
      const {user}=await call('users.info',{user:row.sender},token);
      label=user.profile?.display_name||user.real_name||user.name||row.sender;
    }
  } catch(error) {
    if(['channel_not_found','not_in_channel','user_not_found','missing_scope'].includes(error.message))return;
    if(['invalid_auth','token_revoked','account_inactive'].includes(error.message)){
      await env.DB.prepare('DELETE FROM links WHERE uid=? AND generation=?').bind(link.uid,link.generation).run();return;
    }
    throw error;
  }
  const url='https://app.slack.com/client/'+row.team+'/'+row.channel+'/'+row.ts;
  await env.DB.prepare('INSERT OR IGNORE INTO notices(uid,generation,id,kind,label,at,url) SELECT uid,generation,?,?,?,?,? FROM links WHERE uid=? AND generation=?')
    .bind(row.id,row.kind,label.slice(0,120),row.at,url,link.uid,link.generation).run();
}
export async function processEvents(env,eventId=null) {
  const now=Date.now();
  const due=eventId?env.DB.prepare('SELECT * FROM inbox WHERE next<=? AND id=?').bind(now,eventId):env.DB.prepare('SELECT * FROM inbox WHERE next<=? ORDER BY at LIMIT 1').bind(now);
  const {results}=await due.all();
  for(const row of results){
    const lease=await env.DB.prepare('UPDATE inbox SET next=? WHERE id=? AND next<=?').bind(now+120000,row.id,now).run();
    if(!lease.meta.changes)continue;
    try {
      const {results:links}=await env.DB.prepare('SELECT * FROM links WHERE team=? AND linked_at<=? AND (channel=? OR (?=1 AND dm=1)) AND uid>? ORDER BY uid LIMIT 8')
        .bind(row.team,row.at,row.channel,Number(row.kind==='dm'),row.cursor).all();
      for(const link of links)await deliver(row,link,env);
      if(links.length===8)await env.DB.prepare('UPDATE inbox SET cursor=?,next=0 WHERE id=?').bind(links.at(-1).uid,row.id).run();
      else await env.DB.prepare('DELETE FROM inbox WHERE id=?').bind(row.id).run();
    } catch { /* The lease expires and the next scheduled run retries. */ }
  }
}
