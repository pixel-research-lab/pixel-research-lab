function createSlackReceiver({owner,onRows,onChange}){
  const endpoint='http://127.0.0.1:19389/events';
  const prefix='pixel-slack-device:'+new URL('.',location.href).pathname+':';
  const valid=code=>typeof code==='string' && /^[a-f0-9]{24}$/.test(code);
  let slot=null,seen=null,status='';
  function stored(who){try{return localStorage.getItem(prefix+who);}catch{return null;}}
  function save(who,code){try{if(code)localStorage.setItem(prefix+who,code);else localStorage.removeItem(prefix+who);}catch{}}
  function stop(){const old=slot;slot=null;if(old){clearTimeout(old.timer);old.request?.abort();}}
  function current(s){return slot===s && owner()===s.who;}
  function setStatus(text){if(text!==status){status=text;onChange();}}
  async function poll(s){
    if(!current(s)||s.request)return false;
    clearTimeout(s.timer);
    const request=s.request=new AbortController();
    const timeout=setTimeout(()=>request.abort(),25000);
    try{
      const res=await fetch(endpoint,{headers:{Authorization:'Bearer '+s.code},credentials:'omit',cache:'no-store',
        redirect:'error',referrerPolicy:'no-referrer',targetAddressSpace:'loopback',signal:request.signal});
      if(!current(s))return false;
      if(res.status===401){
        save(s.who,null);stop();setStatus('연결 코드가 유효하지 않아요. 수신기 설정의 현재 코드를 입력하세요.');return false;
      }
      if(!res.ok)throw Error();
      const data=await res.json();if(!current(s))return false;
      if(!Array.isArray(data.rows)||typeof data.connected!=='boolean')throw Error();
      if(!s.verified){s.verified=true;save(s.who,s.code);}
      s.failures=0;setStatus(data.connected?'Slack 알림 수신 중':'수신기는 연결됨 · Slack 연결 대기');
      await onRows(data.rows,s.who,()=>current(s));return current(s);
    }catch{
      if(!current(s))return false;
      s.failures++;
      if(!s.verified)stop();
      setStatus(s.verified?'수신기에 다시 연결하는 중이에요.':'수신기에 닿지 않아요. 이 컴퓨터에서 수신기가 실행 중이고 브라우저가 로컬 연결을 허용하는지 확인하세요.');
      return false;
    }finally{
      clearTimeout(timeout);s.request=null;
      if(current(s))s.timer=setTimeout(()=>poll(s),Math.min(30000,4000*Math.pow(2,Math.min(3,s.failures))));
    }
  }
  function start(code,verified){stop();const s=slot={who:owner(),code,verified,failures:0};seen=s.who;setStatus('수신기에 연결하는 중이에요.');return poll(s);}
  function restore(){const who=owner();if(who===seen)return;stop();seen=who;status='';const code=stored(who);if(valid(code))start(code,true);}
  function disconnect(){save(owner(),null);stop();seen=owner();status='';onChange();}
  function reset(){stop();seen=null;status='';}
  function wake(){if(slot)poll(slot);}
  window.addEventListener('online',wake);window.addEventListener('pageshow',wake);window.addEventListener('focus',wake);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
  window.addEventListener('storage',e=>{if(e.key===prefix+owner()||e.key===null){reset();restore();onChange();}});
  return {restore,reset,disconnect,pair:code=>valid(code)?start(code,false):Promise.resolve(false),
    get paired(){return !!slot?.verified;},get status(){return status;}};
}
