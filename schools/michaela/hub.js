'use strict';
(() => {
  const page = document.body.dataset.page || 'index';
  const titles = {index:'Research overview',staff:'Historical teacher register',results:'Results & context',curriculum:'Curriculum & timetable',concerns:'Concerns & trade-offs',books:'Books & resources',history:'Website history',alternatives:'Admissions & alternatives','home-learning':'Learning at home','research-checks':'Evidence checks'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const link = (title, url) => `<a href="${esc(url)}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(title)}</a>`;
  const links = list => `<div class="links">${(list || []).map(item => link(item[0],item[1])).join('')}</div>`;
  const get = async url => { const response = await fetch(url, {cache:'no-cache'}); if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`); return response.json(); };
  const main = document.getElementById('content');
  document.getElementById('navigation').innerHTML = Object.entries(titles).map(([id,title]) => `<a href="${id === 'index' ? './' : id+'.html'}"${id === page ? ' aria-current="page"' : ''}>${esc(title)}</a>`).join('');
  document.getElementById('pageTitle').textContent = titles[page] || titles.index;
  document.title = `${titles[page] || titles.index} | Michaela | Openday`;
  function section(block) {
    return `<section class="panel"${block.id ? ` id="${esc(block.id)}"` : ''}>${block.status ? `<div class="status-line">${esc(block.status)}</div>` : ''}<h2>${esc(block.title)}</h2>${(block.body || []).map(text => `<p>${esc(text)}</p>`).join('')}${block.items ? `<ul>${block.items.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}${block.table ? table(block.table.headers,block.table.rows,block.table.caption) : ''}${links(block.links)}${block.question ? `<div class="notice"><strong>Ask on a visit:</strong> ${esc(block.question)}</div>` : ''}</section>`;
  }
  function table(headers, rows, caption='') {
    return `<div class="table-wrap"><table>${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function readStaff(base, changes) {
    if (!Array.isArray(base.records) || !Array.isArray(base.columns)) throw new Error('Staff data schema is invalid');
    const records = base.records.map(row => Object.assign(Object.fromEntries(base.columns.map((key,index) => [key,row[index] || ''])),changes.records[row[0]] || {}));
    if (records.length !== 85 || new Set(records.map(r => r.id)).size !== records.length) throw new Error('The restored 85-entry register failed its integrity check');
    const sources = {...base.sources,...changes.sources};
    for (const record of records) {
      record.sources = [...new Set(record.sources.split(' ').filter(Boolean))].join(' ');
      for (const id of record.sources.split(' ').filter(Boolean)) if (!sources[id]) throw new Error(`Missing source ${id} for ${record.id}`);
    }
    return {records,sources};
  }
  function personCard(p, sources) {
    const fields = [['Subject / teaching area',p.subjects],['Roles',p.roles],['Academic qualifications',p.academic],['Teaching qualification / training',p.professional],['Arrival evidence',p.arrival],['Departure evidence',p.departure],['First public evidence',p.firstEvidence],['Last Michaela evidence',p.lastEvidence],['Latest documented work',p.latest],['Date / recency of latest role',p.latestDate]];
    return `<details class="person" id="${esc(p.id)}"><summary><span class="name">${esc(p.name)}</span><span class="subject">${esc(p.subjects)}</span><span class="tag${p.kind !== 'Named teacher / leader' ? ' caution' : ''}">${esc(p.kind)}</span><span class="meta">Evidence: ${esc(p.firstEvidence)} - ${esc(p.lastEvidence)}</span></summary><div class="person-body"><dl>${fields.map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(v || 'Not established from the reviewed public sources')}</dd>`).join('')}</dl>${p.notes ? `<div class="notice">${esc(p.notes)}</div>` : ''}<h4>Evidence and provenance</h4><ol class="evidence">${p.sources.split(' ').filter(Boolean).map(id => {const s=sources[id];return `<li>${link(s.title,s.url)} <span class="meta">[${esc(id)}] ${esc(s.date)}</span><p>${esc(s.basis)}</p></li>`;}).join('')}</ol>${link('Link to this record','staff.html#'+p.id)}</div></details>`;
  }
  function staffView(data) {
    const {records,sources}=data;
    const subjects=[...new Set(records.flatMap(p => p.subjects.split(';').map(x => x.trim())).filter(s => s && s !== 'Not established'))].sort();
    const kinds=[...new Set(records.map(p => p.kind))].sort();
    main.innerHTML=`<p class="lede">The recovered register is now here: all 85 name entries, with subjects, qualifications, employment evidence and later professional destinations where established.</p><div class="notice"><strong>85 entries is not 85 distinct teachers.</strong> The register includes four teaching fellows, thirteen entries without a recovered first name (including Mr Rees), and two possible duplicate pairs. It is a historical public-source reconstruction, not a payroll census or a current staff list.</div><div class="tiles"><div class="tile"><b>85</b><span>Historical name entries</span></div><div class="tile"><b>${records.filter(p => p.academic).length}</b><span>Entries with academic details</span></div><div class="tile"><b>${records.filter(p => p.professional).length}</b><span>Entries with training details</span></div><div class="tile"><b>${Object.keys(sources).length}</b><span>Source records after corrections</span></div></div><section class="panel"><h2>Find a teacher</h2><div class="controls"><label>Search all profile fields<input id="staffSearch" type="search" placeholder="Name, subject, university or employer" autocomplete="off"></label><label>Subject<select id="subjectFilter"><option value="">All subjects</option>${subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select></label><label>Record type<select id="kindFilter"><option value="">All record types</option>${kinds.map(s => `<option>${esc(s)}</option>`).join('')}</select></label></div><div class="toolbar"><p id="staffCount" role="status" aria-live="polite"></p><div><button class="secondary" id="resetStaff">Clear filters</button> <button id="exportStaff">Export filtered CSV</button></div></div><p class="meta">Open a name for its full profile and source links. A first or last mention is not a hire or leaving date. Missing qualifications mean unknown, not unqualified. Some later-role biographies are undated and could be stale.</p></section><div id="staffRows" class="staff-list"></div><section class="panel" style="margin-top:24px"><h2>What the evidence can and cannot tell us</h2><p>The 2016 and 2019 pages are broad staff lists; the 2020 and 2022 pages list only senior leaders; the 2021 page covers sixth-form staff. Changes in page scope cannot be used to calculate teacher turnover. Only explicit statements support an actual joining or departure date.</p><p>Historical profiles were recovered from the original research extractions. Archive access can be intermittent; the precise capture links are retained. New employer checks and corrections have their own dates. All 85 entries remain visible, including unresolved records.</p>${links([['Original restored data','staff.json'],['Dated corrections','staff-corrections.json'],['Research method and change log','history.html']])}</section>`;
    let filtered=records;
    function render() {
      const q=document.getElementById('staffSearch').value.toLowerCase().trim();
      const subject=document.getElementById('subjectFilter').value;
      const kind=document.getElementById('kindFilter').value;
      filtered=records.filter(p => (!q || Object.values(p).join(' ').toLowerCase().includes(q)) && (!subject || p.subjects.split(';').map(s=>s.trim()).includes(subject)) && (!kind || p.kind === kind));
      document.getElementById('staffCount').textContent=`${filtered.length} of ${records.length} entries`;
      document.getElementById('staffRows').innerHTML=filtered.length ? filtered.map(p => personCard(p,sources)).join('') : '<p class="empty">No matching entries. Clear the filters to see all 85.</p>';
    }
    ['staffSearch','subjectFilter','kindFilter'].forEach(id => document.getElementById(id).addEventListener(id === 'staffSearch' ? 'input' : 'change',render));
    document.getElementById('resetStaff').addEventListener('click',()=>{['staffSearch','subjectFilter','kindFilter'].forEach(id=>{document.getElementById(id).value='';});render();document.getElementById('staffSearch').focus();});
    document.getElementById('exportStaff').addEventListener('click',()=>{
      const cols=['id','name','kind','subjects','roles','academic','professional','arrival','departure','firstEvidence','lastEvidence','latest','latestDate','notes','sources'];
      const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
      const text=[cols,...filtered.map(p=>cols.map(k=>k === 'sources' ? p.sources.split(' ').map(id=>sources[id].url).join(' | ') : p[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='michaela-staff-2026-10-21.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    render();
    const target=records.find(p=>`#${p.id}`===location.hash);if(target){const el=document.getElementById(target.id);el.open=true;el.scrollIntoView({block:'start'});}
  }
  async function resultsView(research) {
    main.innerHTML=research.blocks.map(section).join('')+'<div id="resultData" role="status">Loading the existing Openday performance records...</div>';
    const doc=await get('../../data/performance.json');
    const school=doc.schools.find(s=>String(s.urn)==='140862');if(!school)throw new Error('Michaela is missing from the existing performance dataset');
    const g=school.gcseGradeProfile || {};
    const number=n=>Number.isFinite(Number(n)) && n!==null ? String(n) : 'Not published';
    const years=Object.entries(school.gcse || {}).sort(([a],[b])=>b.localeCompare(a));
    const rows=years.map(([year,v])=>[year.slice(0,4)+'/'+year.slice(-2),number(v.pupils),number(v.attainment8),v.progress8===null || v.progress8===undefined ? 'Not published' : number(v.progress8)]);
    const subjects=(school.gcseSubjects || []).map(s=>{
      const grades=s.grades || {}, entries=grades['Total exam entries'];
      const combined=s.subject === 'Combined Science';
      const cells=Object.entries(grades).filter(([key,value])=>/^[0-9]{1,2}$/.test(key) && Number.isFinite(value));
      const accounted=Object.entries(grades).filter(([key,value])=>/^(?:[0-9]{1,2}|U|UU)$/.test(key) && Number.isFinite(value)).reduce((sum,[,value])=>sum+value,0);
      const suppressed=!Number.isFinite(entries) || accounted < entries;
      const grade9=cells.reduce((sum,[key,value])=>sum+value*[...key].filter(n=>n==='9').length,0);
      const grade97=cells.reduce((sum,[key,value])=>sum+value*[...key].filter(n=>Number(n)>=7).length,0);
      const awards=entries*(combined ? 2 : 1);
      const countLabel=n=>suppressed ? (n ? n+'+ (unpublished cells)' : 'Not fully published') : String(n);
      return [s.subject+(s.subjectGroup && s.subjectGroup!==s.subject ? ' - '+s.subjectGroup : ''),number(entries),combined ? 'Double award' : 'Single award',countLabel(grade9),countLabel(grade97),Number.isFinite(awards) ? String(awards) : 'Unknown'];
    });
    const target=document.getElementById('resultData');
    target.innerHTML=`<section class="panel"><div class="status-line">Existing Openday DfE dataset; generated ${esc(doc.generatedAt || 'date not recorded')}</div><h2>GCSE outcomes by exam year</h2>${table(['Exam year','Pupils','Attainment 8','Progress 8'],rows)}<p class="meta">Progress 8 is unavailable for the 2024/25 and 2025/26 cohorts because their usual KS2 baseline was unavailable. It is not zero. Results from different exam years are retained, not overwritten.</p></section><section class="panel"><h2>Top-grade profile: ${esc(g.year || 'see source dataset')}</h2><div class="tiles"><div class="tile"><b>${esc(g.grade9Percent ?? 'Unknown')}%</b><span>Grade 9 awards</span></div><div class="tile"><b>${esc(g.grade97Percent ?? 'Unknown')}%</b><span>Grades 9-7 awards</span></div><div class="tile"><b>${esc(g.totalGradeAwards ?? 'Unknown')}</b><span>Grade-award denominator</span></div><div class="tile"><b>${esc(g.grade9Count ?? 'Unknown')}</b><span>Published grade 9 count</span></div></div><p>These are percentages of grade awards, not percentages of children getting all 9s. Combined Science counts as two awards. Suppressed grade cells are not guessed; ${g.hasSuppressedGrades ? 'some cells are suppressed in this profile.' : 'check the dataset for cell-level suppression.'}</p>${links([['Full subject breakdown and school context','../../performance.html#school=michaela'],['How Attainment 8 and Progress 8 work','../../measures.html'],['Underlying retained dataset','../../data/performance.json']])}</section>`;
    if(subjects.length)target.insertAdjacentHTML('beforeend',`<section class="panel"><h2>Subject-level awards: ${esc(g.year || 'see dataset')}</h2><p>Published counts only. For Combined Science, a 9-9 contributes two grade 9 awards, while 9-8 contributes one. Missing cells are not silently converted to zero. Small language entries can reflect individual candidates, not a whole-class subject option.</p>${table(['Subject / group','Exam entries','Award type','Grade 9 awards','Grades 9-7 awards','Award denominator'],subjects)}${links([['DfE subject dataset',doc.sources.ks4_subjects],['All retained performance measures','../../performance.html#school=michaela']])}</section>`);
  }
  async function start() {
    if(page==='staff'){const [base,patch]=await Promise.all([get('staff.json'),get('staff-corrections.json')]);staffView(readStaff(base,patch));return;}
    if(page==='research-checks'){const audit=await get('audit.json');main.innerHTML=`<p class="lede">${esc(audit.intro)}</p>${audit.blocks.map(section).join('')}`;return;}
    const research=await get('research.json');
    const entry=research.pages[page];if(!entry)throw new Error('Unknown research page');
    if(page==='results'){await resultsView(entry);return;}
    main.innerHTML=`<p class="lede">${esc(entry.intro)}</p>${entry.cards ? `<div class="grid" style="margin:24px 0">${entry.cards.map(c=>`<section class="panel"><span class="eyebrow">${esc(c[0])}</span><h2>${link(c[1],c[2])}</h2><p>${esc(c[3])}</p></section>`).join('')}</div>` : ''}${entry.blocks.map(section).join('')}`;
    if(page==='history'){
      const [base,patch]=await Promise.all([get('staff.json'),get('staff-corrections.json')]);const {sources}=readStaff(base,patch);
      main.insertAdjacentHTML('beforeend',`<section class="panel"><h2>Full staff source index</h2><p>${Object.keys(sources).length} source records. Dates describe the document or the check, as labelled; an undated biography is not a dated appointment.</p>${Object.entries(sources).map(([id,s])=>`<details class="source-box"><summary>${esc(id)} - ${esc(s.title)}</summary><p class="meta">${esc(s.date)}</p><p>${esc(s.basis)}</p>${link('Open source',s.url)}</details>`).join('')}</section>`);
    }
    if(page==='index' && location.hash==='#staff')location.replace('staff.html');
  }
  start().catch(error=>{main.innerHTML=`<section class="error" role="alert"><h2>This view could not load</h2><p>${esc(error.message)}</p><p>Refresh the page, or open the retained data directly. No personal data has been changed.</p>${links([['Staff data','staff.json'],['Corrections','staff-corrections.json'],['Research sections','research.json'],['Openday','../../']])}</section>`;});
})();
