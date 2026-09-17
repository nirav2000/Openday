const $ = s => document.querySelector(s);
let schools = [], enhancements = {meta:{},schools:{}}, filter='all', deferredPrompt;
let currentView='list';
let calendarCursor=new Date(); calendarCursor.setDate(1);
const savedRaw=JSON.parse(localStorage.getItem('openDayState')||'{}');
const state={saved:[],booked:{},notes:{},watchBooking:[],...savedRaw};
const saveState=()=>localStorage.setItem('openDayState',JSON.stringify(state));
const origin=()=>enhancements.meta?.travelOrigin||'Harrow';
const fmtDate=s=>s?new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(s)):'Date to be announced';
const fmtShortDate=s=>s?new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(s)):'Date TBC';
const fmtTime=(s,e)=>{if(!s)return'Time TBC';const f=x=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(x));return e?`${f(s)}–${f(e)}`:`${f(s)} · finish TBC`};
const schoolExtra=s=>enhancements.schools?.[s.id]||{};
const mapsUrl=(s,mode='driving')=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin())}&destination=${encodeURIComponent(schoolExtra(s).destination||`${s.name}, ${s.area}, UK`)}&travelmode=${mode}`;
const travelSummary=s=>schoolExtra(s).travel?.driveText||`Approx. ${s.journey} min drive from ${origin()} · check live traffic`;

function filteredSchools(){
  const q=$('#search').value.trim().toLowerCase(),now=new Date();
  let out=schools.filter(s=>{
    const extra=schoolExtra(s);
    const text=`${s.name} ${s.area} ${s.event} ${s.type} ${s.admission?.summary||''} ${s.admission?.route||''} ${extra.travel?.transitText||''}`.toLowerCase();
    if(q&&!text.includes(q))return false;
    if(filter==='saved')return state.saved.includes(s.id);
    if(filter==='upcoming')return s.start&&new Date(s.start)>=now;
    if(filter==='tbc')return !s.start||String(s.status).includes('tbc');
    if(['state','grammar','independent'].includes(filter))return filter==='state'?['state','part-selective'].includes(s.type):s.type===filter;
    return true;
  });
  const sort=$('#sort').value;
  out.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='priority'?b.priority-a.priority:sort==='distance'?a.journey-b.journey:(a.start?new Date(a.start):new Date('2099'))-(b.start?new Date(b.start):new Date('2099')));
  return out;
}

function render(){
  const out=filteredSchools();
  $('#resultCount').textContent=`${out.length} visit${out.length===1?'':'s'}`;
  if(currentView==='list')renderList(out); else renderCalendar(out);
  updateCounts();
}

function renderList(out){
  $('#list').hidden=false; $('#calendarView').hidden=true;
  $('#list').innerHTML='';out.forEach(s=>$('#list').append(card(s)));
  if(!out.length)$('#list').innerHTML='<p class="empty">No visits match these filters.</p>';
}

function card(s){
  const n=$('#cardTemplate').content.cloneNode(true),d=s.start&&new Date(s.start),extra=schoolExtra(s);
  n.querySelector('.datebox b').textContent=d?d.getDate():'—';
  n.querySelector('.datebox .dow').textContent=d?new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(d):'';
  n.querySelector('.datebox .mon').textContent=d?new Intl.DateTimeFormat('en-GB',{month:'short'}).format(d):'TBC';
  n.querySelector('h2').textContent=s.name;
  n.querySelector('.meta').textContent=`${s.area} · ${travelSummary(s)} · ${s.entry}`;
  n.querySelector('.event').textContent=`${fmtShortDate(s.start)} · ${s.event} · ${fmtTime(s.start,s.end)}`;
  if(s.admission){const deadline=document.createElement('p');deadline.className='deadline';deadline.textContent=`Apply: ${s.admission.summary}`;n.querySelector('.event').after(deadline)}
  if(s.academic){const score=document.createElement('p');score.className='score-summary';score.textContent=s.academic.summary;n.querySelector('.event').after(score)}
  const badges=n.querySelector('.badges');badges.innerHTML=`<span class="badge">${s.type.replace('-',' ')}</span><span class="badge ${s.status}">${s.status==='confirmed'?'verified':s.status==='past'?'past':'check details'}</span>${state.watchBooking.includes(s.id)?'<span class="badge watch">watching booking</span>':''}`;
  const save=n.querySelector('.save');save.textContent=state.saved.includes(s.id)?'♥':'♡';save.classList.toggle('on',state.saved.includes(s.id));save.onclick=()=>toggleSave(s.id);
  n.querySelector('.details').onclick=()=>showDetail(s);
  const book=n.querySelector('.book');if(s.bookingUrl){book.href=s.bookingUrl;book.textContent=s.bookingRequired===false?'Info ↗':'Book ↗'}else book.remove();
  if(extra.bookingWatch?.status==='user-reported-unavailable'&&book){book.textContent='Check spaces ↗'}
  return n;
}

function toggleSave(id){state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];saveState();render()}
function toggleWatch(id){
  state.watchBooking=state.watchBooking.includes(id)?state.watchBooking.filter(x=>x!==id):[...state.watchBooking,id];
  saveState();
  if(state.watchBooking.includes(id)&&'Notification'in window&&Notification.permission==='default')Notification.requestPermission();
  showDetail(schools.find(s=>s.id===id)); render();
}
function updateCounts(){const now=new Date();$('#upcomingCount').textContent=schools.filter(s=>s.start&&new Date(s.start)>=now).length;$('#savedCount').textContent=state.saved.length;$('#bookedCount').textContent=Object.values(state.booked).filter(Boolean).length}

function alternateRows(s){
  const extra=schoolExtra(s);
  const same=schools.filter(x=>x.name===s.name&&x.id!==s.id).map(x=>({event:x.event,start:x.start,end:x.end,status:x.status,note:x.note,bookingUrl:x.bookingUrl,source:'tracker'}));
  return [...same,...(extra.alternateVisits||[])].sort((a,b)=>{
    if(a.start&&b.start)return new Date(a.start)-new Date(b.start); if(a.start)return-1;if(b.start)return 1;return 0;
  });
}
function alternatesHtml(s){
  const rows=alternateRows(s);
  if(!rows.length)return '<p class="sources">No other published visit date is currently stored. Use the school’s open-events page to check for newly released dates.</p>';
  return `<div class="alternate-list">${rows.map(v=>`<div class="alternate"><div><b>${v.start?fmtDate(v.start):v.event}</b><span>${v.start?`${v.event} · ${fmtTime(v.start,v.end)}`:(v.note||'Flexible visit option')}</span></div>${v.bookingUrl?`<a href="${v.bookingUrl}" target="_blank" rel="noopener">${v.start?'Book':'Arrange'} ↗</a>`:''}</div>`).join('')}</div>`;
}
function travelHtml(s){
  const t=schoolExtra(s).travel||{};
  return `<section class="travel-panel"><small>FROM ${origin()}</small><h3>Getting there</h3><div class="travel-row"><div><b>🚗 Car</b><span>${t.driveText||`Approx. ${s.journey} min; traffic dependent`}</span></div><a href="${mapsUrl(s,'driving')}" target="_blank" rel="noopener">Live drive ↗</a></div><div class="travel-row"><div><b>🚆 Public transport</b><span>${t.transitText||'Open a live public-transport route for current options and timings.'}</span></div><a href="${mapsUrl(s,'transit')}" target="_blank" rel="noopener">Live transit ↗</a></div>${t.railUrl?`<div class="travel-links"><a href="${t.railUrl}" target="_blank" rel="noopener">Rail journey planner ↗</a>${t.sourceUrl?`<a href="${t.sourceUrl}" target="_blank" rel="noopener">Timetable source ↗</a>`:''}</div>`:''}${t.extra?`<p class="travel-extra">${t.extra}</p>`:''}</section>`;
}
function bookingWatchHtml(s){
  const w=schoolExtra(s).bookingWatch;if(!w)return'';
  const watching=state.watchBooking.includes(s.id);
  return `<section class="watch-panel"><small>BOOKING WATCH</small><h3>${w.label||'Watch booking'}</h3><p>${w.message||''}</p><div class="modal-actions"><button id="watchBooking" class="${watching?'watching':''}">${watching?'Watching ✓':'Watch booking'}</button>${w.url?`<a href="${w.url}" target="_blank" rel="noopener">Check booking page ↗</a>`:''}</div><p class="sources">The app can remember this watch and alert when refreshed data says booking is open. Background monitoring requires an external scheduled checker.</p></section>`;
}

function showDetail(s){
  if(!s)return;
  const booked=!!state.booked[s.id];
  $('#detailBody').innerHTML=`<div class="detail-inner"><div class="badges"><span class="badge">${s.type.replace('-',' ')}</span><span class="badge ${s.status}">${s.status}</span></div><h2>${s.name}</h2><p class="meta">${s.area} · ${s.entry} entry</p><p class="bigdate">${fmtDate(s.start)}</p><p>${s.event} · ${fmtTime(s.start,s.end)}</p>${travelHtml(s)}<section class="other-dates"><small>OTHER VISITS</small><h3>Other dates & visit options</h3>${alternatesHtml(s)}</section>${bookingWatchHtml(s)}${s.admission?`<section class="admission"><small>ENTRY ROUTE</small><h3>${s.admission.route}</h3><p><b>${s.admission.summary}</b></p><p>${s.admission.note}</p><div class="admission-links"><a href="${s.admission.url}" target="_blank" rel="noopener">Official admission page ↗</a>${s.admission.secondary?`<a href="${s.admission.secondary.url}" target="_blank" rel="noopener">${s.admission.secondary.label} ↗</a>`:''}</div></section>`:''}<div class="detail-grid"><div><small>Booking</small><b>${s.bookingRequired===true?'Required':s.bookingRequired===false?'Not required':'Check school'}</b></div><div><small>Priority</small><b>${'★'.repeat(s.priority)}${'☆'.repeat(5-s.priority)}</b></div></div><p>${s.note}</p><label class="check"><input id="booked" type="checkbox" ${booked?'checked':''}> I have booked this visit</label><h3>Visit notes</h3><textarea id="note" class="note" placeholder="Questions to ask, impressions, travel notes…">${state.notes[s.id]||''}</textarea><div class="modal-actions"><a class="primary" href="${s.infoUrl}" target="_blank" rel="noopener">School information ↗</a>${s.bookingUrl?`<a href="${s.bookingUrl}" target="_blank" rel="noopener">Booking page ↗</a>`:''}${s.start?'<button id="calendar">Add this visit</button>':''}<button id="saveNote">Save notes</button></div><p class="sources">Dates and booking availability can change. Check the school page before travelling.</p></div>`;
  $('#booked').onchange=e=>{state.booked[s.id]=e.target.checked;saveState();updateCounts()};
  $('#saveNote').onclick=()=>{state.notes[s.id]=$('#note').value;saveState();$('#saveNote').textContent='Saved ✓'};
  if(s.start)$('#calendar').onclick=()=>downloadICS(s);
  if($('#watchBooking'))$('#watchBooking').onclick=()=>toggleWatch(s.id);
  appendAdmissionEvidence(s);$('#detail').showModal();
}

function downloadICS(s){
  const dt=x=>new Date(x).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const end=s.end||new Date(new Date(s.start).getTime()+2*3600000).toISOString();
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//School Open Days//EN','BEGIN:VEVENT',`UID:${s.id}@openday`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(s.start)}`,`DTEND:${dt(end)}`,`SUMMARY:${s.name} — ${s.event}`,`LOCATION:${schoolExtra(s).destination||s.area}`,`DESCRIPTION:${String(s.note||'').replace(/,/g,'\\,')} ${s.infoUrl}`,'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:School open day tomorrow','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download=`${s.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-open-day.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function renderCalendar(out){
  $('#list').hidden=true;$('#calendarView').hidden=false;
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
  $('#calendarTitle').textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(calendarCursor);
  const first=new Date(y,m,1),last=new Date(y,m+1,0),offset=(first.getDay()+6)%7;
  const cells=[];for(let i=0;i<offset;i++)cells.push('<div class="calendar-cell outside"></div>');
  for(let day=1;day<=last.getDate();day++){
    const key=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const events=out.filter(s=>s.start&&s.start.slice(0,10)===key);
    cells.push(`<div class="calendar-cell ${events.length?'has-events':''}"><span class="daynum">${day}</span>${events.slice(0,2).map(s=>`<button class="calendar-event" data-event-id="${s.id}"><b>${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(s.start))}</b> ${s.name}</button>`).join('')}${events.length>2?`<span class="more">+${events.length-2} more</span>`:''}</div>`)
  }
  $('#calendarGrid').innerHTML=cells.join('');
  $('#calendarGrid').querySelectorAll('[data-event-id]').forEach(b=>b.onclick=()=>showDetail(schools.find(s=>s.id===b.dataset.eventId)));
}

