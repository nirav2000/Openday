(()=>{
  const COLLECTION='openday_public_reports';
  const DEVICE_KEY='openday.publicContributor.v1';
  let FApp,FStore,db,ready=false,lastRefresh=0;
  const reportsBySchool=new Map();

  const emit=()=>{
    const detail={reports:Object.fromEntries(reportsBySchool),refreshedAt:lastRefresh?new Date(lastRefresh).toISOString():''};
    window.dispatchEvent(new CustomEvent('openday:public-overrides',{detail}));
    window.AppPlatform?.emit?.('public-overrides:changed',detail);
  };

  async function loadFirebase(){
    if(db)return;
    const [configMod,appMod,storeMod]=await Promise.all([
      import('/Kk-syllabus/src/firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
    ]);
    FApp=appMod;FStore=storeMod;
    const app=FApp.getApps().find(x=>x.options?.projectId===configMod.firebaseConfig.projectId)||FApp.initializeApp(configMod.firebaseConfig);
    db=FStore.getFirestore(app);
  }

  async function digestHex(value){
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
    return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function deviceSeed(){
    let seed=localStorage.getItem(DEVICE_KEY);
    if(!seed){
      seed=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint32Array(4))).map(x=>x.toString(16)).join('-');
      localStorage.setItem(DEVICE_KEY,seed);
    }
    return seed;
  }

  async function contributor(){
    const token=window.OpenDaySync?.getToken?.()||'';
    const base=token&&window.OpenDaySync?.deriveTokenHash
      ? await window.OpenDaySync.deriveTokenHash(token)
      : await digestHex('device|'+deviceSeed());
    const adjectives=['Amber','Blue','Cedar','Dawn','Elm','Golden','Harbour','Indigo','Juniper','Lime','Maple','Silver'];
    const nouns=['Badger','Falcon','Fox','Heron','Kite','Otter','Robin','Swift','Tern','Wren','Oak','Star'];
    const a=parseInt(base.slice(0,2),16)%adjectives.length,n=parseInt(base.slice(2,4),16)%nouns.length,num=parseInt(base.slice(4,8),16)%100;
    return {
      id:(token?'token-':'device-')+base.slice(0,20),
      label:`${adjectives[a]} ${nouns[n]} ${String(num).padStart(2,'0')}`,
      source:token?'memorable-token':'device'
    };
  }

  function normaliseReport(data,id=''){
    const updated=data.updatedAt?.toDate?.()?.toISOString?.()||data.updatedAt||'';
    return {
      id,
      schoolId:String(data.schoolId||id||''),
      date:String(data.date||''),
      startTime:String(data.startTime||''),
      endTime:String(data.endTime||''),
      contributorId:String(data.contributorId||''),
      contributorLabel:String(data.contributorLabel||'Anonymous reporter'),
      status:'reported',
      updatedAt
    };
  }

  async function refresh(){
    await loadFirebase();
    window.FirebaseUsageMonitor?.read(1,'public-report-query','openday','kk-syllabus','(default)');
    const snap=await FStore.getDocs(FStore.collection(db,COLLECTION));
    reportsBySchool.clear();
    snap.forEach(doc=>{
      const report=normaliseReport(doc.data(),doc.id);
      if(report.schoolId)reportsBySchool.set(report.schoolId,report);
    });
    if(snap.size>1)window.FirebaseUsageMonitor?.read(snap.size-1,'public-report-docs','openday','kk-syllabus','(default)');
    lastRefresh=Date.now();ready=true;emit();
    return reportsBySchool.size;
  }

  async function report(schoolId,{date='',startTime='',endTime=''}={}){
    await loadFirebase();
    if(!schoolId)throw new Error('Missing school.');
    if(!date&&!startTime&&!endTime)throw new Error('Enter a date or time to report.');
    const who=await contributor(),id=String(schoolId);
    const payload={
      app:'openday',
      schoolId:id,
      date:String(date||''),
      startTime:String(startTime||''),
      endTime:String(endTime||''),
      contributorId:who.id,
      contributorLabel:who.label,
      status:'reported',
      updatedAt:FStore.serverTimestamp()
    };
    window.FirebaseUsageMonitor?.write(1,'public-report-save','openday','kk-syllabus','(default)');
    await FStore.setDoc(FStore.doc(db,COLLECTION,id),payload);
    const local={...payload,id,updatedAt:new Date().toISOString()};
    reportsBySchool.set(id,local);emit();
    return {...local,contributor:who};
  }

  function get(schoolId){return reportsBySchool.get(String(schoolId))||null}
  function all(){return Object.fromEntries(reportsBySchool)}
  function isReady(){return ready}

  const api={refresh,report,get,all,contributor,isReady};
  window.OpenDayPublicOverrides=api;
  window.AppPlatform?.register?.('public-overrides',api);
  refresh().catch(error=>{
    console.warn('Openday public reports unavailable',error);
    window.dispatchEvent(new CustomEvent('openday:public-overrides-error',{detail:{message:error?.message||'Public reports unavailable'}}));
  });
})();
