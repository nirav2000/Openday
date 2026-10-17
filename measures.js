/* OpenDay school-measures guide: educational estimators, not certified DfE scores. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.OpenDayMeasures=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const SUBJECTS=[
 ['englishLanguage','English Language','english'],['englishLiterature','English Literature','english'],['maths','Mathematics','maths'],
 ['biology','Biology','ebacc'],['chemistry','Chemistry','ebacc'],['physics','Physics','ebacc'],['computerScience','Computer Science','ebacc'],
 ['combined1','Combined Science grade 1','combined'],['combined2','Combined Science grade 2','combined'],
 ['history','History','ebacc'],['geography','Geography','ebacc'],['french','French','ebacc'],['latin','Latin','ebacc'],
 ['re','Religious Studies','open'],['art','Art','open'],['music','Music','open'],['dt','Design & Technology','open']
];
const DEFAULTS={englishLanguage:7,englishLiterature:8,maths:8,biology:9,chemistry:8,physics:8,computerScience:null,combined1:null,combined2:null,history:7,geography:null,french:6,latin:null,re:9,art:null,music:8,dt:null};
const score=v=>v===null||v===undefined||v===''?null:Number(v);
const top=(rows,n)=>[...rows].sort((a,b)=>b.points-a.points).slice(0,n);
function calculate(input){
 const g={...DEFAULTS,...input},has=k=>score(g[k])!==null&&Number.isFinite(score(g[k])),val=k=>Number(g[k]);
 const taken=k=>has(k)?{subject:k,points:val(k)}:null;
 const english=[taken('englishLanguage'),taken('englishLiterature')].filter(Boolean).sort((a,b)=>b.points-a.points);
 const maths=taken('maths'),bestEnglish=english[0]||null;
 const hasCombined=has('combined1')&&has('combined2');
 const scienceKeys=['biology','chemistry','physics','computerScience'];
 const separateScience=scienceKeys.map(taken).filter(Boolean);
 // DfE combined science uses the mean of the two award grades per slot.
 const scienceA8=hasCombined?[{subject:'combinedScience (1)',points:(val('combined1')+val('combined2'))/2},{subject:'combinedScience (2)',points:(val('combined1')+val('combined2'))/2}]:separateScience;
 const otherEbacc=['history','geography','french','latin'].map(taken).filter(Boolean);
 const ebaccPool=[...scienceA8,...otherEbacc];
 const ebaccBucket=top(ebaccPool,3);
 const picked=new Set(ebaccBucket.map(x=>x.subject));
 const openPool=[...ebaccPool.filter(x=>!picked.has(x.subject)),...english.slice(1),...['re','art','music','dt'].map(taken).filter(Boolean)];
 const openBucket=top(openPool,3);
 const englishPoints=bestEnglish?bestEnglish.points*(english.length===2?2:1):0;
 const mathsPoints=maths?2*maths.points:0;
 const ebaccPoints=ebaccBucket.reduce((a,x)=>a+x.points,0);
 const openPoints=openBucket.reduce((a,x)=>a+x.points,0);
 const attainment8={english:englishPoints,maths:mathsPoints,ebacc:ebaccPoints,open:openPoints,total:englishPoints+mathsPoints+ebaccPoints+openPoints,ebaccSubjects:ebaccBucket,openSubjects:openBucket,englishDouble:english.length===2,missingSlots:(maths?0:1)+(bestEnglish?0:1)+(3-ebaccBucket.length)+(3-openBucket.length)};
 // English counts in the EBacc APS only when Language AND Literature are entered.
 const eEnglish=english.length===2?bestEnglish.points:0;
 const scienceValid=hasCombined||separateScience.length>=3;
 const scienceAPS=hasCombined?[val('combined1'),val('combined2')]:top(separateScience,2).map(x=>x.points);
 const sci=scienceValid?scienceAPS:[0,0];
 const human=top(['history','geography'].map(taken).filter(Boolean),1)[0]?.points||0;
 const lang=top(['french','latin'].map(taken).filter(Boolean),1)[0]?.points||0;
 const ebaccAPS=(eEnglish+(maths?.points||0)+sci[0]+sci[1]+human+lang)/6;
 const ebaccEntered=english.length===2&&!!maths&&scienceValid&&human>0&&lang>0;
 const entered=SUBJECTS.filter(x=>has(x[0])&&(!hasCombined||!scienceKeys.includes(x[0]))).map(x=>({key:x[0],grade:val(x[0])}));
 // Combined Science award contributes two GCSE grades; the admissions model treats each as a grade.
 const admissionsGrades=entered.map(x=>x.grade);
 const admissionsAPS=admissionsGrades.length?admissionsGrades.reduce((a,b)=>a+b,0)/admissionsGrades.length:null;
 const admissionsMin=admissionsGrades.filter(x=>x>=5).length>=7&&has('englishLanguage')&&val('englishLanguage')>=5&&!!maths&&maths.points>=5;
 return {attainment8,ebacc:{aps:ebaccAPS,entered:ebaccEntered,components:{english:eEnglish,maths:maths?.points||0,science:sci,humanities:human,language:lang},scienceValid},admissions:{aps:admissionsAPS,gradesCount:admissionsGrades.length,grades5:admissionsGrades.filter(x=>x>=5).length,meetsBasicMin:admissionsMin},grades:g};
}
const format=v=>Number.isFinite(v)?(Math.round(v*100)/100).toLocaleString('en-GB',{maximumFractionDigits:2}):'—';
return{SUBJECTS,DEFAULTS,calculate,format};
});
if(typeof document!=='undefined'){
document.addEventListener('DOMContentLoaded',()=>{
 const {SUBJECTS,DEFAULTS,calculate,format}=window.OpenDayMeasures;
 const form=document.querySelector('#gradesGrid');
 if(!form)return;
 const state={...DEFAULTS};
 const labels={english:'English and maths',ebacc:'EBacc subjects',combined:'Combined Science alternative',open:'Other eligible GCSEs'};
 let currentCategory='';
 const optionList='<option value="">Not entered</option>'+Array.from({length:9},(_,i)=>9-i).map(n=>'<option value="'+n+'">Grade '+n+'</option>').join('');
 SUBJECTS.forEach(([key,name,category])=>{
   if(currentCategory!==category){
     currentCategory=category;
     const h=document.createElement('h3');h.className='subject-heading';h.textContent=labels[category];form.append(h);
   }
   const label=document.createElement('label');label.className='subject-control';
   const span=document.createElement('span');span.textContent=name;
   const select=document.createElement('select');select.id='grade-'+key;select.name=key;select.innerHTML=optionList;select.value=state[key]??'';
   select.addEventListener('change',()=>{
     state[key]=select.value===''?null:Number(select.value);
     if(key.startsWith('combined')&&select.value!==''){
       for(const k of ['biology','chemistry','physics','computerScience']){state[k]=null;document.getElementById('grade-'+k).value=''}
     }
     if(['biology','chemistry','physics','computerScience'].includes(key)&&select.value!==''){
       for(const k of ['combined1','combined2']){state[k]=null;document.getElementById('grade-'+k).value=''}
     }
     render();
   });
   label.append(span,select);form.append(label);
 });
 function rowHtml(rows){return rows.length?rows.map(x=>'<li>'+escapeText(SUBJECTS.find(s=>s[0]===x.subject)?.[1]||x.subject)+' <b>'+format(x.points)+'</b></li>').join(''):'<li>None</li>'}
 function escapeText(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))}
 function write(id,text){document.getElementById(id).textContent=text}
 function render(){
   const {attainment8:a,ebacc:e,admissions:d}=calculate(state);
   write('a8Total',format(a.total));write('a8English',format(a.english));write('a8Maths',format(a.maths));
   write('a8Ebacc',format(a.ebacc));write('a8Open',format(a.open));
   write('a8Missing',a.missingSlots+' / 8');
   document.getElementById('ebaccSubjects').innerHTML=rowHtml(a.ebaccSubjects);
   document.getElementById('openSubjects').innerHTML=rowHtml(a.openSubjects);
   write('ebaccAPS',format(e.aps));write('ebaccEntry',e.entered?'Meets full subject-entry pattern':'Does not meet full subject-entry pattern');
   write('ebaccEnglish',format(e.components.english));write('ebaccMaths',format(e.components.maths));
   write('ebaccScience',e.components.science.map(format).join(' + '));write('ebaccHumanities',format(e.components.humanities));
   write('ebaccLanguage',format(e.components.language));
   write('admissionAPS',format(d.aps));write('admissionCount',String(d.gradesCount));
   write('admission5',String(d.grades5));write('admissionMin',d.meetsBasicMin?'Basic GCSE minimum met':'Basic GCSE minimum not met');
   const scoreA8=Number(document.getElementById('p8Score').value);
   const benchmark=Number(document.getElementById('p8Benchmark').value);
   write('p8Demo',format((scoreA8-benchmark)/10));
 }
 document.getElementById('resetGrades').addEventListener('click',()=>{
   Object.assign(state,DEFAULTS);SUBJECTS.forEach(([k])=>document.getElementById('grade-'+k).value=state[k]??'');render();
 });
 for(const id of ['p8Score','p8Benchmark'])document.getElementById(id).addEventListener('input',render);
 const filler=document.getElementById('p8AutoFill');filler.addEventListener('click',()=>{
   document.getElementById('p8Score').value=calculate(state).attainment8.total;
   render();
 });
 render();
});
}
