'use strict';
(async()=>{
 const U=window.MichaelaUI,page=document.body.dataset.page||'index';
 const titles={index:'Is Michaela right for us?',admissions:'Can we get a place?',results:'Results and pupil context','daily-life':'An ordinary week',alternatives:'Compare realistic alternatives',staff:'Who teaches there?',curriculum:'What pupils learn',concerns:'Concerns and trade-offs','home-learning':'Use an idea at home',books:'Books and original resources',history:'What changed and why',planner:'Private follow-up planner','research-checks':'Evidence and audit checks'};
 const nav=document.getElementById('navigation');
 const primary=['index','admissions','results','daily-life','staff','alternatives'];const short={index:'Overview',admissions:'Admission',results:'Results','daily-life':'Daily life',staff:'Staff',alternatives:'Compare'};
 const href=id=>id==='index'?'./':id+'.html';
 nav.innerHTML=primary.map(id=>`<a href="${href(id)}"${page===id?' aria-current="page"':''}>${short[id]}</a>`).join('')+`<details class="more-nav"><summary>More</summary><div>${Object.keys(titles).filter(id=>!primary.includes(id)).map(id=>`<a href="${href(id)}"${page===id?' aria-current="page"':''}>${U.e(titles[id])}</a>`).join('')}</div></details>`;
 document.getElementById('pageTitle').textContent=titles[page]||titles.index;document.title=(titles[page]||titles.index)+' | Michaela | Openday';
 const main=document.getElementById('content');
 try{
  const [d,r]=await Promise.all([U.get('decision.json'),U.get('research.json')]);
  if(!window.MichaelaViews[page])throw Error('Unknown view');
  await window.MichaelaViews[page](main,d,r);main.dataset.ready='true';
  if(page!=='staff'&&location.hash){const el=document.getElementById(decodeURIComponent(location.hash.slice(1)));el?.scrollIntoView({block:'start'});}
 }catch(err){main.innerHTML=U.panel('This view could not load',`<p role="alert">${U.e(err.message)}</p><p>No personal data has been changed. Refresh or open the retained records.</p>${U.links([['Staff data','staff.json'],['Corrections','staff-corrections.json'],['Research','research.json'],['Back to Openday','../../']])}`);main.dataset.error='true';}
})();
