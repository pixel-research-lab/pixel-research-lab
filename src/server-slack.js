function createServerSlack({onChange,onNotice}){
  const meta=document.querySelector('meta[name="pixel-slack-api"]');
  if(!meta || (meta.dataset.origin && meta.dataset.origin !== location.origin))return null;
  const endpoint=new URL(meta.content,location.href);
  let current=null,known=false,linked=false,ready=true,status='',items={},timer,sequence=0,pending=false,revision=0;
  const params=new URLSearchParams(location.hash.slice(1));
  let ticket=params.get('slack_finish');
  if(ticket||params.has('slack_error'))history.replaceState(null,'',location.pathname+location.search);
  if(params.has('slack_error'))onNotice('Slack 승인을 완료하지 않았어요.');
  const errors={expired:'승인 시간이 지났거나 시작한 연구실 계정과 달라요. 다시 연결하세요.',workspace:'테스트 워크스페이스를 선택하세요.',membership:'테스트 공개 채널에 참여한 뒤 다시 연결하세요.',approval:'Slack 권한을 승인한 뒤 다시 연결하세요.',setup:'운영자가 체험실 Slack 앱을 설정하고 있어요.',in_use:'이 Slack 계정은 다른 연구실 계정에 연결돼 있어요.'};
  async function request(path,data,uid){
    const token=await pixelAccount.slackToken();
    if(!uid||uid!==pixelAccount.uid)throw Error('연구실 계정으로 로그인하세요.');
    const response=await fetch(new URL(path,endpoint),{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw Error(errors[result.error]||'서버 연결을 확인한 뒤 다시 시도하세요.');
    return result;
  }
  function reset(){clearTimeout(timer);sequence++;revision++;current=null;pending=false;known=linked=false;ready=true;items={};status='';}
  async function sync(){
    const uid=current,id=sequence,version=revision;
    if(!uid||pending||uid!==pixelAccount.uid)return;
    clearTimeout(timer);pending=true;
    try {
      if(ticket){const value=ticket;ticket=null;
        try {await request('finish',{ticket:value},uid);}catch(e){if(id===sequence)onNotice(e.message);}
      }
      const result=await request('feed',null,uid);
      if(id!==sequence||version!==revision||uid!==pixelAccount.uid)return;
      const next={};for(const row of result.rows||[]){if(libraryData.notice(row))next['cloud_'+row.id]=row;}
      items=next;known=true;linked=result.linked;ready=result.ready!==false;
      status=linked?'Slack 알림 수신 중':ready?'Slack 계정을 연결하세요.':errors.setup;
    }catch{if(id===sequence)status='온라인이 되면 Slack 알림을 다시 확인할게요.';}
    finally{if(id===sequence){pending=false;onChange();if(!document.hidden)timer=setTimeout(sync,linked?15000:60000);}}
  }
  function restore(){
    const uid=pixelAccount.uid||null;if(current===uid)return;
    reset();current=uid;if(uid)sync();
  }
  async function start(dm){
    const uid=current,{url}=await request('start',{dm},uid);
    if(uid!==current||uid!==pixelAccount.uid)return;
    const dest=new URL(url);if(dest.origin!=='https://slack.com'||dest.pathname!=='/oauth/v2/authorize')throw Error('승인 주소를 확인할 수 없어요.');
    location.assign(dest.href);
  }
  async function read(id){
    const uid=current;await request('read',{id:id.slice('cloud_'.length)},uid);
    if(uid===current&&items[id]){revision++;items[id]={...items[id],read:true};onChange();}
  }
  async function disconnect(){
    const uid=current;await request('disconnect',{},uid);
    if(uid===current){reset();restore();onChange();}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else sync();});
  window.addEventListener('online',sync);window.addEventListener('focus',sync);
  return {restore,reset,start,read,disconnect,sync,get rows(){return items;},get linked(){return linked;},get ready(){return ready;},
    get status(){return current?(status||'Slack 연결 확인 중…'):'로그인하면 계정에 Slack을 연결할 수 있어요.';},get known(){return known;}};
}
