import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';

const releases=[
  {version:'1.0.0',commit:'207cff2c138e9dec3eec16ce7fbb78e013fa0ec5',kind:'reconstructed',label:'Initial mobile open-day tracker'},
  {version:'1.1.0',commit:'933076be6f2d246864651361642ffb1e5468f02e',kind:'reconstructed',label:'Admissions, score guidance and privacy cleanup'},
  {version:'1.2.0',commit:'fa1f9e85c778bc49c8058c82557008e6a05d65be',kind:'reconstructed',label:'Calendar, travel and subscription views'},
  {version:'1.3.0',commit:'a8424d5f1d20e36ccb8c95bd6913f709fee68a29',kind:'reconstructed',label:'Reusable app plugins, autosave and shared-token sync'},
  {version:'1.4.0',commit:'0293d9d2c51a425dd40633b2a79b891dbc43ff60',kind:'release',label:'Direct Firebase token sync'},
  {version:'1.4.1',commit:'f1b4f0cab5ffdc6c342b79578b086dcbe55d4707',kind:'release',label:'Visible unrestricted memorable token'},
  {version:'1.5.0',commit:'0f67497d0331a5a7ba9d2c0a4793a5a74a1f475f',kind:'release',label:'Primary/senior views and cloud catalogue'},
  {version:'1.5.1',commit:'b9e78882bc0bb1b930b9633a4dbded0a4888f992',kind:'release',label:'Primary catalogue and Firebase reader patch'},
  {version:'1.6.0',commit:'d5a367bd8c1b92233bc311014c2d85dec51c0cf6',kind:'release',label:'Personal corrections and Firebase usage monitoring'},
  {version:'2.0.0',commit:'398fa3184b59a324c90050b89aa793ce4ec4cba1',kind:'release',label:'Shared Kk-syllabus authentication migration'},
  {version:'2.0.1',commit:'7aaa734c074415b3bb4bef069755ba524d27cc2f',kind:'release',label:'Kk-syllabus catalogue publisher'},
  {version:'2.0.2',commit:'81de550dd7fe76fb2c29c3ae2713ea069fa2b5d3',kind:'release',label:'Legacy auth-session recovery'},
  {version:'2.0.3',commit:'95674845ddf58bac5ac797aa66c019cb7777c253',kind:'release',label:'Safe local/cloud state merge'},
  {version:'2.1.0',commit:'beb6d21921fe5d12d85dc48ebad297e7f0646413',kind:'release',label:'Memorable-token restoration'},
  {version:'2.2.0',commit:'88311e2f919a9dad36f5f259ec62a7ede626785a',kind:'release',label:'Exact Version Lab, global date/time reports and subscribed-calendar refresh'},
  {version:'2.2.1',commit:'acbab7d3af1788e3eddf33da17c9c900fc9c8631',kind:'release',label:'Calendar duration fix'},
  {version:'2.2.2',commit:'e4c12944e04dd2f5bb5137b2b8edfff0526d3906',kind:'release',label:'Change-driven calendar publishing'},
  {version:'2.2.3',commit:'f84e5b890febb9f5f68bea8f91ee9c4f82e94e1a',kind:'release',label:'Calendar publisher race fix'},
  {version:'2.2.4',commit:'b1b4fce49f2fd7ac120931f7736d2c110b3bfe2b',kind:'release',label:'Strict change-driven calendar'},
  {version:'2.3.0',commit:'9f69723e076071242405458e348254be4d08c49c',kind:'release',label:'Low-usage local-first Firestore sync'},
  {version:'2.4.0',commit:'0e623a8800905900360c3ed208d37b1814cb405e',kind:'release',label:'School decision labels'},
  {version:'2.4.1',commit:'f24aa9fe1f5d95ad501f530ac222762dbb374355',kind:'release',label:'Token/recovery distinction and safe device-state backup'},
  {version:'2.5.0',commit:'73480b00203b76fc2c1e312e1677df250a9a8bc6',kind:'release',label:'Local notes viewer, lossless conflict preservation and static Version Lab'}
];

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
