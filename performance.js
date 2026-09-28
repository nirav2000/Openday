(()=>{
  const $=s=>document.querySelector(s);
  let doc={schools:[]},filter='all',expanded='';
  const state=(()=>{try{return JSON.parse(localStorage.getItem('openDayState')||'{}')}catch{return{}}})();
  const visited=new Set(state.visitedSchools||[]),saved=new Set(state.saved||[]);
  const decisions=state.schoolDecisions||{};

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
    return{
      a8:latest(s.gcse,'attainment8'),
      em:latest(s.gcse,'englishMaths5Plus'),
      p8:latest(s.gcse,'progress8'),
      eal:latest(s.ks4Eal||{},null),
      al:latest(s.alevel,'aps')
    };
  }

  function matches(s){
    const q=$('#perfSearch').value.trim().toLowerCase();
    if(q&&!(String(s.name)+' '+String(s.area)+' '+String(s.type)).toLowerCase().includes(q))return false;
    if(filter==='visited')return eventFlag(s,visited);
    if(filter==='saved')return eventFlag(s,saved);
    if(filter==='liked')return decisionFlag(s,'liked');
    if(filter==='try-for')return decisionFlag(s,'try-for');
    if(filter==='state')return ['state','part-selective'].includes(s.type);
    if(filter==='grammar')return s.type==='grammar';
    if(filter==='independent')return s.type==='independent';
    if(filter==='has-gcse')return years(s.gcse).length>0;
    if(filter==='has-alevel')return years(s.alevel).length>0;
    return true;
  }

  function score(s,key){
    const m=latestSummary(s);
    if(key==='attainment8')return m.a8?.value??-Infinity;
    if(key==='engmath5')return m.em?.value??-Infinity;
    if(key==='progress8')return m.p8?.value??-Infinity;
    if(key==='alevel')return m.al?.value??-Infinity;
    if(key==='eal')return m.eal?.value??-Infinity;
    return 0;
  }

  function hoverText(s,m){
    return '<b>'+esc(s.name)+'</b><br>'+
      'Latest A8: '+(m.a8?fmt(m.a8.value):'not available')+
      ' · Eng/maths 5+: '+(m.em?pct(m.em.value):'—')+'<br>'+
      'P8 latest: '+(m.p8?fmt(m.p8.value)+' ('+yearLabel(m.p8.year)+')':'not available')+'<br>'+
      'A-level: '+(m.al?(m.al.row.averageGrade||fmt(m.al.value)):'—')+
      '<br><span style="opacity:.75">Click/tap for history and subject detail.</span>';
  }

  function schoolRow(s){
    const m=latestSummary(s),isVisited=eventFlag(s,visited),isSaved=eventFlag(s,saved);
    const tr=document.createElement('tr');
    tr.className='school-row';
    tr.dataset.school=s.name;
    tr.innerHTML=
      '<td><span class="school-name">'+esc(s.name)+'</span>'+
      '<span class="school-meta">'+esc(s.area||'')+' · '+esc(String(s.type||'').replace('-',' '))+'</span>'+
      '<span class="school-flags">'+
      (isVisited?'<span class="tag visited">visited</span>':'')+
      (isSaved?'<span class="tag saved">saved</span>':'')+
      '</span><div class="hover-card">'+hoverText(s,m)+'</div></td>'+
      '<td class="metric">'+(m.a8?yearLabel(m.a8.year):'—')+'</td>'+
      '<td class="metric">'+(m.a8?fmt(m.a8.value):'—')+'</td>'+
      '<td class="metric">'+(m.em?pct(m.em.value):'—')+'</td>'+
      '<td class="metric">'+(m.p8?fmt(m.p8.value)+' <span class="muted">('+yearLabel(m.p8.year)+')</span>':'—')+'</td>'+
      '<td class="metric">'+(m.eal?pct(m.eal.value):'—')+'</td>'+
      '<td class="metric">'+(m.al?(esc(m.al.row.averageGrade||fmt(m.al.value)))+' <span class="muted">('+yearLabel(m.al.year)+')</span>':'—')+'</td>';
    tr.onclick=()=>{expanded=expanded===s.name?'':s.name;render()};
    return tr;
  }

  function gcseHistory(s){
    const rows=(s.gcseFiveYearWindow||[]).map(x=>{
      const d=x.data;
      const key=String(x.year||'').replace('/','');
      return '<tr>'+
        '<td>'+esc(x.year)+'</td>'+
        '<td>'+(d?fmt(d.attainment8):'—')+'</td>'+
        '<td>'+(d?pct(d.englishMaths5Plus):'—')+'</td>'+
        '<td>'+(d&&d.progress8!==null&&d.progress8!==undefined?fmt(d.progress8):'—')+'</td>'+
        '<td>'+(d?pct(d.ebaccEntry):'—')+'</td>'+
        '<td>'+(s.ks4Eal?.[key]!==undefined?pct(s.ks4Eal[key]):'—')+'</td>'+
        '</tr>';
    }).join('');
    return '<div class="subject-wrap"><table class="year-table"><thead><tr><th>Year</th><th>A8</th><th>Eng/math 5+</th><th>P8</th><th>EBacc entry</th><th>KS4 EAL</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<p class="warning">2020/21 has no comparable exam series. The current DfE institution API exposes school-level KS4 performance from 2022/23; 2021/22 is left as a transparent gap rather than silently substituting another series.</p>';
  }

  function alevelHistory(s){
    const rows=(s.alevelWindow||[]).map(x=>{
      const d=x.data;
      return '<tr><td>'+esc(x.year)+'</td><td>'+(d?esc(d.averageGrade||'—'):'—')+'</td><td>'+(d?fmt(d.aps):'—')+'</td><td>'+(d?fmt(d.valueAdded):'—')+'</td><td>'+(d?pct(d.aabPercent):'—')+'</td></tr>';
    }).join('');
    return '<div class="subject-wrap"><table class="year-table"><thead><tr><th>Year</th><th>Avg grade</th><th>APS</th><th>Value added</th><th>≥AAB</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">No DfE A-level institution data found.</td></tr>')+'</tbody></table></div>';
  }

  function subjectTable(subjects=[],kind){
    if(!subjects.length)return '<p class="muted">No subject-level record matched this school in the latest DfE file.</p>';
    const rows=subjects.map(s=>{
      const grades=Object.entries(s.grades||{}).map(([g,v])=>g+': '+v).join(' · ');
      return '<tr><td>'+esc(s.subject)+'</td><td>'+esc(s.qualification||'')+'</td><td>'+esc(grades||'—')+'</td></tr>';
    }).join('');
    return '<div class="subject-wrap"><table class="subject-table"><thead><tr><th>Subject</th><th>'+(kind==='gcse'?'Qualification':'')+'</th><th>Published grade counts</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }

  function detailRow(s){
    const tr=document.createElement('tr');
    tr.className='detail-row';
    const td=document.createElement('td');
    td.colSpan=7;
    td.innerHTML=
      '<div class="detail-panel"><div class="detail-grid">'+
      '<section class="detail-card"><h3>GCSE / KS4 history</h3>'+gcseHistory(s)+'</section>'+
      '<section class="detail-card"><h3>A-level history</h3>'+alevelHistory(s)+'</section>'+
      '<section class="detail-card"><h3>GCSE subject detail · latest published year</h3>'+subjectTable(s.gcseSubjects,'gcse')+'</section>'+
      '<section class="detail-card"><h3>A-level subject detail · latest published year</h3>'+subjectTable(s.alevelSubjects,'alevel')+'</section>'+
      '</div><div class="source-links">'+
      '<a href="'+esc(doc.sources?.ks4_performance||'#')+'" target="_blank" rel="noopener">DfE KS4 performance source ↗</a>'+
      '<a href="'+esc(doc.sources?.ks4_subjects||'#')+'" target="_blank" rel="noopener">DfE GCSE subject source ↗</a>'+
      '<a href="'+esc(doc.sources?.alevel_performance||'#')+'" target="_blank" rel="noopener">DfE A-level source ↗</a>'+
      '</div></div>';
    tr.append(td);
    return tr;
  }

  function render(){
    let rows=(doc.schools||[]).filter(matches);
    const sort=$('#perfSort').value;
    if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name));
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