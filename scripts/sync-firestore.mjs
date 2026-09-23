import fs from 'node:fs';

const password=process.env.OPENDAY_FIREBASE_PASSWORD;
if(!password)throw new Error('Missing OPENDAY_FIREBASE_PASSWORD GitHub Actions secret.');

const configText=await fetch('https://nirav2000.github.io/Kk-syllabus/src/firebase-config.js').then(async r=>{
  if(!r.ok)throw new Error('Could not load public Firebase config');
  return r.text();
});
const apiKey=configText.match(/apiKey:\s*['"]([^'"]+)/)?.[1];
if(!apiKey)throw new Error('Firebase API key not found in public config.');

const email='openday-sync@nirav2000.github.io';
const project='kk-syllabus';
const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'));

const auth=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password,returnSecureToken:true})
});
if(!auth.ok)throw new Error(`Firebase sign-in failed: ${auth.status}`);
const {idToken}=await auth.json();

const senior=readJson('data/schools.json');
const primary=readJson('data/primary-schools.json');
const enhancements=readJson('data/enhancements.json');
const release=readJson('version.json');
const updatedAt=new Date().toISOString();

const fields={
  app:{stringValue:'openday'},
  catalogSenior:{stringValue:JSON.stringify(senior)},
  catalogPrimary:{stringValue:JSON.stringify(primary)},
  catalogEnhancements:{stringValue:JSON.stringify(enhancements)},
  catalogVersion:{stringValue:String(release.version)},
  catalogUpdatedAt:{timestampValue:updatedAt}
};
const masks=Object.keys(fields).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/app_private_state/openday?${masks}`;
const write=await fetch(url,{
  method:'PATCH',
  headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},
  body:JSON.stringify({fields})
});
if(!write.ok)throw new Error(`Firestore catalogue sync failed: ${write.status}`);
console.log(`Synced Openday ${release.version} catalogues to Firestore at ${updatedAt}`);
