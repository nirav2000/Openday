(()=>{
  const cfg={stateKey:'openDayState',documentPath:['app_private_state','openday'],loginUrl:'https://nirav2000.github.io/Kk-syllabus/',legacyEmail:'openday-sync@nirav2000.github.io'};
  let FApp,FAuth,FStore,auth,db,ref,OWNER_UID='',unsubscribe=null,lastRemote='',lastLocal='',timer=null,realtimePromise=null,lastAuthUid=null;
  const emit=(state,text)=>{const detail={state,text,connected:!!auth?.currentUser&&auth.currentUser.uid===OWNER_UID};window.dispatchEvent(new CustomEvent('openday:sync-status',{detail}));window.AppPlatform?.emit?.('sync:status',detail)};
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(cfg.stateKey)||'{}')}catch{return{}}};
  const writeLocal=data=>localStorage.setItem(cfg.stateKey,JSON.stringify(data||{}));
  const normalise=data=>({saved:Array.isArray(data.saved)?data.saved:[],booked:data.booked||{},notes:data.notes||{},watchBooking:Array.isArray(data.watchBooking)?data.watchBooking:[],eventOverrides:data.eventOverrides&&typeof data.eventOverrides==='object'?data.eventOverrides:{},updatedAt:data.updatedAt||''});
  const localJSON=()=>JSON.stringify(normalise(readLocal()));
  const emitCatalog=data=>{try{const detail={senior:data?.catalogSenior?JSON.parse(data.catalogSenior):null,primary:data?.catalogPrimary?JSON.parse(data.catalogPrimary):null,enhancements:data?.catalogEnhancements?JSON.parse(data.catalogEnhancements):null,version:data?.catalogVersion||'',updatedAt:data?.catalogUpdatedAt?.toDate?.()?.toISOString?.()||''};if(detail.senior||detail.primary){window.OpenDayCatalog=detail;window.dispatchEvent(new CustomEvent('openday:catalog-state',{detail}));window.AppPlatform?.emit?.('catalog:state',detail)}}catch(error){console.warn('Could not read cloud school catalogue',error)}};
  const friendly=error=>{const code=error?.code||'';if(code.includes('permission-denied'))return'Cloud access was denied by kk-syllabus Firestore rules.';if(error?.message==='owner-mismatch')return'Sign in to the configured parent account in Kk-syllabus first.';return error?.message||'Sync unavailable.'};

  async function loadFirebase(){
    if(auth)return;
    const [configMod,appMod,authMod,storeMod]=await Promise.all([
      import('/Kk-syllabus/src/firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
    ]);
    const {firebaseConfig}=configMod;OWNER_UID=configMod.OWNER_UID;
    FApp=appMod;FAuth=authMod;FStore=storeMod;
    const app=FApp.getApps().find(x=>x.options?.projectId===firebaseConfig.projectId)||FApp.initializeApp(firebaseConfig);
    auth=FAuth.getAuth(app);await FAuth.setPersistence(auth,FAuth.browserLocalPersistence);db=FStore.getFirestore(app);ref=FStore.doc(db,...cfg.documentPath);
    await auth.authStateReady();
    FAuth.onAuthStateChanged(auth,user=>handleAuth(user));
    await handleAuth(auth.currentUser);
  }

  async function handleAuth(user){
    const uid=user?.uid||null;
    if(uid===lastAuthUid&&((uid!==OWNER_UID)||unsubscribe||realtimePromise))return;
    lastAuthUid=uid;
    if(uid===OWNER_UID){emit('syncing','Connecting to kk-syllabus…');try{await startRealtime()}catch(error){emit('error',friendly(error))}}
    else if(user?.email===cfg.legacyEmail){
      unsubscribe?.();unsubscribe=null;realtimePromise=null;emit('syncing','Clearing old Openday sign-in…');
      try{await FAuth.signOut(auth)}catch{}
      lastAuthUid=null;emit('local','Old Openday sign-in cleared. Sign in to Kk-syllabus once to restore your synced Openday data.');
    }
    else{unsubscribe?.();unsubscribe=null;realtimePromise=null;emit(uid?'error':'local',uid?'Different kk-syllabus account is signed in.':'Sign in to Kk-syllabus to enable cloud sync.')}
  }

  async function startRealtime(){
    if(realtimePromise)return realtimePromise;
    realtimePromise=(async()=>{
      unsubscribe?.();unsubscribe=null;
      window.FirebaseUsageMonitor?.read(1,'state-read','openday','kk-syllabus','(default)');
      const snap=await FStore.getDoc(ref),local=normalise(readLocal());
      if(snap.exists()){
        emitCatalog(snap.data());
        if(snap.data()?.state){
          const remote=normalise(snap.data().state),json=JSON.stringify(remote);lastRemote=json;
          if(Date.parse(remote.updatedAt||0)>Date.parse(local.updatedAt||0)){writeLocal(remote);lastLocal=json;window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:remote}))}
          else if(localJSON()!==json)await push();
        }else await push();
      }else await push();
      window.FirebaseUsageMonitor?.listener(1,'state-listener','openday','kk-syllabus','(default)');
      unsubscribe=FStore.onSnapshot(ref,s=>{
        window.FirebaseUsageMonitor?.read(1,'state-listener-snapshot','openday','kk-syllabus','(default)');
        const data=s.data()||{};emitCatalog(data);const remote=data.state;
        if(remote){const n=normalise(remote),json=JSON.stringify(n);lastRemote=json;const localNow=normalise(readLocal());if(Date.parse(n.updatedAt||0)>Date.parse(localNow.updatedAt||0)){writeLocal(n);lastLocal=json;window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:n}))}}
        emit('synced','Synced through kk-syllabus');
      },error=>emit('error',friendly(error)));
      emit('synced','Synced through kk-syllabus');
    })().finally(()=>{realtimePromise=null});
    return realtimePromise;
  }

  async function push(){
    await loadFirebase();if(auth.currentUser?.uid!==OWNER_UID)return false;
    const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);const json=JSON.stringify(state);if(json===lastRemote)return true;
    emit('syncing','Saving…');
    try{
      window.FirebaseUsageMonitor?.write(1,'state-write','openday','kk-syllabus','(default)');
      await FStore.setDoc(ref,{app:'openday',state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
      lastLocal=json;lastRemote=json;emit('synced','Synced through kk-syllabus');return true;
    }catch(error){emit('error',friendly(error));return false}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(push,450)};
  async function connect(){await loadFirebase();if(auth.currentUser?.uid!==OWNER_UID)throw new Error('owner-mismatch');await startRealtime();return true}
  const isConnected=()=>!!auth?.currentUser&&auth.currentUser.uid===OWNER_UID;
  const hasToken=isConnected;
  const currentUser=()=>auth?.currentUser||null;
  async function boot(){
    await loadFirebase();
    setInterval(()=>{if(!isConnected()||document.visibilityState!=='visible')return;const json=localJSON();if(json!==lastLocal&&json!==lastRemote){lastLocal=json;schedule()}},5000);
    window.addEventListener('online',()=>isConnected()&&startRealtime().catch(()=>{}));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')connect().catch(()=>{})});
  }
  const api={connect,push,schedule,isConnected,hasToken,currentUser,loginUrl:cfg.loginUrl,ownerUid:()=>OWNER_UID};
  window.OpenDaySync=api;window.AppPlatform?.register?.('firebase-token-sync',api);boot().catch(error=>emit('error',friendly(error)));
})();
