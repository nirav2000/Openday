/* Primary school KS2 comparison: uses the same published data as the school explorer. */
(()=>{'use strict';
const $=selector=>document.querySelector(selector);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX=5;
const yearsAvailable=['2024/25','2023/24','2022/23'];
const params=new URLSearchParams(location.search);
let year=yearsAvailable.includes(params.get('year'))?params.get('year'):'2024/25';
let schools=[],results={},cohorts={},national={},ready=false;
const selected=new Set((params.get('compare')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,MAX));
const key=s=>String(s.urn||s.id);
const source=s=>results[String(s.urn)]||results[s.name]||{};
const at=(s,y)=>source(s).years?.[y]||{};
const intake=(s,y)=>cohorts[String(s.urn)]?.years?.[y]||{};
const pct=v=>Number.isFinite(v)?v+'%':'—';
const number=v=>Number.isFinite(v)?String(v):'—';
function selectedSchools(){return [...selected].map(id=>schools.find(s=>key(s)===id)).filter(Boolean);}
function setMessage(message){const node=$('#compareStatus');if(node)node.textContent=message;}
function updateUrl(){
 const url=new URL(location.href);
 if(selected.size)url.searchParams.set('compare',[...selected].join(','));
 else url.searchParams.delete('compare');
 url.searchParams.set('year',year);
 history.replaceState(null,'',url.pathname+url.search+url.hash);
 const link=$('#primaryCompareLink');
 if(link)link.href=url.href;
}
function syncSelection(){
 document.querySelectorAll('#rows [data-compare]').forEach(el=>{el.checked=selected.has(el.dataset.compare);});
 const count=selected.size;
 $('#compareCount').textContent=count+' school'+(count===1?'':'s')+' selected (max '+MAX+')';
 $('#openCompare').disabled=count<2;
 $('#clearCompare').disabled=count===0;
 updateUrl();
}
function toggle(id,wanted){
 if(!ready)return;
 if(!schools.some(s=>key(s)===id&&Object.keys(source(s).years||{}).length)){syncSelection();return;}
 if(wanted&&selected.size>=MAX&&!selected.has(id)){
  setMessage('Choose a maximum of five schools.');
  syncSelection();
  return;
 }
 if(wanted)selected.add(id);else selected.delete(id);
 setMessage(selected.size>=2?'Ready to compare '+selected.size+' schools.':'Select at least two schools.');
 syncSelection();
}
function cell(value,type){
 if(!Number.isFinite(value))return '<span class="primary-no-value" aria-label="Not available">—</span>';
 const label=type==='percent'?pct(value):type==='distance'?value.toFixed(2)+' mi':number(value);
 if(type!=='percent')return '<strong class="primary-compare-value">'+escapeHTML(label)+'</strong>';
 const width=Math.max(0,Math.min(100,value));
 return '<div class="primary-compare-number"><strong>'+escapeHTML(label)+'</strong><span class="primary-compare-bar"><span style="width:'+width+'%"></span></span></div>';
}
const metrics=[
 {heading:'Attainment · year-matched'},
 {label:'Combined expected standard',key:'combinedExpected',type:'percent',benchmark:true},
 {label:'Combined higher standard',key:'combinedHigher',type:'percent',benchmark:true},
 {label:'Reading · expected',key:'readingExpected',type:'percent',benchmark:true},
 {label:'Writing · expected',key:'writingExpected',type:'percent',benchmark:true},
 {label:'Maths · expected',key:'mathsExpected',type:'percent',benchmark:true},
 {label:'Grammar & spelling · expected',key:'gpsExpected',type:'percent',benchmark:true},
 {label:'Science · expected',key:'scienceExpected',type:'percent',benchmark:true},
 {label:'Reading · higher',key:'readingHigher',type:'percent'},
 {label:'Writing · greater depth',key:'writingHigher',type:'percent'},
 {label:'Maths · higher',key:'mathsHigher',type:'percent'},
 {label:'Grammar & spelling · higher',key:'gpsHigher',type:'percent'},
 {heading:'Year 6 cohort & pupil intake · same year'},
 {label:'Eligible Year 6 pupils',key:'eligibleYear6',type:'count',context:true},
 {label:'Disadvantaged pupils',key:'disadvantagedPercent',type:'percent',context:true},
 {label:'English as additional language',key:'ealPercent',type:'percent',context:true},
 {label:'SEN support',key:'senSupportPercent',type:'percent',context:true},
 {label:'EHCP',key:'ehcpPercent',type:'percent',context:true},
 {label:'Whole-school pupils',key:'wholeSchoolPupils',type:'count',context:true},
 {label:'Distance from UB5 6QX',key:'distanceMiles',type:'distance',school:true},
 {heading:'Historical combined expected · academic year'},
 ...yearsAvailable.map(y=>({label:y,key:'combinedExpected',historic:y,type:'percent',benchmark:true}))
];
function rowFor(metric,selectedList){
 const field=metric.key;
 if(metric.heading)return '<tr class="primary-compare-group"><th colspan="'+(selectedList.length+2)+'" scope="rowgroup">'+escapeHTML(metric.heading)+'</th></tr>';
 const benchmarkYear=metric.historic||year;
 const england=metric.benchmark?national[benchmarkYear]?.[field]:null;
 let html='<tr data-metric="'+escapeHTML(metric.historic?field+'-'+metric.historic:field)+'"><th scope="row">'+escapeHTML(metric.label)+'</th>';
 for(const school of selectedList){
  const value=metric.school?school[field]:(metric.context?intake(school,year)[field]:at(school,metric.historic||year)[field]);
  html+='<td>'+cell(value,metric.type)+'</td>';
 }
 html+='<td class="primary-compare-benchmark">'+cell(england,metric.type)+'</td></tr>';
 return html;
}
function renderDialog(){
 const set=selectedSchools();
 if(set.length<2)return;
 const yearSelect=$('#compareYear');
 yearSelect.value=year;
 const header=set.map(s=>{
  const record=at(s,year),flag=String(record.verification||'').toLowerCase().includes('pending');
  const src=String(record.sourceUrl||'');
  const link=src.startsWith('https://')?'<a href="'+escapeHTML(src)+'" target="_blank" rel="noopener noreferrer">DfE-linked data source ↗</a>':'<span>No source link recorded</span>';
  return '<th scope="col"><div class="primary-school-heading"><strong>'+escapeHTML(s.name)+'</strong><small>'+escapeHTML(s.area||'')+'</small>'+(flag?'<span class="primary-verify">Verification pending</span>':'')+link+'</div></th>';
 }).join('');
 $('#compareMatrix').innerHTML='<table class="primary-compare-table"><thead><tr><th scope="col">Measure</th>'+header+'<th scope="col">England '+escapeHTML(year)+'</th></tr></thead><tbody>'+metrics.map(m=>rowFor(m,set)).join('')+'</tbody></table>';
 $('#compareTitle').textContent=set.length+' primary schools compared';
 $('#compareYearNotice').textContent='All school outcomes and cohort figures are for '+year+'. England benchmarks use the same year. Historical figures are shown separately; missing or suppressed values remain blank.';
 updateUrl();
}
function open(){
 if(selectedSchools().length<2){setMessage('Choose at least two schools.');return;}
 renderDialog();
 const dialog=$('#compareDialog');
 if(!dialog.open){
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
 }
}
function close(){
 const dialog=$('#compareDialog');
 if(typeof dialog.close==='function'&&dialog.open)dialog.close();
 else dialog.removeAttribute('open');
}
function chooseNearest(){
 if(!ready)return;
 selected.clear();
 const nearby=schools.filter(s=>Number.isFinite(s.distanceMiles)&&Number.isFinite(at(s,year).combinedExpected)).sort((a,b)=>a.distanceMiles-b.distanceMiles).slice(0,MAX);
 nearby.forEach(s=>selected.add(key(s)));
 setMessage('Selected the five closest schools with published '+year+' KS2 results.');
 syncSelection();
 open();
}
function handleLoaded(){
 const data=window.OpenDayPrimaryData;
 if(!data)return;
 schools=data.schools||[];
 results=data.schoolResults||{};
 cohorts=data.context||{};
 national=data.national||{};
 ready=true;
 [...selected].forEach(id=>{if(!schools.some(s=>key(s)===id&&Object.keys(source(s).years||{}).length))selected.delete(id);});
 $('#primaryYear').value=year;
 syncSelection();
 if(selected.size>=2)open();
}
window.OpenDayPrimaryCompare={isSelected:id=>selected.has(id),toggle};
$('#openCompare').addEventListener('click',open);
$('#closeCompare').addEventListener('click',close);
$('#clearCompare').addEventListener('click',()=>{selected.clear();setMessage('Comparison cleared.');syncSelection();});
$('#compareNearest').addEventListener('click',chooseNearest);
$('#primaryYear').addEventListener('change',event=>{year=event.target.value;updateUrl();setMessage('Comparison year: '+year+'.');});
$('#compareYear').addEventListener('change',event=>{year=event.target.value;$('#primaryYear').value=year;$('#primaryYear').dispatchEvent(new Event('change'));renderDialog();});
document.addEventListener('openday-primary-loaded',handleLoaded);
if(window.OpenDayPrimaryData)handleLoaded();
})();