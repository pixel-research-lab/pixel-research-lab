import http from 'node:http';

export const browserPort=19389;
export function isLabOrigin(origin){
  return origin==='https://pixel-research-lab.github.io' ||
    /^https:\/\/pixel-research-lab-2e2guk(?:--[a-z0-9-]+)?\.web\.app$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
}

// The browser can read notices. Slack tokens and setup stay on the separate local settings port.
export function browserListener(read){
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vary','Origin, Access-Control-Request-Headers, Access-Control-Request-Private-Network');
    res.setHeader('X-Content-Type-Options','nosniff');
    const end=(status,data)=>{
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
      res.end(data===undefined?undefined:JSON.stringify(data));
    };
    if(req.headers.host!=='127.0.0.1:'+req.socket.localPort || req.url!=='/events' || !isLabOrigin(origin))return end(403);
    res.setHeader('Access-Control-Allow-Origin',origin);
    if(req.method==='OPTIONS'){
      const headers=(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
      if(req.headers['access-control-request-method']!=='GET'||headers.some(h=>h!=='authorization'))return end(403);
      res.setHeader('Access-Control-Allow-Methods','GET');
      res.setHeader('Access-Control-Allow-Headers','Authorization');
      if(req.headers['access-control-request-private-network']==='true')res.setHeader('Access-Control-Allow-Private-Network','true');
      res.setHeader('Access-Control-Max-Age','600');
      return end(204);
    }
    if(req.method!=='GET')return end(405);
    const key=req.headers.authorization?.match(/^Bearer ([a-f0-9]{24})$/)?.[1];
    if(!key)return end(401);
    try{const data=await read(key);return data?end(200,data):end(401);}
    catch{return end(503);}
  });
}
