(()=>{
  const $=s=>document.querySelector(s);
  let doc={schools:[]},filter='all',expanded='';
  const state=(()=>{try{return JSON.parse(localStorage.getItem('openDayState')||'{}')}catch{return{}}})();
  const visited=new Set(state.visitedSchools||[]),saved=new Set(state.saved||[]),booked=state.booked||{};
  const decisions=state.schoolDecisions||{};
  const layoutKey='openday.performance.columns.v1';
  const DEFAULT_COLUMNS=['school','gcseYear','grade9pct','grade9count','grade97pct','grade97count','a8','engmath5','p8','alevel','fsm','wholeEal','sen','ehcp','absence','persistent'];
  const COLUMN_LABELS={
    school:'School',gcseYear:'GCSE year',grade9pct:'Grade 9 %',grade9count:'Grade 9 #',grade97pct:'Grades 9–7 %',grade97count:'Grades 9–7 #',
    a8:'Attainment 8',engmath5:'Eng & maths 5+',p8:'P8 latest',alevel:'A-level',fsm:'FSM',wholeEal:'EAL',sen:'SEN support',ehcp:'EHCP',absence:'Absence',persistent:'PA'
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
    const fixed=num.toFixed(Math.abs(num)<10?2:1);
    return fixed.replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  };
  const pct=v=>v===null||v===undefined?'—':fmt(v)+'%';
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
  const eventFlag=(school,set)=>school.eventIds.some(id=>set.has(id));
  const decisionFlag=(school,value)=>school.eventIds.some(id=>decisions[id]===value);

  function latestSummary(s){
    const context=s.context||{},pc=context.pupilCharacteristics||{},sen=context.sen||{},gp=s.gcseGradeProfile||{};
    return{
      a8:latest(s.gcse,'attainment8'),
      em:latest(s.gcse,'englishMaths5Plus'),
      p8:latest(s.gcse,'progress8'),
      ks4Eal:latest(s.ks4Eal||{},null),
      al:latest(s.alevel,'aps'),
      grade9pct:gp.grade9Percent!==null&&gp.grade9Percent!==undefined?{year:gp.year||'2024/25',value:gp.grade9Percent,row:gp}:null,
      grade9count:gp.grade9Count!==null&&gp.grade9Count!==undefined?{year:gp.year||'2024/25',value:gp.grade9Count,row:gp}:null,
      grade97pct:gp.grade97Percent!==null&&gp.grade97Percent!==undefined?{year:gp.year||'2024/25',value:gp.grade97Percent,row:gp}:null,
      grade97count:gp.grade97Count!==null&&gp.grade97Count!==undefined?{year:gp.year||'2024/25',value:gp.grade97Count,row:gp}:null,
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
    if(key==='grade97pct')return m.grade97pct?.value??-Infinity;
    if(key==='attainment8')return m.a8?.value??-Infinity;
    if(key==='engmath5')return m.em?.value??-Infinity;
    if(key==='progress8')return m.p8?.value??-Infinity;
    if(key==='alevel')return m.al?.value??-Infinity;
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
    const priority=['English Language','Mathematics','Biology'];
    const subjects=[...(s.gcseSubjects||[])].sort((a,b)=>{
      const ai=priority.indexOf(a.subject),bi=priority.indexOf(b.subject);
      return (ai<0?99:ai)-(bi<0?99:bi)||a.subject.localeCompare(b.subject);
    }).slice(0,3);
    return '<b>'+esc(s.name)+'</b><br>'+
      '<b>Grade 9:</b> '+(m.grade9pct?pct(m.grade9pct.value)+' ('+fmt(m.grade9count?.value)+' published awards)':'—')+
      ' · <b>9–7:</b> '+(m.grade97pct?pct(m.grade97pct.value)+' ('+fmt(m.grade97count?.value)+')':'—')+'<br>'+
      'Latest A8: '+(m.a8?fmt(m.a8.value):'not available')+
      ' · Eng/maths 5+: '+(m.em?(s.type==='independent'&&Number(m.em.value)===0?'n/a†':pct(m.em.value)):'—')+'<br>'+
      'P8 latest: '+(m.p8?fmt(m.p8.value)+' ('+yearLabel(m.p8.year)+')':'not available')+'<br>'+
      'A-level: '+(m.al?(m.al.row.averageGrade||fmt(m.al.value)):'—')+'<br>'+
      'FSM: '+(m.fsm?pct(m.fsm.value):'—')+' · EAL: '+(m.wholeEal?pct(m.wholeEal.value):'—')+
      ' · SEN support: '+(m.sen?pct(m.sen.value):'—')+' · EHCP: '+(m.ehcp?pct(m.ehcp.value):'—')+'<br>'+
      'Absence: '+(m.absence?pct(m.absence.value):'—')+' · persistent absence: '+(m.persistent?pct(m.persistent.value):'—')+
      (subjects.length?'<br><b>2024/25 subjects</b>':'')+
      subjects.map(subjectHoverLine).join('')+
      '<br><span style="opacity:.7">Click/tap for full year-by-year and subject tables.</span>';
  }

  function schoolCell(s,m){
    const isVisited=eventFlag(s,visited),isSaved=eventFlag(s,saved);
    return '<td><span class="school-name">'+esc(s.name)+'</span>'+
      '<span class="school-meta">'+esc(s.area||'')+' · '+esc(String(s.type||'').replace('-',' '))+'</span>'+
      '<span class="school-flags">'+
      (isVisited?'<span class="tag visited">visited</span>':'')+
      (isSaved?'<span class="tag saved">saved</span>':'')+
      '</span><div class="hover-card">'+hoverText(s,m)+'</div></td>';
  }

  function metricCell(id,s,m){
    const profile=s.gcseGradeProfile||{};
    let html='—';
    if(id==='gcseYear')html=m.a8?yearLabel(m.a8.year):profile.year||'—';
    else if(id==='grade9pct')html=m.grade9pct?'<span class="headline-grade grade-chip tone-top"><span class="grade-label">9</span><span class="grade-count">'+pct(m.grade9pct.value)+'</span></span>':'—';
    else if(id==='grade9count')html=m.grade9count?fmt(m.grade9count.value):'—';
    else if(id==='grade97pct')html=m.grade97pct?'<span class="headline-grade grade-chip tone-high"><span class="grade-label">9–7</span><span class="grade-count">'+pct(m.grade97pct.value)+'</span></span>':'—';
    else if(id==='grade97count')html=m.grade97count?fmt(m.grade97count.value):'—';
    else if(id==='a8')html=m.a8?fmt(m.a8.value):'—';
    else if(id==='engmath5')html=m.em?(s.type==='independent'&&Number(m.em.value)===0?'n/a†':pct(m.em.value)):'—';
    else if(id==='p8')html=m.p8?fmt(m.p8.value)+' <span class="muted">('+yearLabel(m.p8.year)+')</span>':'—';
    else if(id==='alevel')html=m.al?esc(m.al.row.averageGrade||fmt(m.al.value))+' <span class="muted">('+yearLabel(m.al.year)+')</span>':'—';
    else if(id==='fsm')html=m.fsm?pct(m.fsm.value):'—';
    else if(id==='wholeEal')html=m.wholeEal?pct(m.wholeEal.value):'—';
    else if(id==='sen')html=m.sen?pct(m.sen.value):'—';
    else if(id==='ehcp')html=m.ehcp?pct(m.ehcp.value):'—';
    else if(id==='absence')html=m.absence?pct(m.absence.value)+' <span class="muted">('+yearLabel(m.absence.year)+')</span>':'—';
    else if(id==='persistent')html=m.persistent?pct(m.persistent.value)+' <span class="muted">('+yearLabel(m.persistent.year)+')</span>':'—';
    return '<td class="metric metric-'+esc(id)+'">'+html+'</td>';
  }

  function renderHead(){
    const ids=visibleColumnIds();
    $('#performanceHead').innerHTML=ids.map(id=>'<th data-column="'+esc(id)+'">'+esc(COLUMN_LABELS[id]||id)+'</th>').join('');
    const table=document.querySelector('.performance-table');
    if(table)table.style.minWidth=Math.max(760,250+(ids.length-1)*105)+'px';
  }

  function schoolRow(s){
    const m=latestSummary(s),tr=document.createElement('tr');
    tr.className='school-row';
    tr.dataset.school=s.name;
    tr.innerHTML=visibleColumnIds().map(id=>id==='school'?schoolCell(s,m):metricCell(id,s,m)).join('');
    tr.onclick=()=>{expanded=expanded===s.name?'':s.name;render()};
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

  function subjectTable(subjects=[],kind){
    if(!subjects.length)return '<p class="muted">No subject-level record matched this school in the latest DfE file.</p>';
    const rows=subjects.map(s=>{
      const grades=Object.entries(s.grades||{}).map(([g,v])=>g+': '+v).join(' · ');
      return '<tr><td>'+esc(s.subject)+'</td><td>'+esc(s.qualification||'')+'</td><td>'+esc(grades||'—')+'</td></tr>';
    }).join('');
    return '<div class="subject-wrap"><table class="subject-table"><thead><tr><th>Subject</th><th>'+(kind==='gcse'?'Qualification':'')+'</th><th>Published grade counts</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
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
    td.colSpan=12;
    td.innerHTML=
      '<div class="detail-panel"><div class="detail-grid">'+
      '<section class="detail-card"><h3>GCSE / KS4 history</h3>'+gcseHistory(s)+'</section>'+
      '<section class="detail-card"><h3>A-level history</h3>'+alevelHistory(s)+'</section>'+
      '<section class="detail-card"><h3>Whole-school context · 2025/26</h3>'+contextDetail(s)+'</section>'+
      '<section class="detail-card"><h3>Attendance history</h3>'+absenceHistory(s)+'</section>'+
      '<section class="detail-card"><h3>GCSE subject detail · latest published year</h3>'+subjectTable(s.gcseSubjects,'gcse')+'</section>'+
      '<section class="detail-card"><h3>A-level subject detail · latest published year</h3>'+subjectTable(s.alevelSubjects,'alevel')+'</section>'+
      '</div><div class="source-links">'+
      '<a href="'+esc(doc.sources?.ks4_performance||'#')+'" target="_blank" rel="noopener">DfE KS4 performance source ↗</a>'+
      '<a href="'+esc(doc.sources?.ks4_subjects||'#')+'" target="_blank" rel="noopener">DfE GCSE subject source ↗</a>'+
      '<a href="'+esc(doc.sources?.alevel_performance||'#')+'" target="_blank" rel="noopener">DfE A-level source ↗</a>'+
      '<a href="'+esc(doc.sources?.characteristics||'#')+'" target="_blank" rel="noopener">DfE pupil characteristics source ↗</a>'+
      '<a href="'+esc(doc.sources?.sen||'#')+'" target="_blank" rel="noopener">DfE SEN source ↗</a>'+
      '<a href="'+esc(doc.sources?.absence||'#')+'" target="_blank" rel="noopener">DfE absence source ↗</a>'+
      '</div></div>';
    tr.append(td);
    return tr;
  }

  function render(){
    let rows=(doc.schools||[]).filter(matches);
    const sort=$('#perfSort').value;
    if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sort==='absence'||sort==='persistent')rows.sort((a,b)=>score(a,sort)-score(b,sort)||a.name.localeCompare(b.name));
    else rows.sort((a,b)=>score(b,sort)-score(a,sort)||a.name.localeCompare(b.name));
    $('#perfCount').textContent=rows.length+' school'+(rows.length===1?'':'s');
    const tbody=$('#performanceRows');
    tbody.innerHTML='';
    rows.forEach(s=>{
      tbody.append(schoolRow(s));
      if(expanded===s.name)tbody.append(detailRow(s));
    });
    $('#performanceEmpty').hidden=rows.length>0;
  }

  function renderMethodology(){
    const m=doc.methodology||{};
    $('#methodology').innerHTML='<h2>Data coverage and caveats</h2><ul>'+Object.values(m).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  }

  $('#perfSearch').oninput=render;
  $('#perfSort').onchange=render;
  $('#perfChips').onclick=e=>{
    const f=e.target.dataset.filter;
    if(!f)return;
    filter=f;
    document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===e.target));
    render();
  };

  fetch('data/performance.json',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw Error('Official performance dataset is still being prepared');return r.json()})
    .then(x=>{
      doc=x;
      const matched=doc.schools.filter(s=>s.urn).length;
      $('#dataStatus').textContent='Updated '+new Date(doc.generatedAt).toLocaleString('en-GB')+' · '+matched+'/'+doc.schools.length+' tracked schools matched to a DfE performance record.';
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