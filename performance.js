(()=>{
  const $=s=>document.querySelector(s);
  let doc={schools:[]},filter='all',expanded='',sortKey='name',sortDir='asc',selectedYear='latest',activeSchoolSet='';
  const selectedCompare=new Set();
  const subjectMode={gcse:'count',alevel:'count'};
  const schoolSetKey='openday.performance.schoolSets.v1',compareOrderKey='openday.performance.compareOrder.v1';
  const loadJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const state=(()=>{try{return JSON.parse(localStorage.getItem('openDayState')||'{}')}catch{return{}}})();
  let schoolSets=state.performanceSchoolSets||loadJson(schoolSetKey,{}),compareOrder=state.performanceCompareOrder||loadJson(compareOrderKey,[]);
  if(!schoolSets||Array.isArray(schoolSets)||typeof schoolSets!=='object')schoolSets={};
  if(!Array.isArray(compareOrder))compareOrder=[];
  const persistPerformancePrefs=()=>{
    state.performanceSchoolSets=schoolSets;state.performanceCompareOrder=compareOrder;state.updatedAt=new Date().toISOString();
    localStorage.setItem('openDayState',JSON.stringify(state));
    localStorage.setItem(schoolSetKey,JSON.stringify(schoolSets));localStorage.setItem(compareOrderKey,JSON.stringify(compareOrder));
    window.OpenDaySync?.schedule?.();
  };
  const visited=new Set(state.visitedSchools||[]),saved=new Set(state.saved||[]),booked=state.booked||{};
  const decisions=state.schoolDecisions||{};
  const shortlisted=new Set(state.shortlistedSchools||[]),rejected=new Set(state.rejectedSchools||[]);
  const layoutKey='openday.performance.columns.v1';
  const DEFAULT_COLUMNS=['school','gcseYear','grade9pct','grade9count','grade97pct','grade97count','a8','engmath5','p8','alevel','fsm','wholeEal','sen','ehcp','absence','persistent'];
  const COLUMN_LABELS={
    school:'School',gcseYear:'GCSE year',grade9pct:'Grade 9 %',grade9count:'Grade 9 #',grade97pct:'Grades 9–7 %',grade97count:'Grades 9–7 #',
    a8:'Attainment 8',engmath5:'Eng & maths 5+',p8:'P8 latest',alevel:'A-level',fsm:'FSM',wholeEal:'EAL',sen:'SEN support',ehcp:'EHCP',absence:'Absence',persistent:'PA'
  };
  const COLUMN_HELP={
    school:'School name and area. Click to sort alphabetically; drag another heading to move that column.',
    gcseYear:'The academic year used for the GCSE top-grade figures shown in this row. “Latest” can differ by school because publication dates differ.',
    grade9pct:'Percentage of all covered GCSE / IGCSE grade awards that are grade 9. This is awards, not pupils.',
    grade9count:'Number of grade 9 awards in the covered result set. One pupil normally takes several GCSEs, so one pupil can contribute several grade 9 awards.',
    grade97pct:'Percentage of covered GCSE / IGCSE grade awards at grades 9–7 (roughly A*–A on the old scale).',
    grade97count:'Number of GCSE / IGCSE grade awards at grades 9–7. This is not the number of pupils.',
    a8:'Attainment 8: average points across eight qualifying GCSE subjects. Mainly a DfE state-school performance-table measure; independent-school coverage can be incomplete.',
    engmath5:'Percentage achieving grade 5 or above in both English and mathematics in the DfE performance tables.',
    p8:'Progress 8: progress relative to pupils nationally with similar KS2 starting points. Not published for cohorts without usable KS2 baselines.',
    alevel:'Latest A-level outcome available for the selected year. School-published A*/A percentages are used when they are newer or more complete than DfE data.',
    fsm:'Whole-school percentage known to be eligible for free school meals, from the latest available school census.',
    wholeEal:'Whole-school percentage whose first language is known or believed to be other than English.',
    sen:'Whole-school percentage receiving SEN support.',
    ehcp:'Whole-school percentage with an Education, Health and Care Plan.',
    absence:'Overall percentage of possible school sessions missed. Lower is generally less absence.',
    persistent:'Percentage of pupils persistently absent, defined in the source as missing 10% or more sessions.'
  };
  const METRIC_COLUMNS=DEFAULT_COLUMNS.filter(x=>x!=='school');
  const loadColumnState=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(layoutKey)||'{}');
      const seen=new Set();
      const order=(Array.isArray(raw.order)?raw.order:METRIC_COLUMNS).filter(id=>METRIC_COLUMNS.includes(id)&&!seen.has(id)&&seen.add(id));
      METRIC_COLUMNS.forEach(id=>{if(!seen.has(id))order.push(id)});
      const hidden=(Array.isArray(raw.hidden)?raw.hidden:[]).filter(id=>METRIC_COLUMNS.includes(id));
      return{order,hidden};
    }catch{return{order:[...METRIC_COLUMNS],hidden:[]}}
  };
  let columnState=loadColumnState();
  const saveColumnState=()=>localStorage.setItem(layoutKey,JSON.stringify(columnState));
  const visibleColumnIds=()=>['school',...columnState.order.filter(id=>!columnState.hidden.includes(id))];

  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>{
    if(v===null||v===undefined||v==='')return '—';
    const num=Number(v);
    if(!Number.isFinite(num))return String(v);
    if(Number.isInteger(num))return String(num);
    const fixed=num.toFixed(Math.abs(num)<10?2:1);
    return fixed.replace(/0+$/,'').replace(/\.$/,'');
  };
  const pct=v=>{
    if(v===null||v===undefined)return '—';
    const num=Number(v);if(!Number.isFinite(num))return String(v)+'%';
    if(Math.abs(num-Math.round(num))<0.05)return String(Math.round(num))+'%';
    return num.toFixed(1).replace(/\.0$/,'')+'%';
  };
  const years=o=>Object.keys(o||{}).sort();
  const latest=(o,field)=>{
    for(const y of years(o).reverse()){
      const row=o[y];
      const value=field?row?.[field]:row;
      if(value!==null&&value!==undefined)return{year:y,value,row};
    }
    return null;
  };
  const yearLabel=y=>{
    const s=String(y||'');
    return s.length===6?s.slice(0,4)+'/'+s.slice(4):s;
  };
  const compactYear=y=>String(y||'').replace('/','');
  const yearNumber=y=>Number(String(y||'').replace(/\D/g,''))||0;
  const eventFlag=(school,set)=>school.eventIds.some(id=>set.has(id));
  const decisionFlag=(school,value)=>school.eventIds.some(id=>decisions[id]===value);
  const metricForYear=(obj,field)=>{
    if(selectedYear==='latest')return latest(obj,field);
    const key=compactYear(selectedYear),row=obj?.[key];
    const value=field?row?.[field]:row;
    return value!==null&&value!==undefined?{year:key,value,row}:null;
  };
  function publishedForView(s){
    const map=s.publishedResults||{};
    if(selectedYear!=='latest')return map[selectedYear]?{year:selectedYear,data:map[selectedYear]}:null;
    const keys=Object.keys(map).sort((a,b)=>yearNumber(a)-yearNumber(b));
    const year=keys.at(-1);
    return year?{year,data:map[year]}:null;
  }
  function subjectPack(s,kind){
    const pub=publishedForView(s),payload=pub?.data?.[kind];
    if(payload?.subjectDetails?.length)return{year:pub.year,subjects:payload.subjectDetails,source:'school-published',note:payload.note||'',highlights:payload.subjectHighlights||[]};
    if(pub&&(selectedYear==='latest'||selectedYear===pub.year))return{year:pub.year,subjects:[],source:'school-published',note:payload?.note||'',highlights:payload?.subjectHighlights||[]};
    const year=selectedYear==='latest'?'2024/25':selectedYear;
    if(year==='2024/25')return{year,subjects:kind==='gcse'?(s.gcseSubjects||[]):(s.alevelSubjects||[]),source:'DfE',note:'',highlights:[]};
    return{year,subjects:[],source:'none',note:'',highlights:[]};
  }

  function latestSummary(s){
    const context=s.context||{},pc=context.pupilCharacteristics||{},sen=context.sen||{},gp=s.gcseGradeProfile||{};
    const pub=publishedForView(s),pubGcse=pub?.data?.gcse||{},pubAlevel=pub?.data?.alevel||{};
    const gpYear=gp.year||'2024/25';
    const publishedIsNewer=pub&&yearNumber(pub.year)>yearNumber(gpYear);
    const usePublishedGcse=pub&&(
      selectedYear!=='latest' ||
      publishedIsNewer ||
      pubGcse.grade9Percent!==undefined ||
      pubGcse.grade97Percent!==undefined
    );
    const profileAllowed=selectedYear==='latest'
      ? !publishedIsNewer
      : selectedYear===gpYear;
    const gradeMetric=(field)=>{
      if(usePublishedGcse&&pubGcse[field]!==null&&pubGcse[field]!==undefined)return{year:pub.year,value:pubGcse[field],row:pubGcse,source:'school-published'};
      if(usePublishedGcse&&publishedIsNewer)return null;
      if(profileAllowed&&gp[field]!==null&&gp[field]!==undefined)return{year:gpYear,value:gp[field],row:gp,source:'DfE'};
      return null;
    };
    const alPub=pub&&Object.keys(pubAlevel).length?{year:pub.year,row:pubAlevel,source:'school-published'}:null;
    const independentPublished=s.type==='independent'&&Object.keys(s.publishedResults||{}).length>0;
    return{
      a8:independentPublished?null:metricForYear(s.gcse,'attainment8'),
      em:independentPublished?null:metricForYear(s.gcse,'englishMaths5Plus'),
      p8:independentPublished?null:metricForYear(s.gcse,'progress8'),
      ks4Eal:metricForYear(s.ks4Eal||{},null),
      al:metricForYear(s.alevel,'aps'),
      alPub,
      grade9pct:gradeMetric('grade9Percent'),
      grade9count:gradeMetric('grade9Count'),
      grade97pct:gradeMetric('grade97Percent'),
      grade97count:gradeMetric('grade97Count'),
      grade98pct:gradeMetric('grade98Percent'),
      fsm:pc.fsmPercent!==null&&pc.fsmPercent!==undefined?{year:pc.year||'2025/26',value:pc.fsmPercent,row:pc}:null,
      wholeEal:pc.ealPercent!==null&&pc.ealPercent!==undefined?{year:pc.year||'2025/26',value:pc.ealPercent,row:pc}:null,
      sen:sen.senSupportPercent!==null&&sen.senSupportPercent!==undefined?{year:sen.year||'2025/26',value:sen.senSupportPercent,row:sen}:null,
      ehcp:sen.ehcpPercent!==null&&sen.ehcpPercent!==undefined?{year:sen.year||'2025/26',value:sen.ehcpPercent,row:sen}:null,
      absence:latest(context.absence||{},'overallAbsencePercent'),
      persistent:latest(context.absence||{},'persistentAbsencePercent')
    };
  }

  function matches(s){
    const q=$('#perfSearch').value.trim().toLowerCase();
    if(q&&!(String(s.name)+' '+String(s.area)+' '+String(s.type)).toLowerCase().includes(q))return false;
    if(activeSchoolSet&&!(schoolSets[activeSchoolSet]||[]).includes(s.name))return false;
    if(filter==='shortlist')return eventFlag(s,shortlisted);
    if(filter==='rejected')return eventFlag(s,rejected);
    if(filter==='visited')return eventFlag(s,visited);
    if(filter==='booked')return s.eventIds.some(id=>!!booked[id]);
    if(filter==='saved')return eventFlag(s,saved);
    if(filter==='liked')return decisionFlag(s,'liked');
    if(filter==='visit-again')return decisionFlag(s,'visit-again');
    if(filter==='try-for')return decisionFlag(s,'try-for');
    if(filter==='not-for-us')return decisionFlag(s,'not-for-us');
    if(filter==='state')return ['state','part-selective'].includes(s.type);
    if(filter==='grammar')return s.type==='grammar';
    if(filter==='independent')return s.type==='independent';
    if(filter==='has-gcse')return years(s.gcse).length>0;
    if(filter==='has-alevel')return years(s.alevel).length>0;
    if(filter==='has-context')return !!Object.keys(s.context?.pupilCharacteristics||{}).length;
    if(filter==='has-absence')return years(s.context?.absence||{}).length>0;
    return true;
  }

  function score(s,key){
    const m=latestSummary(s);
    if(key==='grade9pct')return m.grade9pct?.value??-Infinity;
    if(key==='grade9count')return m.grade9count?.value??-Infinity;
    if(key==='grade97count')return m.grade97count?.value??-Infinity;
    if(key==='gcseYear')return Number(String(m.a8?.year||s.gcseGradeProfile?.year||'0').replace(/\D/g,''))||0;
    if(key==='grade97pct')return m.grade97pct?.value??-Infinity;
    if(key==='attainment8')return m.a8?.value??-Infinity;
    if(key==='engmath5')return m.em?.value??-Infinity;
    if(key==='progress8')return m.p8?.value??-Infinity;
    if(key==='alevel')return m.alPub?.row?.astarAPercent??m.al?.value??-Infinity;
    if(key==='fsm')return m.fsm?.value??-Infinity;
    if(key==='wholeEal')return m.wholeEal?.value??-Infinity;
    if(key==='sen')return m.sen?.value??-Infinity;
    if(key==='ehcp')return m.ehcp?.value??-Infinity;
    if(key==='absence')return m.absence?.value??Infinity;
    if(key==='persistent')return m.persistent?.value??Infinity;
    return 0;
  }

  const gradeDisplay=raw=>{
    const s=String(raw??'').trim();
    if(/^\d{2}$/.test(s))return s[0]+'–'+s[1];
    return s;
  };
  const gradeRank=raw=>{
    const s=String(raw??'').trim().toUpperCase();
    if(s==='A*')return 1100;
    if(s==='A')return 1000;
    if(s==='B')return 900;
    if(s==='C')return 800;
    if(s==='D')return 700;
    if(s==='E')return 600;
    if(s==='U'||s==='FAIL')return -100;
    if(/^\d{2}$/.test(s))return Number(s[0])*100+Number(s[1]);
    if(/^\d$/.test(s))return Number(s)*100;
    return 0;
  };
  const gradeTone=raw=>{
    const s=String(raw??'').toUpperCase();
    const first=Number((s.match(/\d/)||[])[0]);
    if(s==='A*'||first===9)return 'top';
    if(s==='A'||[8,7].includes(first))return 'high';
    if(s==='B'||[6,5].includes(first))return 'mid';
    if(s==='C'||first===4)return 'pass';
    if(s==='U'||s==='FAIL'||[1,2,3].includes(first))return 'low';
    return 'other';
  };
  function subjectHoverLine(subject){
    if(!subject)return '';
    const grades=subject.grades||{};
    const keys=Object.keys(grades).filter(g=>g!=='Total exam entries').sort((a,b)=>gradeRank(b)-gradeRank(a));
    const bits=keys.slice(0,4).map(g=>gradeDisplay(g)+': '+grades[g]);
    return '<br><span style="opacity:.88">'+esc(subject.subject)+': '+esc(bits.join(' · ')||'published detail available')+'</span>';
  }
  function hoverText(s,m){
    const pack=subjectPack(s,'gcse');
    const priority=['English Language','English','Mathematics','Biology'];
    const subjects=[...(pack.subjects||[])].sort((a,b)=>{
      const ai=priority.indexOf(a.subject),bi=priority.indexOf(b.subject);
      return (ai<0?99:ai)-(bi<0?99:bi)||a.subject.localeCompare(b.subject);
    }).slice(0,3);
    const gcseYear=m.grade9pct?.year||m.grade97pct?.year||m.a8?.year||pack.year||'';
    const alText=m.alPub
      ? 'A-level '+esc(m.alPub.year)+': A* '+pct(m.alPub.row.astarPercent)+' · A*/A '+pct(m.alPub.row.astarAPercent)
      : 'A-level: '+(m.al?(m.al.row.averageGrade||fmt(m.al.value))+' ('+yearLabel(m.al.year)+')':'—');
    return '<b>'+esc(s.name)+'</b><br>'+
      '<b>GCSE '+esc(yearLabel(gcseYear))+':</b> Grade 9 '+(m.grade9pct?pct(m.grade9pct.value):'—')+
      (m.grade9count?' ('+fmt(m.grade9count.value)+' awards)':'')+
      ' · 9–7 '+(m.grade97pct?pct(m.grade97pct.value):'—')+
      (m.grade97count?' ('+fmt(m.grade97count.value)+')':'')+'<br>'+
      'Attainment 8: '+(m.a8?fmt(m.a8.value)+' ('+yearLabel(m.a8.year)+')':'not available')+
      ' · Eng/maths 5+: '+(m.em?(s.type==='independent'&&Number(m.em.value)===0?'n/a†':pct(m.em.value)):'—')+'<br>'+
      'P8: '+(m.p8?fmt(m.p8.value)+' ('+yearLabel(m.p8.year)+')':'not available')+'<br>'+
      alText+'<br>'+
      'FSM: '+(m.fsm?pct(m.fsm.value):'—')+' · EAL: '+(m.wholeEal?pct(m.wholeEal.value):'—')+
      ' · SEN support: '+(m.sen?pct(m.sen.value):'—')+' · EHCP: '+(m.ehcp?pct(m.ehcp.value):'—')+'<br>'+
      'Absence: '+(m.absence?pct(m.absence.value):'—')+' · persistent absence: '+(m.persistent?pct(m.persistent.value):'—')+
      (subjects.length?'<br><b>'+esc(pack.year)+' subject detail</b>':'')+
      subjects.map(subjectHoverLine).join('')+
      '<br><span style="opacity:.7">Click/tap the row for sources, history and subject tables.</span>';
  }

  function schoolCell(s,m){
    const isVisited=eventFlag(s,visited),isSaved=eventFlag(s,saved),isShort=eventFlag(s,shortlisted),isRejected=eventFlag(s,rejected),checked=selectedCompare.has(s.name);
    return '<td class="school-cell"><div class="school-select-line"><input class="compare-select" type="checkbox" '+(checked?'checked':'')+' aria-label="Select '+esc(s.name)+' for comparison"><span class="school-name">'+esc(s.name)+'</span><span class="school-icons" aria-label="School status">'+
      (isSaved?'<span class="school-state-icon saved-icon" title="Saved" aria-label="Saved">♥</span>':'')+
      '<button type="button" data-school-status="shortlist" class="school-state-icon status-icon '+(isShort?'on':'')+'" title="'+(isShort?'Remove from shortlist':'Add to shortlist')+'" aria-label="'+(isShort?'Remove from shortlist':'Add to shortlist')+'">'+(isShort?'★':'☆')+'</button>'+
      (isVisited?'<span class="school-state-icon visited-icon" title="Visited" aria-label="Visited">✓</span>':'')+
      '<button type="button" data-school-status="rejected" class="school-state-icon status-icon '+(isRejected?'on reject':'')+'" title="'+(isRejected?'Remove rejection':'Reject school')+'" aria-label="'+(isRejected?'Remove rejection':'Reject school')+'">⊘</button>'+
      '</span></div><div class="school-meta-line"><span class="school-meta">'+esc(s.area||'')+' · '+esc(String(s.type||'').replace('-',' '))+'</span></div><div class="hover-card">'+hoverText(s,m)+'</div></td>';
  }

  const examEntryTotal=subject=>{
    const g=subject?.grades||{},declared=Number(g['Total exam entries'])||0;
    const counted=Object.entries(g).filter(([k])=>k!=='Total exam entries').reduce((n,[,v])=>n+(Number(v)||0),0);
    return Math.max(declared,counted);
  };
  function gcseCohort(s,year){
    const displayYear=yearLabel(year),published=s.publishedResults?.[displayYear]?.gcse?.subjectDetails||[];
    if(published.length){
      const maths=published.filter(x=>/^(mathematics|maths)$/i.test(String(x.subject||'').trim())&&!/fsmq|additional/i.test(String(x.qualification||'')+' '+String(x.subjectGroup||''))).map(examEntryTotal).filter(Boolean);
      const english=published.filter(x=>/^(english|english language)$/i.test(String(x.subject||'').trim())).map(examEntryTotal).filter(Boolean);
      const m=Math.max(0,...maths),e=Math.max(0,...english);
      if(m&&e&&m===e)return{value:m,inferred:false,source:'matching Mathematics and English entry totals'};
      if(m||e)return{value:Math.max(m,e),inferred:true,source:'compulsory-subject entry total'};
    }
    const dfe=s.gcse?.[compactYear(displayYear)]?.pupils;
    if(Number(dfe)>0&&!(s.type==='independent'&&s.publishedResults?.[displayYear]?.gcse?.subjectDetails?.length))return{value:Number(dfe),inferred:false,source:'DfE KS4 cohort'};
    return null;
  }
  function alevelCohort(s,year){
    const displayYear=yearLabel(year),published=s.publishedResults?.[displayYear]?.alevel||{};
    const publishedCount=Number(published.candidates??published.students??published.pupils);
    if(publishedCount>0)return{value:publishedCount,inferred:false,source:'school-published A-level candidates'};
    const dfe=s.alevel?.[compactYear(displayYear)]?.students;
    if(Number(dfe)>0)return{value:Number(dfe),inferred:false,source:'DfE A-level cohort'};
    return null;
  }
  const cohortLine=(s,kind,year)=>{
    const cohort=kind==='gcse'?gcseCohort(s,year):alevelCohort(s,year),label=kind==='gcse'?'GCSE':'A-level';
    return '<small class="school-cohort-line">'+esc(yearLabel(year)||'—')+' · '+(cohort?(cohort.inferred?'≈':'')+fmt(cohort.value)+' '+label+' pupils':label+' cohort —')+'</small>';
  };
  const qualificationSchoolHeader=(s,kind,year)=>esc(s.name)+cohortLine(s,kind,year);
  function mainCompareSchoolHeader(s){
    const m=latestSummary(s),profile=s.gcseGradeProfile||{};
    const gy=yearLabel(m.grade9pct?.year||m.grade97pct?.year||m.a8?.year||profile.year||'');
    const ay=yearLabel(m.alPub?.year||m.al?.year||'');
    let html=esc(s.name);
    if(gy)html+=cohortLine(s,'gcse',gy);
    if(ay)html+=cohortLine(s,'alevel',ay);
    return html;
  }

  function metricCell(id,s,m){
    const profile=s.gcseGradeProfile||{};
    let html='—';
    if(id==='gcseYear'){
      const year=yearLabel(m.grade9pct?.year||m.grade97pct?.year||m.a8?.year||profile.year||''),cohort=gcseCohort(s,year);
      html='<span class="gcse-year-cell"><b>'+esc(year||'—')+'</b><span title="'+esc(cohort?.source||'Cohort size not published in the available source')+'">'+(cohort?(cohort.inferred?'≈':'')+fmt(cohort.value)+' pupils':'cohort —')+'</span></span>';
    }
    else if(id==='grade9pct')html=m.grade9pct?'<span class="headline-grade grade-chip tone-top"><span class="grade-label">9</span><span class="grade-count">'+pct(m.grade9pct.value)+'</span></span>':'—';
    else if(id==='grade9count')html=m.grade9count?fmt(m.grade9count.value):'—';
    else if(id==='grade97pct')html=m.grade97pct?'<span class="headline-grade grade-chip tone-high"><span class="grade-label">9–7</span><span class="grade-count">'+pct(m.grade97pct.value)+'</span></span>':'—';
    else if(id==='grade97count')html=m.grade97count?fmt(m.grade97count.value):'—';
    else if(id==='a8')html=m.a8?fmt(m.a8.value):'—';
    else if(id==='engmath5')html=m.em?(s.type==='independent'&&Number(m.em.value)===0?'n/a†':pct(m.em.value)):'—';
    else if(id==='p8')html=m.p8?fmt(m.p8.value)+' <span class="muted">('+yearLabel(m.p8.year)+')</span>':'—';
    else if(id==='alevel')html=m.alPub
      ? '<span class="published-metric"><b>A* '+pct(m.alPub.row.astarPercent)+'</b><span>A*/A '+pct(m.alPub.row.astarAPercent)+' · '+esc(m.alPub.year)+'</span></span>'
      : m.al?esc(m.al.row.averageGrade||fmt(m.al.value))+' <span class="muted">('+yearLabel(m.al.year)+')</span>':'—';
    else if(id==='fsm')html=m.fsm?pct(m.fsm.value):'—';
    else if(id==='wholeEal')html=m.wholeEal?pct(m.wholeEal.value):'—';
    else if(id==='sen')html=m.sen?pct(m.sen.value):'—';
    else if(id==='ehcp')html=m.ehcp?pct(m.ehcp.value):'—';
    else if(id==='absence')html=m.absence?pct(m.absence.value)+' <span class="muted">('+yearLabel(m.absence.year)+')</span>':'—';
    else if(id==='persistent')html=m.persistent?pct(m.persistent.value)+' <span class="muted">('+yearLabel(m.persistent.year)+')</span>':'—';
    return '<td class="metric metric-'+esc(id)+'">'+html+'</td>';
  }

  const sortForColumn=id=>id==='school'?'name':id==='a8'?'attainment8':id==='engmath5'?'engmath5':id==='p8'?'progress8':id;
  function renderHead(){
    const ids=visibleColumnIds();
    $('#performanceHead').innerHTML=ids.map(id=>{
      const key=sortForColumn(id),active=sortKey===key,sortMark=active?(sortDir==='asc'?'▴':'▾'):'▴▾';
      const draggable=id!=='school';
      return '<th tabindex="0" role="button" draggable="'+draggable+'" data-column="'+esc(id)+'" data-sort-key="'+esc(key)+'" title="'+esc(COLUMN_HELP[id]||'Click to sort. Drag to move this column.')+'"><span class="sort-head">'+esc(COLUMN_LABELS[id]||id)+' <span class="sort-mark '+(active?'active':'')+'">'+sortMark+'</span></span></th>';
    }).join('');
    let dragged='',didDrag=false;
    document.querySelectorAll('#performanceHead th[data-sort-key]').forEach(th=>{
      const sort=()=>{
        if(didDrag){didDrag=false;return}
        const key=th.dataset.sortKey;
        if(sortKey===key)sortDir=sortDir==='asc'?'desc':'asc';else{sortKey=key;sortDir=(key==='name'||key==='absence'||key==='persistent')?'asc':'desc'}
        const sel=$('#perfSort');if(sel&&[...sel.options].some(o=>o.value===key))sel.value=key;
        render();
      };
      th.onclick=sort;
      th.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sort()}};
      if(th.dataset.column!=='school'){
        th.ondragstart=()=>{dragged=th.dataset.column;th.classList.add('dragging');didDrag=true};
        th.ondragend=()=>{dragged='';th.classList.remove('dragging');setTimeout(()=>{didDrag=false},0)};
        th.ondragover=e=>{if(dragged)e.preventDefault()};
        th.ondrop=e=>{
          e.preventDefault();
          const target=th.dataset.column;
          if(!dragged||dragged===target)return;
          const from=columnState.order.indexOf(dragged),to=columnState.order.indexOf(target);
          if(from<0||to<0)return;
          const next=[...columnState.order];next.splice(from,1);next.splice(to,0,dragged);columnState.order=next;
          saveColumnState();render();
        };
      }
    });
    const table=document.querySelector('.performance-table');
    if(table)table.style.minWidth=Math.max(760,250+(ids.length-1)*105)+'px';
  }

  function savePersonalState(){
    state.shortlistedSchools=[...shortlisted];
    state.rejectedSchools=[...rejected];
    localStorage.setItem('openDayState',JSON.stringify(state));
    window.OpenDaySync?.push?.();
  }
  function setSchoolStatus(s,status){
    const already=status==='shortlist'?eventFlag(s,shortlisted):status==='rejected'?eventFlag(s,rejected):false;
    s.eventIds.forEach(id=>{shortlisted.delete(id);rejected.delete(id)});
    if(!already&&status==='shortlist')s.eventIds.forEach(id=>shortlisted.add(id));
    if(!already&&status==='rejected')s.eventIds.forEach(id=>rejected.add(id));
    savePersonalState();render();
  }
  function schoolRow(s){
    const m=latestSummary(s),tr=document.createElement('tr');
    tr.className='school-row'+(expanded===s.name?' expanded':'');
    tr.dataset.school=s.name;
    tr.innerHTML=visibleColumnIds().map(id=>id==='school'?schoolCell(s,m):metricCell(id,s,m)).join('');
    tr.onclick=e=>{
      if(e.target.closest('.compare-select')||e.target.closest('[data-school-status]'))return;
      expanded=expanded===s.name?'':s.name;render()
    };
    tr.querySelector('.compare-select')?.addEventListener('change',e=>{
      if(e.target.checked){selectedCompare.add(s.name);if(!compareOrder.includes(s.name)){compareOrder.push(s.name);localStorage.setItem(compareOrderKey,JSON.stringify(compareOrder))}}
      else selectedCompare.delete(s.name);
      updateCompareTray();
    });
    tr.querySelectorAll('[data-school-status]').forEach(b=>b.onclick=e=>{e.stopPropagation();setSchoolStatus(s,b.dataset.schoolStatus)});
    return tr;
  }

  function gcseHistory(s){
    const rows=(s.gcseFiveYearWindow||[]).map(x=>{
      const d=x.data;
      const key=String(x.year||'').replace('/','');
      return '<tr>'+
        '<td>'+esc(x.year)+'</td><td>'+(d?fmt(d.pupils):'—')+'</td>'+
        '<td>'+(d?fmt(d.attainment8):'—')+'</td>'+
        '<td>'+(d?(s.type==='independent'&&Number(d.englishMaths5Plus)===0?'n/a†':pct(d.englishMaths5Plus)):'—')+'</td>'+
        '<td>'+(d&&d.progress8!==null&&d.progress8!==undefined?fmt(d.progress8):'—')+'</td>'+
        '<td>'+(d?pct(d.ebaccEntry):'—')+'</td>'+
        '<td>'+(s.ks4Eal?.[key]!==undefined?pct(s.ks4Eal[key]):'—')+'</td>'+
        '</tr>';
    }).join('');
    const independentNote=s.type==='independent'?'<p class="warning"><b>Independent-school caution:</b> DfE performance measures only count qualifications approved for the performance tables. Schools using IGCSEs or other non-counting qualifications can therefore show artificially low or zero KS4 headline measures. Use the subject detail and school-published results alongside these DfE figures.</p>':'';
    return '<div class="subject-wrap"><table class="year-table"><thead><tr><th>Year</th><th>Pupils</th><th>A8</th><th>Eng/math 5+</th><th>P8</th><th>EBacc entry</th><th>KS4 EAL</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      independentNote+
      '<p class="warning">2020/21 has no comparable exam series. The current DfE institution API exposes school-level KS4 performance from 2022/23; 2021/22 is left as a transparent gap rather than silently substituting another series.</p>';
  }

  function alevelHistory(s){
    const rows=(s.alevelWindow||[]).map(x=>{
      const d=x.data;
      return '<tr><td>'+esc(x.year)+'</td><td>'+(d?fmt(d.students):'—')+'</td><td>'+(d?esc(d.averageGrade||'—'):'—')+'</td><td>'+(d?fmt(d.aps):'—')+'</td><td>'+(d?fmt(d.valueAdded):'—')+'</td><td>'+(d?pct(d.aabPercent):'—')+'</td></tr>';
    }).join('');
    return '<div class="subject-wrap"><table class="year-table"><thead><tr><th>Year</th><th>Students</th><th>Avg grade</th><th>APS</th><th>Value added</th><th>≥AAB</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6">No DfE A-level institution data found.</td></tr>')+'</tbody></table></div>';
  }

  function gradeChips(subject,kind){
    const grades=subject.grades||{};
    const keys=Object.keys(grades).filter(g=>g!=='Total exam entries').sort((a,b)=>gradeRank(b)-gradeRank(a));
    const counted=keys.reduce((sum,g)=>sum+(Number(grades[g])||0),0);
    const declaredTotal=Number(grades['Total exam entries'])||0;
    const total=Math.max(declaredTotal,counted);
    const mode=subjectMode[kind]||'count';
    const chips=keys.map(g=>{
      const display=gradeDisplay(g),paired=kind==='gcse'&&/combined science/i.test(subject.subject||'')&&/^\d{2}$/.test(String(g));
      const title=(paired?'Combined Science double award: grades '+display.replace('–',' and '):'Grade '+display)+' · click to switch count / percentage';
      const raw=Number(grades[g])||0;
      const value=mode==='percent'&&total?fmt(100*raw/total)+'%':fmt(raw);
      return '<button type="button" data-grade-toggle="'+esc(kind)+'" class="grade-chip tone-'+gradeTone(g)+(paired?' double-award':'')+'" title="'+esc(title)+'"><span class="grade-label">'+esc(display)+'</span><span class="grade-count">'+value+'</span></button>';
    }).join('');
    return '<div class="grade-chip-row">'+(chips||'<span class="muted">No unsuppressed grade counts</span>')+(total?'<span class="entry-total">'+fmt(total)+' entries</span>':'')+'</div>';
  }
  function subjectTable(subjects=[],kind,year='',meta={}){
    const mode=subjectMode[kind]||'count',switchLabel=mode==='count'?'Show %':'Show numbers';
    const controls='<div class="subject-mode-row"><span>'+esc(year)+(meta.source?' · '+esc(meta.source):'')+'</span><button type="button" data-grade-toggle="'+esc(kind)+'">'+switchLabel+'</button></div>';
    const noteBits=[];
    if(meta.note)noteBits.push('<p class="muted subject-source-note">'+esc(meta.note)+'</p>');
    if(meta.highlights?.length){
      noteBits.push('<div class="subject-highlights">'+meta.highlights.map(h=>'<span><b>'+esc(h.subject)+'</b>'+(h.grade9Percent!==undefined?' · 9: '+pct(h.grade9Percent):'')+(h.grade98Percent!==undefined?' · 9–8: '+pct(h.grade98Percent):'')+'</span>').join('')+'</div>');
    }
    if(!subjects.length)return controls+noteBits.join('')+'<p class="muted">No full subject-by-subject grade table is published for this school and year.</p>';
    const rows=subjects.map(s=>{
      const subjectName=(s.subject==='Other Modern Languages'&&s.subjectGroup)?s.subjectGroup:s.subject;
      const secondary=(s.subjectGroup&&s.subjectGroup!==subjectName&&s.subjectGroup!==s.subject)?' · '+s.subjectGroup:'';
      return '<tr><td>'+esc(subjectName)+esc(secondary)+'</td><td>'+esc(s.qualification||'')+'</td><td>'+gradeChips(s,kind)+'</td></tr>';
    }).join('');
    const note=kind==='gcse'?'<p class="muted grade-note"><b>How to read this:</b> grades run from 9 downward. “#” means grade awards, not pupils. Click any grade value or the toggle above to switch between counts and percentages within that subject.</p>':'<p class="muted grade-note">Click any grade value or the toggle above to switch between counts and percentages within that subject.</p>';
    return controls+noteBits.join('')+note+'<div class="subject-wrap"><table class="subject-table"><thead><tr><th>Subject</th><th>'+(kind==='gcse'?'Qualification':'')+'</th><th>Grades · highest first</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }

  function gradeProfileDetail(s){
    const m=latestSummary(s),pub=publishedForView(s),g=pub?.data?.gcse||{},year=m.grade9pct?.year||m.grade97pct?.year||g.year||'';
    if(!m.grade9pct&&!m.grade97pct)return '<p class="muted">No comparable whole-school GCSE top-grade profile is published for '+esc(selectedYear==='latest'?'the latest available year':selectedYear)+'.</p>';
    const cards=[];
    if(m.grade9pct)cards.push('<div><small>Grade 9</small><b>'+pct(m.grade9pct.value)+'</b><span>'+(m.grade9count?fmt(m.grade9count.value)+' grade awards':'percentage published')+'</span></div>');
    if(m.grade98pct)cards.push('<div><small>Grades 9–8</small><b>'+pct(m.grade98pct.value)+'</b><span>school-published headline</span></div>');
    if(m.grade97pct)cards.push('<div><small>Grades 9–7</small><b>'+pct(m.grade97pct.value)+'</b><span>'+(m.grade97count?fmt(m.grade97count.value)+' grade awards':'percentage published')+'</span></div>');
    const total=g.totalGradeAwards??m.grade9pct?.row?.totalGradeAwards;
    if(total)cards.push('<div><small>Total covered awards</small><b>'+fmt(total)+'</b><span>'+esc(yearLabel(year))+'</span></div>');
    const source=m.grade9pct?.source||m.grade97pct?.source||'DfE';
    const caution=source==='school-published'
      ? '<p class="source-note"><b>School-published · '+esc(yearLabel(year))+'.</b> Used because it is newer or materially more complete than the DfE independent-school performance-table extract.</p>'
      : '<p class="warning">Derived from DfE subject-level grade counts. For independent schools the DfE performance-table extract can omit IGCSEs or other non-counting qualifications, so incomplete extracts are not treated as whole-school results where a verified school source is available.</p>';
    return '<div class="context-grid grade-profile-grid">'+cards.join('')+'</div>'+caution+(g.note?'<p class="muted context-note">'+esc(g.note)+'</p>':'');
  }

  function contextDetail(s){
    const pc=s.context?.pupilCharacteristics||{},sen=s.context?.sen||{};
    if(!Object.keys(pc).length&&!Object.keys(sen).length)return '<p class="muted">No whole-school census context record matched this school.</p>';
    return '<div class="context-grid">'+
      '<div><small>Pupils</small><b>'+fmt(pc.headcount)+'</b><span>'+esc(pc.year||'')+'</span></div>'+
      '<div><small>FSM eligible</small><b>'+pct(pc.fsmPercent)+'</b><span>'+fmt(pc.fsmCount)+' pupils</span></div>'+
      '<div><small>EAL</small><b>'+pct(pc.ealPercent)+'</b><span>whole school</span></div>'+
      '<div><small>SEN support</small><b>'+pct(sen.senSupportPercent)+'</b><span>'+fmt(sen.senSupportCount)+' pupils</span></div>'+
      '<div><small>EHCP</small><b>'+pct(sen.ehcpPercent)+'</b><span>'+fmt(sen.ehcpCount)+' pupils</span></div>'+
      '<div><small>Any SEN</small><b>'+pct(sen.anySenPercent)+'</b><span>'+fmt(sen.anySenCount)+' pupils</span></div>'+
      '</div>'+
      (pc.phase||pc.admissionsPolicy?'<p class="muted context-note">'+esc(pc.phase||'')+(pc.phase&&pc.admissionsPolicy?' · ':'')+esc(pc.admissionsPolicy||'')+'</p>':'')+
      '<p class="warning"><b>Context, not a score:</b> these figures describe the pupil population and provision; they should not be interpreted as school quality measures.</p>';
  }

  function absenceHistory(s){
    const rows=years(s.context?.absence||{}).reverse().slice(0,5).map(y=>{
      const d=s.context.absence[y];
      return '<tr><td>'+yearLabel(y)+'</td><td>'+fmt(d.enrolments)+'</td><td>'+pct(d.overallAbsencePercent)+'</td><td>'+pct(d.unauthorisedAbsencePercent)+'</td><td>'+pct(d.persistentAbsencePercent)+'</td><td>'+pct(d.severeAbsencePercent)+'</td></tr>';
    }).join('');
    if(!rows)return '<p class="muted">No DfE full-year school-level absence record is available for this school. The official series covers state-funded primary, secondary and special schools, not independent schools.</p>';
    return '<div class="subject-wrap"><table class="year-table"><thead><tr><th>Year</th><th>Enrolments</th><th>Absence</th><th>Unauthorised</th><th>Persistent</th><th>Severe</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="muted context-note">Persistent = 10% or more sessions missed; severe = 50% or more.</p>';
  }

  function detailRow(s){
    const tr=document.createElement('tr');
    tr.className='detail-row';
    const td=document.createElement('td');
    td.colSpan=visibleColumnIds().length;
    const gcsePack=subjectPack(s,'gcse'),alevelPack=subjectPack(s,'alevel'),pub=publishedForView(s),pubA=pub?.data?.alevel;
    const publishedA=pubA?'<div class="published-result-strip"><b>School-published A-level '+esc(pub.year)+'</b>'+(pubA.astarPercent!==undefined?'<span>A* '+pct(pubA.astarPercent)+'</span>':'')+(pubA.astarAPercent!==undefined?'<span>A*/A '+pct(pubA.astarAPercent)+'</span>':'')+(pubA.candidates!==undefined?'<span>'+fmt(pubA.candidates)+' candidates</span>':'')+'</div>':'';
    const sourceLinks=[];
    if(pub?.data?.sources?.gcse)sourceLinks.push('<a href="'+esc(pub.data.sources.gcse)+'" target="_blank" rel="noopener">School GCSE source '+esc(pub.year)+' ↗</a>');
    if(pub?.data?.sources?.alevel)sourceLinks.push('<a href="'+esc(pub.data.sources.alevel)+'" target="_blank" rel="noopener">School A-level source '+esc(pub.year)+' ↗</a>');
    sourceLinks.push(
      '<a href="'+esc(doc.sources?.ks4_performance||'#')+'" target="_blank" rel="noopener">DfE KS4 performance source ↗</a>',
      '<a href="'+esc(doc.sources?.ks4_subjects||'#')+'" target="_blank" rel="noopener">DfE GCSE subject source ↗</a>',
      '<a href="'+esc(doc.sources?.alevel_performance||'#')+'" target="_blank" rel="noopener">DfE A-level source ↗</a>',
      '<a href="'+esc(doc.sources?.characteristics||'#')+'" target="_blank" rel="noopener">DfE pupil characteristics source ↗</a>',
      '<a href="'+esc(doc.sources?.sen||'#')+'" target="_blank" rel="noopener">DfE SEN source ↗</a>',
      '<a href="'+esc(doc.sources?.absence||'#')+'" target="_blank" rel="noopener">DfE absence source ↗</a>'
    );
    td.innerHTML=
      '<div class="detail-panel">'+publishedA+'<div class="detail-grid">'+
      '<section class="detail-card"><h3>GCSE top-grade profile</h3>'+gradeProfileDetail(s)+'</section>'+
      '<section class="detail-card"><h3>GCSE / KS4 history</h3>'+gcseHistory(s)+'</section>'+
      '<section class="detail-card"><h3>A-level history</h3>'+alevelHistory(s)+'</section>'+
      '<section class="detail-card"><h3>Whole-school context · 2025/26</h3>'+contextDetail(s)+'</section>'+
      '<section class="detail-card"><h3>Attendance history</h3>'+absenceHistory(s)+'</section>'+
      '<section class="detail-card detail-card-wide"><h3>GCSE subject detail · '+esc(gcsePack.year)+'</h3>'+subjectTable(gcsePack.subjects,'gcse',gcsePack.year,gcsePack)+'</section>'+
      '<section class="detail-card detail-card-wide"><h3>A-level subject detail · '+esc(alevelPack.year)+'</h3>'+subjectTable(alevelPack.subjects,'alevel',alevelPack.year,alevelPack)+'</section>'+
      '</div><div class="source-links">'+sourceLinks.join('')+'</div></div>';
    tr.append(td);
    return tr;
  }

  function applyColumnLayout(){
    saveColumnState();
    renderColumnDialog();
    render();
  }
  function moveColumn(id,delta){
    const i=columnState.order.indexOf(id),j=i+delta;
    if(i<0||j<0||j>=columnState.order.length)return;
    [columnState.order[i],columnState.order[j]]=[columnState.order[j],columnState.order[i]];
    applyColumnLayout();
  }
  function renderColumnDialog(){
    const list=$('#columnList');if(!list)return;
    list.innerHTML=columnState.order.map((id,i)=>{
      const visible=!columnState.hidden.includes(id);
      return '<div class="column-item" draggable="true" data-column-id="'+esc(id)+'"><span class="drag-handle" aria-hidden="true">☰</span><label><input type="checkbox" '+(visible?'checked':'')+'> <span>'+esc(COLUMN_LABELS[id]||id)+'</span></label><div class="column-move"><button type="button" data-move="-1" '+(i===0?'disabled':'')+' aria-label="Move '+esc(COLUMN_LABELS[id])+' left">←</button><button type="button" data-move="1" '+(i===columnState.order.length-1?'disabled':'')+' aria-label="Move '+esc(COLUMN_LABELS[id])+' right">→</button></div></div>';
    }).join('');
    let dragged='';
    list.querySelectorAll('.column-item').forEach(row=>{
      const id=row.dataset.columnId;
      row.querySelector('input').onchange=e=>{
        columnState.hidden=e.target.checked?columnState.hidden.filter(x=>x!==id):[...new Set([...columnState.hidden,id])];
        applyColumnLayout();
      };
      row.querySelectorAll('[data-move]').forEach(btn=>btn.onclick=()=>moveColumn(id,Number(btn.dataset.move)));
      row.ondragstart=()=>{dragged=id;row.classList.add('dragging')};
      row.ondragend=()=>{dragged='';row.classList.remove('dragging')};
      row.ondragover=e=>e.preventDefault();
      row.ondrop=e=>{
        e.preventDefault();
        if(!dragged||dragged===id)return;
        const from=columnState.order.indexOf(dragged),to=columnState.order.indexOf(id);
        if(from<0||to<0)return;
        const next=[...columnState.order];next.splice(from,1);next.splice(to,0,dragged);columnState.order=next;applyColumnLayout();
      };
    });
  }

  function updateCompareTray(){
    const tray=$('#compareTray');if(!tray)return;
    tray.hidden=selectedCompare.size===0;
    $('#compareCount').textContent=selectedCompare.size+' selected';
    $('#openCompare').disabled=selectedCompare.size<2;
  }
  const detailKind=id=>['grade9pct','grade9count','grade97pct','grade97count'].includes(id)?'gcse-subjects':['a8','engmath5','p8'].includes(id)?'gcse-history':id==='alevel'?'alevel':['fsm','wholeEal','sen','ehcp'].includes(id)?'context':['absence','persistent'].includes(id)?'attendance':'';
  const subjectName=s=>(s.subject==='Other Modern Languages'&&s.subjectGroup?s.subjectGroup:s.subject)+(s.subjectGroup&&s.subjectGroup!==s.subject&&s.subject!=='Other Modern Languages'?' · '+s.subjectGroup:'');
  const subjectFamily=raw=>{
    const source=String(raw||'').trim(),k=source.toLowerCase().replace(/&/g,'and').replace(/\s+/g,' ');
    if(/art|photograph|fine art|graphic communication/.test(k))return'Art & Other';
    if(/ancient history|classical civil|classical greek|greek \(classic\)|^greek$|^latin$/.test(k))return'Classics';
    if(k==='chinese')return'Chinese';
    if(k==='french'||k.includes('french language'))return'French';
    if(k==='spanish'||k.includes('spanish language'))return'Spanish';
    if(k==='german'||k.includes('german language'))return'German';
    if(/arabic|bengali|gujarati|hebrew|italian|japanese|persian|polish|portuguese|punjabi|russian|turkish|urdu|other modern languages/.test(k))return'Other Language';
    if(/^english($| language)/.test(k))return'English Language';
    if(/english lit/.test(k))return'English Literature';
    if(/mathematics|maths/.test(k))return'Mathematics';
    if(/chemistry/.test(k))return'Chemistry';
    if(/biology/.test(k))return'Biology';
    if(/physics/.test(k)&&!k.includes('electronics'))return'Physics';
    if(/combined science|science double award/.test(k))return'Combined Science';
    if(/other sciences|astronomy|geology|electronics \(physics\)/.test(k))return'Other Science';
    if(/computer science|^computing$/.test(k))return'Computer Science';
    if(/design and technology|design & technology|d&t|d & t|resistant materials|product design|electronics$|engineering/.test(k))return'Design & Technology';
    if(/drama|speech & drama/.test(k))return'Drama';
    if(/music/.test(k))return'Music';
    if(/physical education|sports studies|^sports($| ·)/.test(k))return'Physical Education';
    if(/food preparation|food technology|hospitality|catering/.test(k))return'Food & Nutrition';
    if(/film studies|media|multimedia/.test(k))return'Media & Film';
    if(/religious studies|religion/.test(k))return'Religious Studies';
    if(/social studies|psychology|sociology/.test(k))return'Social Sciences';
    if(/information and communication technology|computer appreciation/.test(k))return'ICT';
    return source.replace(/ · .+$/,'');
  };
  function completeSubjectPack(s,kind){
    const published=Object.entries(s.publishedResults||{}).sort((a,b)=>yearNumber(b[0])-yearNumber(a[0]));
    for(const [year,data] of published){const subjects=data?.[kind]?.subjectDetails;if(subjects?.length)return{year,subjects,source:'school-published'}}
    const subjects=kind==='gcse'?(s.gcseSubjects||[]):(s.alevelSubjects||[]);
    return{year:subjects.length?'2024/25':'',subjects,source:subjects.length?'DfE':'none'};
  }
  function groupSubjects(subjects=[]){
    const groups=new Map();
    for(const subject of subjects){
      const raw=subjectName(subject),name=subjectFamily(raw),existing=groups.get(name)||{subject:name,qualification:'comparison roll-up',grades:{},components:[]};
      existing.components.push({...subject,_rawName:raw});
      for(const [grade,value] of Object.entries(subject.grades||{}))existing.grades[grade]=(Number(existing.grades[grade])||0)+(Number(value)||0);
      groups.set(name,existing);
    }
    return groups;
  }
  function highestAchieved(grades={}){
    const keys=Object.keys(grades).filter(g=>g!=='Total exam entries'&&(Number(grades[g])||0)>0).sort((a,b)=>gradeRank(b)-gradeRank(a));
    const grade=keys[0];if(!grade)return null;
    const counted=Object.keys(grades).filter(g=>g!=='Total exam entries').reduce((n,g)=>n+(Number(grades[g])||0),0),total=Math.max(Number(grades['Total exam entries'])||0,counted);
    return{grade,count:Number(grades[grade])||0,total,percent:total?100*(Number(grades[grade])||0)/total:null};
  }
  function gradeStat(subject,kind){
    if(!subject)return '—';
    const grades=subject.grades||{},keys=Object.keys(grades).filter(g=>g!=='Total exam entries');
    const counted=keys.reduce((n,g)=>n+(Number(grades[g])||0),0),total=Math.max(Number(grades['Total exam entries'])||0,counted);
    if(!total)return '—';
    const top=highestAchieved(grades);
    if(kind==='gcse'){
      const g9=Number(grades['9'])||0,g97=g9+(Number(grades['8'])||0)+(Number(grades['7'])||0);
      const fallback=!g9&&top&&top.grade!=='9'?'<span class="next-grade">Highest: '+esc(gradeDisplay(top.grade))+' · '+pct(top.percent)+' ('+fmt(top.count)+')</span>':'';
      return '<span class="compare-stat"><b>9: '+pct(100*g9/total)+'</b><span>9–7: '+pct(100*g97/total)+' · '+fmt(total)+' entries</span>'+fallback+'</span>';
    }
    const astar=Number(grades['A*'])||0,a=Number(grades['A'])||0;
    const fallback=!astar&&top&&String(top.grade).toUpperCase()!=='A*'?'<span class="next-grade">Highest: '+esc(gradeDisplay(top.grade))+' · '+pct(top.percent)+' ('+fmt(top.count)+')</span>':'';
    return '<span class="compare-stat"><b>A*: '+pct(100*astar/total)+'</b><span>A*–A: '+pct(100*(astar+a)/total)+' · '+fmt(total)+' entries</span>'+fallback+'</span>';
  }
  const chosenSchools=()=>{
    const byName=new Map((doc.schools||[]).map(s=>[s.name,s])),index=new Map(compareOrder.map((name,i)=>[name,i]));
    return [...selectedCompare].map(name=>byName.get(name)).filter(Boolean).sort((a,b)=>(index.has(a.name)?index.get(a.name):1e9)-(index.has(b.name)?index.get(b.name):1e9)||a.name.localeCompare(b.name));
  };
  function rollupDetailRow(name,packs,index,kind){
    const any=packs.some(x=>(x.groups.get(name)?.components||[]).length>1||(x.groups.get(name)?.components||[]).some(s=>subjectFamily(s._rawName)!==s._rawName));
    if(!any)return'';
    return '<tr class="subject-component-row" data-family-detail="'+index+'" hidden><td colspan="'+(packs.length+1)+'"><div class="rollup-detail-grid">'+packs.map(x=>{
      const components=x.groups.get(name)?.components||[];
      return '<section><h4>'+esc(x.school.name)+'</h4>'+(components.length?components.map(s=>'<div class="source-subject-row"><b>'+esc(s._rawName)+'</b>'+gradeStat(s,kind)+'</div>').join(''):'<span class="muted">No '+esc(name)+' entry</span>')+'</section>';
    }).join('')+'</div></td></tr>';
  }
  function subjectDrilldown(chosen,kind){
    const packs=chosen.map(s=>{const pack=completeSubjectPack(s,kind);return{school:s,pack,groups:groupSubjects(pack.subjects)}});
    const names=[...new Set(packs.flatMap(x=>[...x.groups.keys()]))].sort((a,b)=>a.localeCompare(b));
    const title=kind==='gcse'?'GCSE subject comparison':'A-level subject comparison';
    const intro='Similar subject labels are combined only for comparison. Counts are summed before percentages are calculated; source records are never averaged or altered. Select a grouped subject to see every underlying subject and its original figures.';
    if(!names.length)return '<div class="compare-drill-head"><div><p class="eyebrow">'+title+'</p><h3>No subject detail available</h3></div></div>';
    const rows=names.map((name,i)=>{
      const variants=[...new Set(packs.flatMap(x=>(x.groups.get(name)?.components||[]).map(s=>s._rawName)))],grouped=variants.length>1||variants.some(v=>subjectFamily(v)!==v);
      const label=grouped?'<button type="button" class="subject-family-toggle" data-family-toggle="'+i+'" aria-expanded="false">'+esc(name)+' <span>⌄</span></button>':esc(name);
      const main='<tr><th>'+label+'</th>'+packs.map(x=>'<td>'+gradeStat(x.groups.get(name),kind)+'</td>').join('')+'</tr>';
      return main+rollupDetailRow(name,packs,i,kind);
    }).join('');
    return '<div class="compare-drill-head"><div><p class="eyebrow">'+title+'</p><h3>Subjects as the comparison metrics</h3><p>'+intro+'</p></div><button type="button" data-close-drill>Close detail</button></div>'+
      '<div class="compare-scroll"><table class="compare-table compare-detail-table"><thead><tr><th>Subject</th>'+packs.map(x=>'<th>'+esc(x.school.name)+'<small>'+esc(x.pack.year)+(x.pack.source==='school-published'?' · school':' · DfE')+'</small></th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function gcseHistoryDrilldown(chosen,id){
    const labels={a8:'Attainment 8',engmath5:'English & maths 5+',p8:'Progress 8'},field={a8:'attainment8',engmath5:'englishMaths5Plus',p8:'progress8'}[id];
    const yearSet=new Set();chosen.forEach(s=>Object.keys(s.gcse||{}).forEach(y=>yearSet.add(yearLabel(y))));
    const ys=[...yearSet].sort((a,b)=>yearNumber(b)-yearNumber(a));
    return '<div class="compare-drill-head"><div><p class="eyebrow">GCSE HISTORY</p><h3>'+esc(labels[id]||id)+'</h3><p>Year-by-year school-level values for the selected metric.</p></div><button type="button" data-close-drill>Close detail</button></div><div class="compare-scroll"><table class="compare-table compare-detail-table"><thead><tr><th>Year</th>'+chosen.map(s=>'<th>'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+ys.map(y=>'<tr><th>'+esc(y)+'</th>'+chosen.map(s=>{const d=s.gcse?.[compactYear(y)],v=d?.[field];return'<td>'+(v===null||v===undefined?'—':id==='engmath5'?pct(v):fmt(v))+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function contextDrilldown(chosen){
    const rows=[['Pupils',s=>s.context?.pupilCharacteristics?.headcount],['FSM eligible',s=>s.context?.pupilCharacteristics?.fsmPercent,true],['EAL',s=>s.context?.pupilCharacteristics?.ealPercent,true],['SEN support',s=>s.context?.sen?.senSupportPercent,true],['EHCP',s=>s.context?.sen?.ehcpPercent,true],['Any SEN',s=>s.context?.sen?.anySenPercent,true]];
    return '<div class="compare-drill-head"><div><p class="eyebrow">WHOLE-SCHOOL CONTEXT</p><h3>Context behind the headline metrics</h3></div><button type="button" data-close-drill>Close detail</button></div><div class="compare-scroll"><table class="compare-table compare-detail-table"><thead><tr><th>Metric</th>'+chosen.map(s=>'<th>'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(([label,get,isPct])=>'<tr><th>'+label+'</th>'+chosen.map(s=>'<td>'+((v=>v===null||v===undefined?'—':isPct?pct(v):fmt(v))(get(s)))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function attendanceDrilldown(chosen){
    const yearSet=new Set();chosen.forEach(s=>years(s.context?.absence||{}).slice(-5).forEach(y=>yearSet.add(y)));
    const ys=[...yearSet].sort().reverse();
    return '<div class="compare-drill-head"><div><p class="eyebrow">ATTENDANCE</p><h3>Attendance history</h3></div><button type="button" data-close-drill>Close detail</button></div><div class="compare-scroll"><table class="compare-table compare-detail-table"><thead><tr><th>Year</th>'+chosen.map(s=>'<th>'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+ys.map(y=>'<tr><th>'+esc(yearLabel(y))+'</th>'+chosen.map(s=>{const d=s.context?.absence?.[y];return '<td>'+(d?'<span class="compare-stat"><b>Absence '+pct(d.overallAbsencePercent)+'</b><span>Persistent '+pct(d.persistentAbsencePercent)+' · severe '+pct(d.severeAbsencePercent)+'</span></span>':'—')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function compareDrilldown(id){
    const chosen=chosenSchools(),kind=detailKind(id);
    if(kind==='gcse-subjects')return subjectDrilldown(chosen,'gcse');
    if(kind==='gcse-history')return gcseHistoryDrilldown(chosen,id);
    if(kind==='alevel')return subjectDrilldown(chosen,'alevel');
    if(kind==='context')return contextDrilldown(chosen);
    if(kind==='attendance')return attendanceDrilldown(chosen);
    return '<p class="muted">No deeper comparison is available for this metric.</p>';
  }
  function bindSubjectRollups(host){
    host.querySelectorAll('[data-family-toggle]').forEach(button=>button.onclick=()=>{
      const row=host.querySelector('[data-family-detail="'+button.dataset.familyToggle+'"]');if(!row)return;
      const open=row.hidden;row.hidden=!open;button.setAttribute('aria-expanded',String(open));button.querySelector('span').textContent=open?'⌃':'⌄';
    });
  }
  function saveCompareOrder(names){compareOrder=[...names,...compareOrder.filter(x=>!names.includes(x))];persistPerformancePrefs()}
  function bindCompareMatrix(){
    const host=$('#compareMatrix');if(!host)return;
    host.querySelectorAll('[data-open-metric]').forEach(cell=>{
      const open=()=>{
        const detail=host.querySelector('#compareDrilldown');detail.innerHTML=compareDrilldown(cell.dataset.openMetric);detail.hidden=false;bindSubjectRollups(detail);detail.scrollIntoView({behavior:'smooth',block:'start'});
        detail.querySelector('[data-close-drill]')?.addEventListener('click',()=>{detail.hidden=true;detail.innerHTML=''});
      };
      cell.onclick=e=>{if(e.target.closest('button,a,input'))return;open()};
      cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
    });
    let dragged='';
    host.querySelectorAll('th[data-compare-school]').forEach(th=>{
      th.ondragstart=()=>{dragged=th.dataset.compareSchool;th.classList.add('dragging')};
      th.ondragend=()=>{dragged='';th.classList.remove('dragging')};
      th.ondragover=e=>{if(dragged)e.preventDefault()};
      th.ondrop=e=>{
        e.preventDefault();const target=th.dataset.compareSchool;if(!dragged||!target||dragged===target)return;
        const names=chosenSchools().map(s=>s.name),from=names.indexOf(dragged),to=names.indexOf(target);if(from<0||to<0)return;
        names.splice(to,0,names.splice(from,1)[0]);saveCompareOrder(names);host.innerHTML=compareMatrix();bindCompareMatrix();
      };
    });
  }
  function compareMatrix(){
    const chosen=chosenSchools(),ids=visibleColumnIds().filter(id=>id!=='school');
    if(!chosen.length)return '<p class="muted">Select at least two schools.</p>';
    return '<p class="compare-click-hint">Select <span class="detail-icon" aria-hidden="true">↗</span> beside a metric when a deeper comparison is available. Drag school headings to rearrange them; the order is remembered.</p><div class="compare-scroll"><table class="compare-table"><thead><tr><th>Metric</th>'+chosen.map(s=>'<th draggable="true" data-compare-school="'+esc(s.name)+'" title="Drag to rearrange school columns">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+
      ids.map(id=>{const kind=detailKind(id),head=kind?'<th class="compare-metric-cell" tabindex="0" role="button" data-open-metric="'+esc(id)+'" title="Open detailed comparison">'+esc(COLUMN_LABELS[id]||id)+' <span class="detail-icon" aria-hidden="true">↗</span></th>':'<th>'+esc(COLUMN_LABELS[id]||id)+'</th>';return'<tr>'+head+chosen.map(s=>metricCell(id,s,latestSummary(s)).replace(/^<td[^>]*>|<\/td>$/g,'')).map(v=>'<td>'+v+'</td>').join('')+'</tr>'}).join('')+
      '</tbody></table></div><section id="compareDrilldown" class="compare-drilldown" hidden></section>';
  }

  function renderSchoolSets(){
    const select=$('#schoolSet');if(!select)return;
    const names=Object.keys(schoolSets).sort((a,b)=>a.localeCompare(b));
    if(activeSchoolSet&&!schoolSets[activeSchoolSet])activeSchoolSet='';
    select.innerHTML='<option value="">All schools</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+' · '+schoolSets[name].length+'</option>').join('');
    select.value=activeSchoolSet;
    const del=$('#deleteSchoolSet');if(del)del.hidden=!activeSchoolSet;
  }
  function saveSelectedSchoolSet(){
    const schools=chosenSchools().map(s=>s.name);
    if(!schools.length){alert('Select the schools you want in this set first.');return}
    const proposed=activeSchoolSet||'My school set',name=(prompt('Name this school set:',proposed)||'').trim();if(!name)return;
    schoolSets[name]=schools;persistPerformancePrefs();activeSchoolSet=name;renderSchoolSets();render();
  }
  function deleteActiveSchoolSet(){
    if(!activeSchoolSet)return;const name=activeSchoolSet;if(!confirm('Delete the saved school set “'+name+'”?'))return;
    delete schoolSets[name];persistPerformancePrefs();activeSchoolSet='';renderSchoolSets();render();
  }

  function render(){
    renderHead();
    let rows=(doc.schools||[]).filter(matches);
    const key=sortKey;
    if(key==='name')rows.sort((a,b)=>a.name.localeCompare(b.name)*(sortDir==='asc'?1:-1));
    else{
      const lowFirst=key==='absence'||key==='persistent';
      const direction=sortDir==='asc'?1:-1;
      rows.sort((a,b)=>{
        const av=score(a,key),bv=score(b,key);
        if(av===bv)return a.name.localeCompare(b.name);
        if(!Number.isFinite(av)&&!Number.isFinite(bv))return a.name.localeCompare(b.name);
        if(!Number.isFinite(av))return 1;if(!Number.isFinite(bv))return -1;
        return (av-bv)*direction;
      });
    }
    $('#perfCount').textContent=rows.length+' school'+(rows.length===1?'':'s');
    const tbody=$('#performanceRows');
    tbody.innerHTML='';
    rows.forEach(s=>{
      tbody.append(schoolRow(s));
      if(expanded===s.name)tbody.append(detailRow(s));
    });
    $('#performanceEmpty').hidden=rows.length>0;
    updateCompareTray();
  }

  function renderMethodology(){
    const m=doc.methodology||{};
    $('#methodology').innerHTML='<h2>Data coverage and caveats</h2><ul>'+Object.values(m).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  }
  function populateYearSelect(){
    const select=$('#perfYear');if(!select)return;
    const set=new Set();
    (doc.schools||[]).forEach(s=>{
      Object.keys(s.publishedResults||{}).forEach(y=>set.add(y));
      Object.keys(s.gcse||{}).forEach(y=>set.add(yearLabel(y)));
      Object.keys(s.alevel||{}).forEach(y=>set.add(yearLabel(y)));
    });
    const years=[...set].filter(Boolean).sort((a,b)=>yearNumber(b)-yearNumber(a));
    select.innerHTML='<option value="latest">Latest available</option>'+years.map(y=>'<option value="'+esc(y)+'">'+esc(y)+'</option>').join('');
    select.value=years.includes(selectedYear)?selectedYear:'latest';
    selectedYear=select.value;
  }

  $('#perfSearch').oninput=render;
  $('#perfSort').onchange=e=>{sortKey=e.target.value;sortDir=(sortKey==='name'||sortKey==='absence'||sortKey==='persistent')?'asc':'desc';render()};
  $('#perfYear').onchange=e=>{selectedYear=e.target.value;render()};
  $('#schoolSet').onchange=e=>{activeSchoolSet=e.target.value;renderSchoolSets();render()};
  $('#saveSchoolSet').onclick=saveSelectedSchoolSet;
  $('#deleteSchoolSet').onclick=deleteActiveSchoolSet;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-grade-toggle]');if(!b)return;e.stopPropagation();const kind=b.dataset.gradeToggle;if(!subjectMode[kind])return;subjectMode[kind]=subjectMode[kind]==='count'?'percent':'count';render()});
  $('#columnsButton').onclick=()=>{renderColumnDialog();$('#columnDialog').showModal()};
  $('#closeColumns').onclick=()=>$('#columnDialog').close();
  $('#doneColumns').onclick=()=>$('#columnDialog').close();
  $('#resetColumns').onclick=()=>{columnState={order:[...METRIC_COLUMNS],hidden:[]};applyColumnLayout()};
  $('#columnDialog').onclick=e=>{if(e.target.id==='columnDialog')e.target.close()};
  $('#clearCompare').onclick=()=>{selectedCompare.clear();render()};
  $('#openCompare').onclick=()=>{if(selectedCompare.size<2)return;$('#compareMatrix').innerHTML=compareMatrix();bindCompareMatrix();$('#compareDialog').showModal()};
  $('#closeCompare').onclick=()=>$('#compareDialog').close();
  $('#compareDialog').onclick=e=>{if(e.target.id==='compareDialog')e.target.close()};
  $('#perfChips').onclick=e=>{
    const f=e.target.dataset.filter;
    if(!f)return;
    filter=f;
    document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===e.target));
    render();
  };
  window.addEventListener('openday:cloud-state',e=>{
    const remote=e.detail||{},sets=remote.performanceSchoolSets,order=remote.performanceCompareOrder;
    if(sets&&typeof sets==='object'&&!Array.isArray(sets)){schoolSets=sets;state.performanceSchoolSets=sets;localStorage.setItem(schoolSetKey,JSON.stringify(sets))}
    if(Array.isArray(order)){compareOrder=order;state.performanceCompareOrder=order;localStorage.setItem(compareOrderKey,JSON.stringify(order))}
    renderSchoolSets();render();
  });

  Promise.all([
    fetch('data/performance.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Official performance dataset is still being prepared');return r.json()}),
    fetch('data/published-results.json',{cache:'no-store'}).then(r=>r.ok?r.json():{schools:{}}).catch(()=>({schools:{}}))
  ])
    .then(([x,published])=>{
      doc=x;
      (doc.schools||[]).forEach(s=>{s.publishedResults=published?.schools?.[s.name]||s.publishedResults||{}});
      if(published?.note)doc.methodology={...(doc.methodology||{}),schoolPublished:published.note};
      const matched=doc.schools.filter(s=>s.urn).length;
      $('#dataStatus').textContent='Updated '+new Date(doc.generatedAt).toLocaleString('en-GB')+' · '+matched+'/'+doc.schools.length+' tracked schools matched to a DfE performance record. Verified school-published results are layered on top where newer or more complete.';
      populateYearSelect();
      renderSchoolSets();
      renderMethodology();
      render();
      const hash=new URLSearchParams(location.hash.replace(/^#/,'')).get('school');
      if(hash){
        const s=doc.schools.find(x=>x.eventIds.includes(hash));
        if(s){
          expanded=s.name;
          render();
          setTimeout(()=>document.querySelector('[data-school="'+CSS.escape(s.name)+'"]')?.scrollIntoView({block:'center'}),0);
        }
      }
    })
    .catch(error=>{
      $('#dataStatus').textContent=error.message;
      $('#performanceRows').innerHTML='';
      $('#performanceEmpty').hidden=false;
    });
})();