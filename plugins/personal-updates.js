(()=>{
  if(typeof state!=='object'||typeof schools==='undefined')return;
  state.eventOverrides=state.eventOverrides&&typeof state.eventOverrides==='object'?state.eventOverrides:{};

  const publicApi=window.OpenDayPublicOverrides;
  const nativeCard=card,nativeShowDetail=showDetail,nativeDownloadICS=downloadICS;
  const datePart=v=>typeof v==='string'&&v.length>=10?v.slice(0,10):'';
  const timePart=v=>typeof v==='string'&&!dateOnly(v)?(v.match(/T(\d{2}:\d{2})/)?.[1]||''):'';
  const legacyFor=s=>state.eventOverrides?.[s.id]||{};
  const publicFor=s=>publicApi?.get?.(s.id)||null;
  const overrideFor=s=>publicFor(s)||legacyFor(s);
  const hasUpdate=s=>{const o=overrideFor(s);return !!(o?.date||o?.startTime||o?.endTime)};
  const effectiveStart=s=>{
    const o=overrideFor(s),base=s.start||null;
    if(!o?.date&&!o?.startTime)return base;
    const d=o.date||datePart(base)||datePart(s.lastKnownStart);
    if(!d)return base;
    const t=o.startTime||timePart(base);
    return t?`${d}T${t}:00`:d;
  };
  const effectiveEnd=s=>{
    const o=overrideFor(s),base=s.end||null;
    if(!o?.endTime&&!o?.date)return base;
    const start=effectiveStart(s);if(!start)return base;
    const d=datePart(start),t=o.endTime||timePart(base);
    return t?`${d}T${t}:00`:null;
  };
  const display=s=>({...s,start:effectiveStart(s),end:effectiveEnd(s),_publicReport:publicFor(s)});
  const originalSchool=s=>schools.find(x=>x.id===s.id)||s;

  const style=document.createElement('style');
  style.textContent=`
    .badge.personal{background:#e9e3ff;color:#5b43a3}
    .global-update{margin:14px 0;padding:13px;background:#f4f8ff;border:1px solid #cfdcf0;border-radius:12px}
    .global-update h3{margin:4px 0 5px}
    .global-update .sources{margin:0 0 10px}
    .global-update-grid label{display:flex;flex-direction:column;gap:5px;font-size:.76rem;font-weight:750;color:#52697d}
    .global-update-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:8px;margin-top:9px}
    .global-update-grid input{min-width:0;border:1px solid #dce5ed;border-radius:9px;padding:9px;font:inherit;color:#102a43;background:white}
    .global-update-footer{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:9px}
    .global-update-footer button{border:1px solid #1769aa;border-radius:9px;padding:8px 10px;background:#1769aa;color:white;font-weight:750}
    #globalUpdateStatus{font-size:.76rem;color:#61758a}
    .report-attribution{font-size:.76rem;color:#61758a;margin:6px 0 0}
    @media(max-width:560px){.global-update-grid{grid-template-columns:1fr 1fr}.global-update-grid label:first-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  filteredSchools=function(){
    const q=$('#search').value.trim().toLowerCase(),now=new Date();
    let out=schools.filter(s=>{
      const extra=schoolExtra(s),o=overrideFor(s),start=effectiveStart(s);
      const text=`${s.name} ${s.area} ${s.event} ${s.type} ${s.admission?.summary||''} ${s.admission?.route||''} ${extra.travel?.transitText||''} ${o?.contributorLabel||''}`.toLowerCase();
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
    const raw=originalSchool(s),node=nativeCard(display(raw)),report=publicFor(raw);
    if(report){
      const badges=node.querySelector('.badges');
      if(badges)badges.insertAdjacentHTML('beforeend',`<span class="badge personal">reported · ${report.contributorLabel}</span>`);
    }else if(hasUpdate(raw)){
      const badges=node.querySelector('.badges');
      if(badges)badges.insertAdjacentHTML('beforeend','<span class="badge personal">device update</span>');
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
    const raw=originalSchool(s),shown=display(raw),report=publicFor(raw);
    nativeShowDetail(shown);
    const inner=$('#detailBody .detail-inner'),meta=inner?.querySelector('.meta');if(!inner||!meta)return;
    if(report){
      const badges=inner.querySelector('.badges');
      if(badges)badges.insertAdjacentHTML('beforeend',`<span class="badge personal">reported · ${report.contributorLabel}</span>`);
    }
    const section=document.createElement('section');section.className='global-update';
    section.innerHTML='<small>GLOBAL DATE / TIME</small><h3>Report a date or time correction</h3><p class="sources">Date/time reports are shared with everyone using Openday and remain marked as reported until independently verified. Your private visit notes below are not shared.</p><div class="global-update-grid"><label>Date<input id="globalEventDate" type="date"></label><label>Start time<input id="globalEventStart" type="time"></label><label>End time<input id="globalEventEnd" type="time"></label></div><p id="reportAttribution" class="report-attribution"></p><div class="global-update-footer"><button id="publishGlobalUpdate" type="button">Publish report</button><span id="globalUpdateStatus"></span></div>';
    meta.after(section);
    const current=overrideFor(raw),date=$('#globalEventDate'),start=$('#globalEventStart'),end=$('#globalEventEnd'),status=$('#globalUpdateStatus'),attrib=$('#reportAttribution');
    date.value=current?.date||datePart(raw.start)||'';start.value=current?.startTime||timePart(raw.start)||'';end.value=current?.endTime||timePart(raw.end)||'';
    if(report)attrib.textContent=`Current global report by ${report.contributorLabel}${report.updatedAt?' · '+new Date(report.updatedAt).toLocaleString('en-GB'):''}.`;
    else publicApi?.contributor?.().then(who=>attrib.textContent=`Your reports will appear as ${who.label}.`).catch(()=>{});
    $('#publishGlobalUpdate').onclick=async()=>{
      status.textContent='Publishing…';
      try{
        const saved=await publicApi.report(raw.id,{date:date.value,startTime:start.value,endTime:end.value});
        status.textContent=`Published globally as ${saved.contributor.label} ✓`;
      }catch(error){status.textContent=error?.message||'Could not publish report.'}
    };
  };

  async function migrateLegacy(){
    if(!publicApi?.report)return;
    const migrated=JSON.parse(localStorage.getItem('openday.legacyGlobalMigrations.v1')||'{}');
    let changed=false;
    for(const [schoolId,o] of Object.entries(state.eventOverrides||{})){
      if(!o||migrated[schoolId])continue;
      if(o.note&&!state.notes?.[schoolId]){state.notes[schoolId]=o.note;changed=true}
      if(o.date||o.startTime||o.endTime){
        try{
          await publicApi.report(schoolId,{date:o.date||'',startTime:o.startTime||'',endTime:o.endTime||''});
          migrated[schoolId]=new Date().toISOString();
          delete state.eventOverrides[schoolId];changed=true;
        }catch(error){console.warn('Could not migrate legacy date/time override',schoolId,error)}
      }else if(o.note){delete state.eventOverrides[schoolId];changed=true}
    }
    localStorage.setItem('openday.legacyGlobalMigrations.v1',JSON.stringify(migrated));
    if(changed){saveState();window.OpenDaySync?.schedule?.();render()}
  }

  window.addEventListener('openday:public-overrides',()=>{render();migrateLegacy().catch(()=>{})});
  window.addEventListener('openday:cloud-state',()=>migrateLegacy().catch(()=>{}));
  setTimeout(()=>migrateLegacy().catch(()=>{}),1200);

  window.OpenDayPersonalUpdates={effectiveStart,effectiveEnd,overrideFor,hasUpdate,publicFor};
})();
