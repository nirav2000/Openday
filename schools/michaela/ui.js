(function(){
'use strict';
const C=window.MichaelaCore,e=C.escape;
const link=(title,url)=>{const u=String(url||'');try{if(!u||!['https:','http:'].includes(new URL(u,location.href).protocol))return e(title);}catch{return e(title);}return `<a href="${e(u)}"${/^https?:/.test(u)?' target="_blank" rel="noopener noreferrer"':''}>${e(title)}</a>`;};
const links=items=>`<div class="links">${(items||[]).map(a=>link(a[0],a[1])).join('')}</div>`;
const table=(headers,rows,caption='')=>`<div class="table-wrap" tabindex="0" role="region" aria-label="${e(caption||headers.join(', '))}"><table>${caption?`<caption>${e(caption)}</caption>`:''}<thead><tr>${headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${e(v??'Not established')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const panel=(title,body,id='')=>`<section class="panel"${id?` id="${e(id)}"`:''}><h2>${e(title)}</h2>${body}</section>`;
const fold=(title,body,open=false)=>`<details class="fold"${open?' open':''}><summary>${e(title)}</summary><div>${body}</div></details>`;
function section(b){return panel(b.title,`${b.status?`<p class="meta">${e(b.status)}</p>`:''}${(b.body||[]).map(p=>`<p>${e(p)}</p>`).join('')}${b.items?`<ul>${b.items.map(i=>`<li>${e(i)}</li>`).join('')}</ul>`:''}${b.table?table(b.table.headers,b.table.rows,b.table.caption):''}${links(b.links)}${b.question?`<p class="notice"><strong>Ask:</strong> ${e(b.question)}</p>`:''}`,b.id);}
function answer(text,status='',action){return `<section class="answer"><p>${e(text)}</p><div class="answer-meta">${status?`<span class="tag">${e(status)}</span>`:''}${action?link(action[0],action[1]):''}</div></section>`;}
function get(url){return fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json();});}
const download=(name,text,type='text/plain')=>{const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
const percent=n=>C.numeric(n)?n.toFixed(1)+'%':'Not published';
const num=(n,dp=1)=>C.numeric(n)?n.toFixed(dp):'Not published';
const question=(id,topic='')=>'../../questions.html?'+new URLSearchParams({school:'Michaela Community School',question:id,...(topic?{topic}:{})});
window.MichaelaUI={e,link,links,table,panel,fold,section,answer,get,download,percent,num,question};window.MichaelaViews={};
})();
