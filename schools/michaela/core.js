/* Pure, testable research-data helpers. No network or personal-data writes. */
(function(root){
'use strict';
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const year=v=>/^\d{6}$/.test(String(v))?String(v).slice(0,4)+'/'+String(v).slice(-2):String(v||'Not dated');
const date=v=>{const d=new Date(v);return Number.isNaN(d.valueOf())?String(v||'Not dated'):d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
function mergeStaff(base,patch,insights={}){
 if(!Array.isArray(base.records)||!Array.isArray(base.columns))throw Error('Invalid staff schema');
 const original=base.records.map(row=>Object.fromEntries(base.columns.map((k,i)=>[k,row[i]??''])));
 const records=[...original,...(patch.additions||[])].map(p=>({...p,...(patch.records?.[p.id]||{})}));
 if(new Set(records.map(p=>p.id)).size!==records.length)throw Error('Duplicate staff IDs');
 const required=insights.baselineIds||original.map(p=>p.id);
 if(required.some(id=>!records.some(p=>p.id===id)))throw Error('A preserved staff record is missing');
 const sources={...base.sources,...patch.sources,...insights.sources};
 for(const id of Object.keys(patch.records||{}))if(!records.some(p=>p.id===id))throw Error('Correction has no staff record: '+id);
 for(const id of Object.keys(insights.records||{}))if(!records.some(p=>p.id===id))throw Error('Annotation has no staff record: '+id);
 return {sources,records:records.map(p=>{
  if(!p.id||!p.name)throw Error('Staff ID and name required');
  const detail=insights.records?.[p.id]||{};
  const annotations=[...(detail.status?.sourceIds||[]),...Object.values(detail.claims||{}).flatMap(x=>x.sourceIds||[])];
  p.sources=[...new Set([...String(p.sources||'').split(/\s+/).filter(Boolean),...annotations])].join(' ');
  if(!p.sources)throw Error('A staff record needs evidence: '+p.id);
  for(const id of p.sources.split(' '))if(!sources[id])throw Error('Missing source '+id);
  return {...p,subjectsCanonical:detail.subjects||canonicalSubjects(p.subjects),status:detail.status||{value:'unknown',date:p.lastEvidence,reason:'No sufficiently recent school evidence or explicit departure verified. Absence from a roster is not departure.',sourceIds:[]},claims:detail.claims||{}};
 })};
}
function canonicalSubjects(text=''){
 const names={English:'English',Maths:'Mathematics',Mathematics:'Mathematics','Further maths':'Mathematics',Science:'Science',Chemistry:'Chemistry',Biochemistry:'Science',Biology:'Biology',Physics:'Physics',History:'History',Humanities:'Humanities',Geography:'Geography',French:'French','Modern languages':'Languages','Religious studies':'Religious education','Religious Studies':'Religious education',Theology:'Religious education',Philosophy:'Philosophy',Music:'Music',Art:'Art',Politics:'Politics',PSHE:'PSHE'};
 return [...new Set(text.split(';').map(v=>v.trim().replace(/ context.*$/i,'')).map(v=>names[v]).filter(Boolean))];
}
function subjectStats(subject){
 const g=subject.grades||{},entries=g['Total exam entries'];
 const weight=/combined science/i.test(subject.subject)?2:1;
 const dist={};let knownEntries=0,n9=0,n97=0;
 for(const [raw,count] of Object.entries(g)){
  if(!numeric(count)||count<0)continue;
  const key=raw.replace(/[-\s]/g,'').toUpperCase();
  if(!/^(?:[1-9]{1,2}|U|UU)$/.test(key))continue;
  if(key!=='U'&&key!=='UU'&&key.length!==weight)continue;
  knownEntries+=count;
  const awards=/^U+$/.test(key)?Array(weight).fill('U'):[...key];
  for(const n of awards){dist[n]=(dist[n]||0)+count;if(n==='9')n9+=count;if(Number(n)>=7)n97+=count;}
 }
 const valid=numeric(entries)&&entries>=knownEntries;
 const total=valid?entries*weight:null;
 const missing=valid?(entries-knownEntries)*weight:null;
 return {name:subject.subject,group:subject.subjectGroup||'',entries:numeric(entries)?entries:null,weight,total,knownEntries,n9,n97,missing,dist,valid,rate9:total>0?100*n9/total:null,rate97:total>0?100*n97/total:null};
}
function gradeProfile(subjects){
 const rows=subjects.map(subjectStats),valid=rows.length>0&&rows.every(r=>r.valid);
 const sum=k=>rows.reduce((n,r)=>n+(r[k]||0),0);
 const total=valid?sum('total'):null,missing=valid?sum('missing'):null,n9=sum('n9'),n97=sum('n97');
 return {rows,total,missing,n9,n97,valid,rate9:total>0?100*n9/total:null,rate97:total>0?100*n97/total:null,upper9:total>0?100*(n9+missing)/total:null,upper97:total>0?100*(n97+missing)/total:null};
}
function csv(records,sources){
 const cols=['id','name','subjects','roles','status','statusDate','academic','professional','arrival','departure','firstEvidence','lastEvidence','latest','latestDate','notes','sources'];
 const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 return '\ufeff'+[cols,...records.map(p=>cols.map(k=>k==='status'?p.status.value:k==='statusDate'?p.status.date:k==='sources'?p.sources.split(' ').map(id=>sources[id]?.url||id).join(' | '):p[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
}
const api={numeric,escape,year,date,mergeStaff,canonicalSubjects,subjectStats,gradeProfile,csv};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.MichaelaCore=api;
})(typeof window==='undefined'?globalThis:window);
