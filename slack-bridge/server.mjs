import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {browserListener,browserPort} from './browser-access.mjs';
import {prepare,listen,dmManifest} from './slack.mjs';

const host='127.0.0.1',port=19387,origin='http://'+host+':'+port;
const admin=randomBytes(32).toString('hex'),pair=randomBytes(12).toString('hex');
const manifest=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8'));
const setup=await readFile(new URL('setup.html',import.meta.url),'utf8'),pairPage=await readFile(new URL('pair.html',import.meta.url),'utf8');
const history=new Map();let stop=null,connected=false,status='',busy=false;
const same=(a,b)=>typeof a==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const auth=(req,value)=>same(req.headers.authorization,'Bearer '+value);
const feed=()=>({rows:[...history.values()],connected,status});
function record(row){
  history.set(row.id,row);
  if(history.size>80)history.delete(history.keys().next().value);
}
async function body(req){
  let data='';for await(const chunk of req){data+=chunk;if(data.length>14000)throw Error('입력 내용이 너무 길어요.');}
  return JSON.parse(data||'{}');
}
async function route(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  function send(code,data,html=false){
    res.writeHead(code,{'Content-Type':html?'text/html; charset=utf-8':'application/json; charset=utf-8'});
    res.end(html?data:JSON.stringify(data));
  }
  if(req.headers.host!==host+':'+port || (req.headers.origin && req.headers.origin!==origin))return send(403,{});
  const path=new URL(req.url,origin).pathname;
  if(req.method==='GET'){
    if(path==='/setup')return send(200,setup,true);
    if(path==='/pair')return send(200,pairPage,true); // Older cached clients.
    if(path==='/manifest')return send(200,manifest);
    if(path==='/manifest-dm')return send(200,dmManifest(manifest));
    if(path==='/events' && auth(req,pair))return send(200,feed());
    if(path==='/settings' && auth(req,admin))return send(200,{code:pair,connected,status,team:process.env.PIXEL_SLACK_TEAM||'',channel:process.env.PIXEL_SLACK_CHANNEL||''});
  }
  if(req.method==='POST' && path==='/setup' && auth(req,admin)){
    if(busy)return send(409,{error:'연결을 확인하는 중이에요.'});busy=true;
    try{
      const input=await body(req);
      const next=await prepare(input);
      stop?.();history.clear();connected=false;status='';
      stop=listen(next.config,next.ticket,record,(ok,problem='')=>{connected=ok;status=problem;});
      return send(200,{ok:true});
    }catch(e){return send(400,{error:e.message});}finally{busy=false;}
  }
  return send(403,{error:'수신기에서 표시한 연결 코드를 확인해 주세요.'});
}
const server=http.createServer((req,res)=>route(req,res).catch(()=>{res.writeHead(400);res.end();}));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'이미 실행 중인 픽셀 연구실 수신기가 있어요.':e.message);process.exitCode=1;});
server.listen(port,host,()=>{
  const browser=browserListener(key=>same(key,pair)?feed():null);
  let retries=0;
  browser.on('error',error=>{
    if(error.code==='EADDRINUSE' && server.listening && retries++<3)setTimeout(()=>browser.listen(browserPort,host),1000);
    else console.error('브라우저 알림 연결을 열지 못했어요 · '+error.code);
  });
  browser.listen(browserPort,host);
  server.once('close',()=>browser.close());
  console.log('이 컴퓨터의 설정 페이지를 브라우저에서 여세요. 이 주소는 공유하지 마세요.');
  console.log(origin+'/setup#'+admin);
});
