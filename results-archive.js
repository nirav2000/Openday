(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let archive={snapshots:[]};
  const params=new URLSearchParams(location.search);
  const schoolParam=params.get('school')||'',yearParam=params.get('year')||'',kindParam=params.get('kind')||'';
  const gradeOrder={gcse:['9','8','7','6','5','4','3','2','1','U'],alevel:['A*','A','B','C','D','E','U']};
  const total=s=>Number(s?.grades?.['Total exam entries'])||Object.entries(s?.grades||{}).filter(([k])=>k!=='Total exam entries').reduce((n,[,v])=>n+(Number(v)||0),0);
  function table(snapshot,kind){
    const block=snapshot[kind];if(!block?.subjectDetails?.length)return'';
    const grades=gradeOrder[kind],label=kind==='gcse'?'GCSE / IGCSE':'A-level';
    const head='<tr><th>Subject</th><th>Qualification</th><th>Entries</th>'+grades.map(g=>'<th>'+esc(g)+'</th>').join('')+'</tr>';
    const rows=block.subjectDetails.map(s=>'<tr><td>'+esc(s.subject)+'</td><td>'+esc(s.qualification||'—')+'</td><td>'+total(s)+'</td>'+grades.map(g=>'<td>'+(s.grades?.[g]??'—')+'</td>').join('')+'</tr>').join('');
    return '<section class="qualification"><h3>'+label+(block.cohort?' · '+block.cohort+' pupils':'')+'</h3><div class="archive-table-wrap"><table class="archive-table"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div></section>';
  }
  function card(s){
    const links=Object.entries(s.sourceUrls||{}).map(([k,url])=>'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(k.replace(/([A-Z])/g,' $1'))+' ↗</a>').join(' · ');
    return '<article class="snapshot"><div class="snapshot-head"><div><p class="eyebrow">Archived snapshot</p><h2>'+esc(s.school)+'</h2><div class="snapshot-meta"><span>'+esc(s.year)+'</span><span>'+esc(s.sourceType||'school-published')+'</span><span>captured '+esc(s.capturedAt||'—')+'</span></div></div><div>'+links+'</div></div>'+
      (s.sourceDocument?.notes?'<p class="source-note">'+esc(s.sourceDocument.notes)+'</p>':'')+
      table(s,'gcse')+table(s,'alevel')+'</article>';
  }
  function render(){
    const school=$('#archiveSchool').value,year=$('#archiveYear').value,kind=$('#archiveKind').value;
    const rows=(archive.snapshots||[]).filter(s=>(!school||s.school===school)&&(!year||s.year===year)&&(!kind||s[kind]));
    $('#archiveList').innerHTML=rows.map(card).join('');$('#archiveEmpty').hidden=rows.length>0;
  }
  fetch('data/school-results-archive.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{
    archive=x;
    const schools=[...new Set(x.snapshots.map(s=>s.school))].sort(),years=[...new Set(x.snapshots.map(s=>s.year))].sort().reverse();
    $('#archiveSchool').innerHTML='<option value="">All archived schools</option>'+schools.map(s=>'<option>'+esc(s)+'</option>').join('');
    $('#archiveYear').innerHTML='<option value="">All years</option>'+years.map(y=>'<option>'+esc(y)+'</option>').join('');
    if(schoolParam&&schools.includes(schoolParam))$('#archiveSchool').value=schoolParam;
    if(yearParam&&years.includes(yearParam))$('#archiveYear').value=yearParam;
    if(['gcse','alevel'].includes(kindParam))$('#archiveKind').value=kindParam;
    ['archiveSchool','archiveYear','archiveKind'].forEach(id=>$('#'+id).onchange=render);render();
  }).catch(err=>{$('#archiveList').innerHTML='<article class="snapshot"><h2>Archive unavailable</h2><p>'+esc(err.message)+'</p></article>'});
})();