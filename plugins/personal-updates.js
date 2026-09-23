(()=>{
  if(typeof state!=='object'||typeof schools==='undefined')return;
  state.eventOverrides=state.eventOverrides&&typeof state.eventOverrides==='object'?state.eventOverrides:{};

  const nativeCard=card,nativeShowDetail=showDetail,nativeDownloadICS=downloadICS;
  const datePart=v=>typeof v==='string'&&v.length>=10?v.slice(0,10):'';
  const timePart=v=>typeof v==='string'&&!dateOnly(v)?(v.match(/T(\d{2}:\d{2})/)?.[1]||''):'';
  const overrideFor=s=>state.eventOverrides?.[s.id]||{};
  const hasUpdate=s=>{const o=overrideFor(s);return !!(o.date||o.startTime||o.endTime||o.note)};
  const effectiveStart=s=>{
    const o=overrideFor(s),base=s.start||null;
    if(!o.date&&!o.startTime)return base;
    const d=o.date||datePart(base)||datePart(s.lastKnownStart);
    if(!d)return base;
    const t=o.startTime||timePart(base);
    return t?`${d}T${t}:00`:d;
  };
  const effectiveEnd=s=>{
    const o=overrideFor(s),base=s.end||null;
    if(!o.endTime&&!o.date)return base;
    const start=effectiveStart(s);if(!start)return base;
    const d=datePart(start),t=o.endTime||timePart(base);
    return t?`${d}T${t}:00`:null;
  };
  const display=s=>({...s,start:effectiveStart(s),end:effectiveEnd(s)});
  const originalSchool=s=>schools.find(x=>x.id===s.id)||s;

  const style=document.createElement('style');
  style.textContent=`
    .badge.personal{background:#e9e3ff;color:#5b43a3}
    .personal-update{margin:14px 0;padding:13px;background:#f7f4ff;border:1px solid #ddd4fa;border-radius:12px}
    .personal-update h3{margin:4px 0 5px}
    .personal-update .sources{margin:0 0 10px}
    .personal-note-label,.personal-update-grid label{display:flex;flex-direction:column;gap:5px;font-size:.76rem;font-weight:750;color:#52697d}
    .personal-update .note{min-height:64px;background:white}
    .personal-update-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:8px;margin-top:9px}
    .personal-update-grid input{min-width:0;border:1px solid #dce5ed;border-radius:9px;padding:9px;font:inherit;color:#102a43;background:white}
    .personal-update-footer{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:9px}
    .personal-update-footer button{border:1px solid #dce5ed;border-radius:9px;padding:8px 10px;background:white;color:#1769aa;font-weight:700}
    #personalUpdateStatus{font-size:.76rem;color:#61758a}
    @media(max-width:560px){.personal-update-grid{grid-template-columns:1fr 1fr}.personal-update-grid label:first-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  filteredSchools=function(){
    const q=$('#search').value.trim().toLowerCase(),now=new Date();
    let out=schools.filter(s=>{
      const extra=schoolExtra(s),o=overrideFor(s),start=effectiveStart(s);
      const text=`${s.name} ${s.area} ${s.event} ${s.type} ${s.admission?.summary||''} ${s.admission?.route||''} ${extra.travel?.transitText||''} ${o.note||''}`.toLowerCase();
      if(q&&!text.includes(q))return false;
      if(filter==='saved')return state.saved.includes(s.id);
      if(filter==='upcoming')return start&&dateObj(start)>=now;
      if(filter==='tbc')return !s.start||['tbc','research','reported'].includes(String(s.status));
      if(['state','grammar','independent'].includes(filter))return filter==='state'?['state','part-selective'].includes(s.type):s.type===filter;
      return true;
    });
    const sort=$('#sort').value;
    out.sort((a,b)=>{
      if(sort==='name')return a.name.localeCompare(b.name);
      if(sort==='priority')return b.priority-a.priority;
      if(sort==='distance')return (Number.isFinite(a.journey)?a.journey:999)-(Number.isFinite(b.journey)?b.journey:999);
      const da=effectiveStart(a)?dateObj(effectiveStart(a)):sortDate(a),db=effectiveStart(b)?dateObj(effectiveStart(b)):sortDate(b);
      return da-db;
    });
    return out.map(display);
  };

  card=function(s){
    const raw=originalSchool(s),node=nativeCard(display(raw));
    if(hasUpdate(raw)){
      const badges=node.querySelector('.badges');
      if(badges&&!badges.querySelector('.personal'))badges.insertAdjacentHTML('beforeend','<span class="badge personal">my update</span>');
    }
    return node;
  };

  updateCounts=function(){
    const now=new Date();
    $('#upcomingCount').textContent=schools.filter(s=>{const start=effectiveStart(s);return start&&dateObj(start)>=now}).length;
    $('#savedCount').textContent=state.saved.filter(id=>schools.some(s=>s.id===id)).length;
    $('#bookedCount').textContent=schools.filter(s=>state.booked[s.id]).length;
  };

  resetCalendarCursor=function(){
    const upcoming=schools.filter(s=>{const start=effectiveStart(s);return start&&dateObj(start)>=new Date()}).sort((a,b)=>dateObj(effectiveStart(a))-dateObj(effectiveStart(b)));
    const d=upcoming[0]?dateObj(effectiveStart(upcoming[0])):new Date();
    calendarCursor=new Date(d.getFullYear(),d.getMonth(),1);
  };

  downloadICS=function(s){return nativeDownloadICS(display(originalSchool(s)))};

  showDetail=function(s){
    const raw=originalSchool(s),shown=display(raw);
    nativeShowDetail(shown);
    const inner=$('#detailBody .detail-inner'),meta=inner?.querySelector('.meta');if(!inner||!meta)return;
    if(hasUpdate(raw)){const badges=inner.querySelector('.badges');if(badges&&!badges.querySelector('.personal'))badges.insertAdjacentHTML('beforeend','<span class="badge personal">my update</span>')}
    const section=document.createElement('section');section.className='personal-update';
    section.innerHTML='<small>MY UPDATE</small><h3>Personal date, time & note</h3><p class="sources">Use this when you learn something before the tracker has verified it. Your update is private to your synced Openday state and does not change the source verification label.</p><label class="personal-note-label">Personal note<textarea id="personalEventNote" class="note" placeholder="e.g. Confirmed by school; arrive 15 minutes early"></textarea></label><div class="personal-update-grid"><label>Date<input id="personalEventDate" type="date"></label><label>Start time<input id="personalEventStart" type="time"></label><label>End time<input id="personalEventEnd" type="time"></label></div><div class="personal-update-footer"><button id="clearPersonalUpdate" type="button">Clear my update</button><span id="personalUpdateStatus">Saved automatically</span></div>';
    meta.after(section);
    const o=overrideFor(raw),date=$('#personalEventDate'),start=$('#personalEventStart'),end=$('#personalEventEnd'),note=$('#personalEventNote'),status=$('#personalUpdateStatus');
    date.value=o.date||'';start.value=o.startTime||'';end.value=o.endTime||'';note.value=o.note||'';
    let timer=null;
    const refresh=()=>{
      const current=display(raw),big=inner.querySelector('.bigdate');
      if(big)big.textContent=(historical(current)?'Last known: ':'')+fmtDate(current.start||current.lastKnownStart);
      let line=big?.nextElementSibling;if(line?.classList.contains('historical-note'))line=line.nextElementSibling;
      if(line&&line.tagName==='P')line.textContent=`${raw.event} · ${current.start?fmtTime(current.start,current.end):current.lastKnownStart?'Current time/date not yet verified':'Current date and time being checked'}`;
    };
    const persist=()=>{
      const next={date:date.value,startTime:start.value,endTime:end.value,note:note.value,updatedAt:new Date().toISOString()};
      if(!next.date&&!next.startTime&&!next.endTime&&!next.note)delete state.eventOverrides[raw.id];else state.eventOverrides[raw.id]=next;
      saveState();window.OpenDaySync?.schedule?.();status.textContent=window.OpenDaySync?.hasToken?.()?'Saved · syncing':'Saved on this device';refresh();render();
    };
    [date,start,end].forEach(el=>el.addEventListener('change',persist));
    note.addEventListener('input',()=>{status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(persist,350)});
    note.addEventListener('blur',()=>{clearTimeout(timer);persist()});
    $('#clearPersonalUpdate').onclick=()=>{delete state.eventOverrides[raw.id];saveState();window.OpenDaySync?.schedule?.();date.value='';start.value='';end.value='';note.value='';status.textContent='Personal update cleared';refresh();render()};
  };

  window.OpenDayPersonalUpdates={effectiveStart,effectiveEnd,overrideFor,hasUpdate};
})();
