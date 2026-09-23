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
  {version:'2.1.0',commit:'beb6d21921fe5d12d85dc48ebad297e7f0646413',kind:'release',label:'Memorable-token restoration'}
];

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
console.log('Built Version Lab with '+manifest.length+' exact commit snapshots');