function setView(view){currentView=view;$('#listViewBtn').classList.toggle('active',view==='list');$('#calendarViewBtn').classList.toggle('active',view==='calendar');render()}
function openSubscribe(){const https=`${location.origin}${location.pathname.replace(/[^/]*$/,'')}calendar.ics`;$('#icsLink').href=https;$('#webcalLink').href=https.replace(/^https?:/,'webcal:');$('#subscribeDialog').showModal()}
function checkBookingNotifications(){if(!('Notification'in window)||Notification.permission!=='granted')return;for(const id of state.watchBooking){const w=enhancements.schools?.[id]?.bookingWatch;if(w?.status==='open')new Notification('School booking is open',{body:`${schools.find(s=>s.id===id)?.name||'School'} booking now appears open.`,tag:`booking-${id}`})}}

$('#chips').onclick=e=>{if(!e.target.dataset.filter)return;filter=e.target.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===e.target));render()};
$('#search').oninput=render;$('#sort').onchange=render;
$('#listViewBtn').onclick=()=>setView('list');$('#calendarViewBtn').onclick=()=>setView('calendar');$('#subscribeBtn').onclick=openSubscribe;
$('#prevMonth').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);render()};
$('#nextMonth').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);render()};
$('#detail').onclick=e=>{if(e.target.hasAttribute('data-close')||e.target===$('#detail'))$('#detail').close()};
$('#subscribeDialog').onclick=e=>{if(e.target.hasAttribute('data-close-subscribe')||e.target===$('#subscribeDialog'))$('#subscribeDialog').close()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=()=>deferredPrompt?.prompt();

Promise.all([
  fetch('data/schools.json').then(r=>{if(!r.ok)throw Error('Could not load school data');return r.json()}),
  fetch('data/enhancements.json').then(r=>r.ok?r.json():({meta:{},schools:{}}))
]).then(([d,e])=>{
  schools=d.schools;enhancements=e;const upcoming=schools.filter(s=>s.start&&new Date(s.start)>=new Date()).sort((a,b)=>new Date(a.start)-new Date(b.start));if(upcoming[0])calendarCursor=new Date(new Date(upcoming[0].start).getFullYear(),new Date(upcoming[0].start).getMonth(),1);
  render();checkBookingNotifications();
  if(new Date()-new Date(d.meta.updated)>30*864e5){$('#notice').hidden=false;$('#notice').textContent='School details were last reviewed over 30 days ago. Re-check dates before making plans.'}
}).catch(e=>{$('#list').innerHTML=`<p class="empty">${e.message}. Please refresh.</p>`});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');

function appendAdmissionEvidence(s){
  const body=$('#detailBody .detail-inner');
  if(s.academic){const a=s.academic,box=document.createElement('section');box.className='admission score-panel';const title=document.createElement('h3');title.textContent='Academic entry / CAT guidance';box.append(title);for(const text of [a.summary,`${a.kind} · ${a.cycle}`,a.detail,'CAT4 scores are not interchangeable with entrance-test scores. A qualifying score or historical cutoff is not a guaranteed place.']){const p=document.createElement('p');p.textContent=text;box.append(p)}const link=document.createElement('a');link.href=a.sourceUrl;link.target='_blank';link.rel='noopener';link.textContent='Official score / admissions source ↗';box.append(link);const anchor=body.querySelector('.admission');if(anchor)anchor.after(box);else body.append(box)}
  if(s.linkChecks){const p=document.createElement('p');p.className='sources';const labels={infoUrl:'School information',bookingUrl:'Open events / booking',admission:'Admissions'};p.textContent='Links checked 16 September 2026. '+Object.entries(s.linkChecks).map(([key,result])=>`${labels[key]}: ${result.status==='retrieved'?'page retrieved':result.status==='search-confirmed'?'found in search; live page not verified':'not verified (access blocked or fetch failed)'}`).join('; ')+'. Retrieving a page does not confirm booking availability.';body.append(p)}
}
