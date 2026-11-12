const encoder = new TextEncoder();
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export const random = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
export async function seal(token, secret, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', bytes(secret), 'AES-GCM', false, ['encrypt']);
  const data = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)},key,encoder.encode(token));
  return base64(iv)+'.'+base64(data);
}
export async function unseal(value, secret, context) {
  const [iv,data] = value.split('.');
  const key = await crypto.subtle.importKey('raw', bytes(secret), 'AES-GCM', false, ['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:encoder.encode(context)},key,bytes(data)));
}
export async function signedEvent(request, raw, secret) {
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  if (!secret || !/^\d{10}$/.test(timestamp) || Math.abs(Date.now()/1000-Number(timestamp))>300 || !/^v0=[0-9a-f]{64}$/.test(signature)) return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.slice(3).match(/../g),x=>parseInt(x,16)),encoder.encode('v0:'+timestamp+':'+raw));
}
let googleKeys,expires=0;
export async function firebaseUser(request, project) {
  try {
    const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{20,8000})$/)?.[1];
    if (!token) return null;
    const parts=token.split('.');
    if(parts.length!==3)return null;
    const json=part=>JSON.parse(new TextDecoder().decode(bytes(part)));
    const header=json(parts[0]), claims=json(parts[1]), now=Math.floor(Date.now()/1000);
    if(header.alg!=='RS256' || typeof header.kid!=='string' || claims.aud!==project ||
      claims.iss!=='https://securetoken.google.com/'+project || !Number.isFinite(claims.exp) || claims.exp<=now ||
      !Number.isFinite(claims.iat) || claims.iat>now+60 || !Number.isFinite(claims.auth_time) || claims.auth_time>now+60 ||
      typeof claims.sub!=='string' || !claims.sub || claims.sub.length>128) return null;
    if(!googleKeys || Date.now()>expires){
      const r=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
      if(!r.ok)throw Error();
      googleKeys=(await r.json()).keys;
      expires=Date.now()+1000*Math.min(3600,Number(r.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300));
    }
    const jwk=googleKeys.find(k=>k.kid===header.kid);
    if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),encoder.encode(parts[0]+'.'+parts[1]))?claims.sub:null;
  }catch{return null;}
}
