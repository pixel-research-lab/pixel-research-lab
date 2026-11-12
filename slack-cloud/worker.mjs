import {firebaseUser,random,seal,signedEvent} from './security.mjs';
import {metadata,slack,processEvents,joinedPublicChannel} from './events.mjs';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
const redirect=url=>new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
const base='/api/slack';
export const routes=({identify=firebaseUser,call=slack}={})=>async(request,env,ctx)=>{
  const url=new URL(request.url),path=url.pathname.slice(base.length);
  if(!url.pathname.startsWith(base+'/'))return env.ASSETS.fetch(request);
  const db=env.DB, now=Date.now(), origin=env.APP_ORIGIN, callback=origin+base+'/callback';
  // Always send authorization codes back to the configured preview, never to a URL supplied by a visitor.
  if(request.method==='GET' && path==='/callback'){
    const fail=()=>redirect(origin+'/#slack_error=authorization');
    const state=url.searchParams.get('state'),code=url.searchParams.get('code');
    if(!/^[0-9a-f]{64}$/.test(state)||!code||code.length>1024||url.searchParams.has('error'))return fail();
    const ticket=random();
    const res=await db.prepare('UPDATE flows SET ticket=?, code=? WHERE state=? AND expires>? AND ticket IS NULL').bind(ticket,code,state,now).run();
    return res.meta.changes?redirect(origin+'/#slack_finish='+ticket):fail();
  }
  if(request.method==='POST' && path==='/events'){
    const raw=await request.text();
    if(raw.length>100000||!await signedEvent(request,raw,env.SIGNING_SECRET))return json({},401);
    let payload;try{payload=JSON.parse(raw);}catch{return json({},400);}
    if(payload.type==='url_verification')return json({challenge:payload.challenge});
    if(payload.team_id!==env.SLACK_TEAM||payload.api_app_id!==env.SLACK_APP_ID)return json({});
    if(payload.event?.type==='app_uninstalled'){await db.prepare('DELETE FROM links WHERE team=?').bind(payload.team_id).run();return json({});}
    if(payload.event?.type==='tokens_revoked'){
      for(const member of (payload.event.tokens?.oauth||[]))await db.prepare('DELETE FROM links WHERE team=? AND member=?').bind(payload.team_id,member).run();
      return json({});
    }
    const event=metadata(payload,env);
    if(event){
      const {id,team,channel,sender,ts,kind,at}=event;
      await db.prepare('INSERT OR IGNORE INTO inbox(id,team,channel,sender,ts,kind,at) VALUES(?,?,?,?,?,?,?)').bind(id,team,channel,sender,ts,kind,at).run();
      ctx.waitUntil(processEvents(env,id));
    }
    return json({});
  }
  if(!['/feed','/start','/finish','/read','/disconnect'].includes(path))return json({},404);
  if(request.headers.get('origin') && request.headers.get('origin')!==origin)return json({},403);
  if(request.method!==(path==='/feed'?'GET':'POST'))return json({},405);
  const uid=await identify(request,env.FIREBASE_PROJECT);
  if(!uid)return json({error:'login'},401);
  if(path==='/feed'){
    const link=await db.prepare('SELECT generation,channel_name,dm FROM links WHERE uid=?').bind(uid).first();
    if(!link)return json({linked:false,ready:Boolean(env.SLACK_CLIENT_ID&&env.CLIENT_SECRET&&env.SIGNING_SECRET&&env.TOKEN_KEY&&env.SLACK_APP_ID),rows:[]});
    const {results}=await db.prepare('SELECT id,kind,label,at,url,seen FROM notices WHERE uid=? AND generation=? ORDER BY at DESC LIMIT 80').bind(uid,link.generation).all();
    return json({linked:true,channel:link.channel_name,dm:!!link.dm,rows:results.map(({seen,...row})=>({...row,read:!!seen}))});
  }
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({},415);
  let data;try{data=await request.json();}catch{return json({},400);}
  if(path==='/start'){
    if(!env.SLACK_CLIENT_ID||!env.CLIENT_SECRET||!env.SIGNING_SECRET||!env.TOKEN_KEY||!env.SLACK_APP_ID)return json({error:'setup'},503);
    const state=random(),dm=data?.dm===true;
    await db.batch([db.prepare('DELETE FROM flows WHERE uid=? OR expires<=?').bind(uid,now),db.prepare('INSERT INTO flows(state,uid,dm,expires) VALUES(?,?,?,?)').bind(state,uid,Number(dm),now+600000)]);
    const params=new URLSearchParams({client_id:env.SLACK_CLIENT_ID,redirect_uri:callback,team:env.SLACK_TEAM,state,user_scope:'channels:read,channels:history'+(dm?',im:history,im:read,users:read':'')});
    return json({url:'https://slack.com/oauth/v2/authorize?'+params});
  }
  if(path==='/finish'){
    if(!/^[0-9a-f]{64}$/.test(data?.ticket))return json({error:'expired'},400);
    const flow=await db.prepare('DELETE FROM flows WHERE ticket=? AND uid=? AND expires>? RETURNING dm,code').bind(data.ticket,uid,now).first();
    if(!flow)return json({error:'expired'},400);
    let grant;try{grant=await call('oauth.v2.access',{client_id:env.SLACK_CLIENT_ID,client_secret:env.CLIENT_SECRET,code:flow.code,redirect_uri:callback});}catch{return json({error:'approval'},400);}
    const member=grant.authed_user?.id, token=grant.authed_user?.access_token;
    if(grant.team?.id!==env.SLACK_TEAM||!token||!/^U[A-Z0-9]+$|^W[A-Z0-9]+$/.test(member))return json({error:'workspace'},403);
    const granted=new Set((grant.authed_user.scope||'').split(','));
    if(!['channels:history','channels:read',...(flow.dm?['im:history','im:read','users:read']:[])].every(s=>granted.has(s)))return json({error:'approval'},400);
    const info=await joinedPublicChannel(env.SLACK_CHANNEL,token,call);
    if(!info)return json({error:'membership'},403);
    const occupied=await db.prepare('SELECT uid FROM links WHERE team=? AND member=?').bind(env.SLACK_TEAM,member).first();
    if(occupied && occupied.uid!==uid)return json({error:'in_use'},409);
    const old=await db.prepare('SELECT member,generation,linked_at FROM links WHERE uid=?').bind(uid).first();
    const same=old?.member===member,generation=same?old.generation:random();
    const secret=await seal(token,env.TOKEN_KEY,uid+'|'+member);
    await db.batch([db.prepare('INSERT INTO links(uid,team,member,channel,channel_name,dm,secret,generation,linked_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET team=excluded.team,member=excluded.member,channel=excluded.channel,channel_name=excluded.channel_name,dm=excluded.dm,secret=excluded.secret,generation=excluded.generation,linked_at=excluded.linked_at')
      .bind(uid,env.SLACK_TEAM,member,env.SLACK_CHANNEL,info.name,flow.dm,secret,generation,same?old.linked_at:now),
      db.prepare('DELETE FROM notices WHERE uid=? AND generation<>?').bind(uid,generation)]);
    return json({ok:true});
  }
  if(path==='/read'){
    if(!/^Ev[A-Za-z0-9]+$/.test(data?.id))return json({},400);
    await db.prepare('UPDATE notices SET seen=1 WHERE uid=? AND id=? AND generation=(SELECT generation FROM links WHERE uid=?)').bind(uid,data.id,uid).run();
    return json({ok:true});
  }
  await db.batch([db.prepare('DELETE FROM flows WHERE uid=?').bind(uid),db.prepare('DELETE FROM links WHERE uid=?').bind(uid)]);
  return json({ok:true});
};
const handle=routes();
export default {
  async fetch(request,env,ctx){try{return await handle(request,env,ctx);}catch{return json({error:'retry'},503);}},
  async scheduled(_,env){const now=Date.now();await env.DB.batch([
    env.DB.prepare('DELETE FROM flows WHERE expires<=?').bind(now),
    env.DB.prepare('DELETE FROM inbox WHERE at<?').bind(now-86400000),
    env.DB.prepare('DELETE FROM notices WHERE at<?').bind(now-30*86400000)]);
    await processEvents(env);}
};
