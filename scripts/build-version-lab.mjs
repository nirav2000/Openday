import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';

const registry=JSON.parse(fs.readFileSync('version-lab/releases.json','utf8'));
const releases=[...(registry.releases||[])];

const current=JSON.parse(fs.readFileSync('version.json','utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!releases.some(r=>r.version===current.version))releases.push({version:current.version,commit:head,kind:'release',label:current.summary||'Current release'});

const root='version-lab';
const snapshots=path.join(root,'snapshots');
fs.rmSync(snapshots,{recursive:true,force:true});
fs.mkdirSync(snapshots,{recursive:true});

const manifest=[];
for(const release of releases){
  execFileSync('git',['cat-file','-e',release.commit+'^{commit}']);
  const dir=path.join(snapshots,release.version);
  fs.mkdirSync(dir,{recursive:true});
  const archive=spawnSync('git',['archive','--format=tar',release.commit],{encoding:null,maxBuffer:64*1024*1024});
  if(archive.status!==0)throw new Error('git archive failed for '+release.version+': '+String(archive.stderr));
  const untar=spawnSync('tar',['-xf','-','-C',dir],{input:archive.stdout,encoding:null,maxBuffer:64*1024*1024});
  if(untar.status!==0)throw new Error('tar failed for '+release.version+': '+String(untar.stderr));
  const date=execFileSync('git',['show','-s','--format=%cI',release.commit],{encoding:'utf8'}).trim();
  const subject=execFileSync('git',['show','-s','--format=%s',release.commit],{encoding:'utf8'}).trim();
  const tree=execFileSync('git',['rev-parse',release.commit+'^{tree}'],{encoding:'utf8'}).trim();
  const files=execFileSync('git',['ls-tree','-r','--name-only',release.commit],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  manifest.push({...release,date,subject,tree,fileCount:files.length,snapshot:'snapshots/'+release.version+'/',source:'https://github.com/nirav2000/Openday/tree/'+release.commit});
}
manifest.reverse();
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),source:'git commit trees',releases:manifest},null,2)+'\n');

const escHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmtDate=value=>{
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return escHtml(value);
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(d);
};
const cards=manifest.map(v=>`<article class="version">
  <div><h2>v${escHtml(v.version)}</h2><span class="badge ${v.kind==='reconstructed'?'reconstructed':''}">${v.kind==='reconstructed'?'reconstructed label':'release'}</span></div>
  <div><b>${escHtml(v.label)}</b><p>${fmtDate(v.date)} · ${escHtml(v.subject)}</p><p class="commit">${escHtml(v.commit.slice(0,12))} · tree ${escHtml(v.tree.slice(0,12))} · ${v.fileCount} files</p></div>
  <div class="actions"><a class="primary" href="${escHtml(v.snapshot)}">Open exact snapshot</a><a href="${escHtml(v.source)}" target="_blank" rel="noopener">Browse commit</a></div>
</article>`).join('\n');
const pagePath=path.join(root,'index.html');
const page=fs.readFileSync(pagePath,'utf8');
if(!page.includes('<!-- VERSION_CARDS -->'))throw new Error('Version Lab card marker missing');
fs.writeFileSync(pagePath,page.replace('<!-- VERSION_CARDS -->',cards));
console.log('Built Version Lab with '+manifest.length+' exact commit snapshots and a static version index');
