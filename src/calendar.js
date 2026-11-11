// Dates without a time are calendar dates; Google represents all-day ends as exclusive.
const labCalendar = (() => {
  const colors = ['#f1ce76','#a7cdb9','#e7a798','#aebfe1','#d0b2d6','#dfbc91'];
  const keyPattern = /^(?:l-[0-9a-f-]{36}|g-[0-9a-f]{64})$/;
  function day(date = new Date()) { return reviewSchedule.today(date); }
  function monthBounds(month) {
    const [year, number] = month.split('-').map(Number);
    return [new Date(year, number-1, 1), new Date(year, number, 1)];
  }
  function days(event) {
    return event.allDay ? [event.start, reviewSchedule.addDays(event.end,-1)] :
      [day(new Date(event.start)), day(new Date(Date.parse(event.end)-1))];
  }
  function overlaps(event, from, through) {
    const [first,last] = days(event);
    return !event.removed && first <= through && last >= from;
  }
  function validEvent(event) {
    if (!event || !keyPattern.test(event.key) || typeof event.title !== 'string' ||
        event.title.length > 4096 || typeof event.allDay !== 'boolean' ||
        typeof event.calendar !== 'string' || event.calendar.length > 2048 ||
        typeof event.id !== 'string' || event.id.length > 2048 ||
        typeof event.start !== 'string' || typeof event.end !== 'string') return false;
    if (event.key.startsWith('g-') !== !!event.calendar || !event.id) return false;
    if (event.calendar && ((event.etag !== undefined && typeof event.etag !== 'string') ||
        (event.updated !== undefined && !Number.isFinite(event.updated)))) return false;
    if (event.allDay) return /^\d{4}-\d{2}-\d{2}$/.test(event.start) && /^\d{4}-\d{2}-\d{2}$/.test(event.end) &&
      validDate(event.start) && validDate(event.end) && event.start < event.end;
    return Number.isFinite(Date.parse(event.start)) && Date.parse(event.start) < Date.parse(event.end);
  }
  function validDate(value) {
    const date = new Date(value+'T00:00:00Z');
    return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
  }
  function validState(state) {
    if (state.calendarChoice != null) {
      const c=state.calendarChoice;
      if(typeof c.id!=='string'||c.id.length>2048||typeof c.name!=='string'||c.name.length>4096||
          typeof c.writable!=='boolean')return false;
    }
    const events=state.agendaEvents || [];
    if (!Array.isArray(events) || !events.every(validEvent) || new Set(events.map(e=>e.key)).size !== events.length) return false;
    return ['agendaDone','agendaStars'].every(name => state[name] === undefined ||
      (state[name] && typeof state[name]==='object' && !Array.isArray(state[name]) &&
       Object.entries(state[name]).every(([key,value])=>keyPattern.test(key) && typeof value === 'boolean')));
  }
  async function googleKey(calendar,id) {
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(calendar+'\0'+id));
    return 'g-'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function fromGoogle(calendar,raw) {
    const allDay=!!raw.start?.date;
    if(raw.status==='cancelled' || !raw.start || !raw.end)return null;
    const event={key:await googleKey(calendar,raw.id),calendar,id:raw.id,
      title:(raw.summary||'(제목 없음)').slice(0,4096),allDay,
      start:allDay?raw.start.date:new Date(raw.start.dateTime).toISOString(),
      end:allDay?raw.end.date:new Date(raw.end.dateTime).toISOString(),
      etag:raw.etag||'',updated:Date.parse(raw.updated)||0};
    return validEvent(event)?event:null;
  }
  function body(event) {
    const type=event.allDay?'date':'dateTime';
    return {summary:event.title,start:{[type]:event.start},end:{[type]:event.end}};
  }
  function sameContent(a,b) {
    return !!a && a.title===b.title && a.allDay===b.allDay && a.start===b.start && a.end===b.end;
  }
  async function request(token,path,query={},method='GET',data,etag) {
    const url=new URL('https://www.googleapis.com/calendar/v3/'+path);
    for(const [k,v] of Object.entries(query)) if(v!=null)url.searchParams.set(k,v);
    const headers={Authorization:'Bearer '+token};
    if(data)headers['Content-Type']='application/json';
    if(etag)headers['If-Match']=etag;
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),25000);
    try{
      const res=await fetch(url,{method,headers,body:data?JSON.stringify(data):undefined,cache:'no-store',signal:controller.signal});
      if(!res.ok){const error=new Error('Google Calendar '+res.status);error.status=res.status;throw error;}
      return await res.json();
    }finally{clearTimeout(timer);}
  }
  async function pages(token,path,query) {
    let pageToken;
    const items=[];
    do{
      const result=await request(token,path,{...query,pageToken});
      items.push(...(result.items||[])); pageToken=result.nextPageToken;
    }while(pageToken);
    return items;
  }
  const eventPath=(calendar,id)=>'calendars/'+encodeURIComponent(calendar)+'/events'+(id?'/'+encodeURIComponent(id):'');
  async function calendars(token) {
    const items=await pages(token,'users/me/calendarList',{minAccessRole:'reader',maxResults:250});
    return items.map(c=>({id:c.id,name:c.summaryOverride||c.summary||c.id,writable:['owner','writer'].includes(c.accessRole)}));
  }
  async function monthEvents(token,calendar,month) {
    const [start,end]=monthBounds(month);
    const items=await pages(token,eventPath(calendar),{timeMin:start.toISOString(),timeMax:end.toISOString(),
      singleEvents:true,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,maxResults:2500});
    return (await Promise.all(items.map(e=>fromGoogle(calendar,e)))).filter(Boolean);
  }
  async function getEvent(token,event) {
    try{return await fromGoogle(event.calendar,await request(token,eventPath(event.calendar,event.id)));}
    catch(err){if(err.status===404||err.status===410)return null;throw err;}
  }
  async function upload(token,event) {
    try {
      const data=body(event);
      const method=event.etag?'PATCH':'POST';
      if(method==='POST')data.id=event.id;
      const raw=await request(token,eventPath(event.calendar,event.etag?event.id:null),{},method,data,event.etag);
      return {event:await fromGoogle(event.calendar,raw)};
    }catch(err){
      if(![404,409,410,412].includes(err.status))throw err;
      const remote=await getEvent(token,event);
      if(sameContent(remote,event))return {event:remote};
      return {conflict:true,event:remote};
    }
  }
  return {colors,day,days,overlaps,validState,validEvent,monthBounds,googleKey,fromGoogle,calendars,monthEvents,getEvent,upload};
})();
