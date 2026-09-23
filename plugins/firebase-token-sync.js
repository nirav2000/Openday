(()=>{
  const cfg={
    stateKey:'openDayState',
    documentPath:['app_private_state','openday'],
    tokenCollection:'openday_sync',
    tokenKey:'openday.sync.token.v1',
    loginUrl:'https://nirav2000.github.io/Kk-syllabus/',
    legacyEmail:'openday-sync@nirav2000.github.io',
    tokenSalt:'Openday memorable token v2 | kk-syllabus'
  };
  let FApp,FAuth,FStore,auth,db,ref,OWNER_UID='',ownerUnsubscribe=null,tokenUnsubscribe=null,tokenRef=null,activeTokenHash='',lastOwner='',lastTokenState='',lastLocal='',timer=null,ownerPromise=null,tokenPromise=null,lastAuthUid=null;

  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(cfg.stateKey)||'{}')}catch{return{}}};
  const writeLocal=data=>localStorage.setItem(cfg.stateKey,JSON.stringify(data||{}));
  const normalise=data=>({
    saved:Array.isArray(data?.saved)?data.saved:[],
    booked:data?.booked||{},
    notes:data?.notes||{},
    watchBooking:Array.isArray(data?.watchBooking)?data.watchBooking:[],
    eventOverrides:data?.eventOverrides&&typeof data.eventOverrides==='object'?data.eventOverrides:{},
    updatedAt:data?.updatedAt||''
  });
  const mergeStates=(aInput,bInput)=>{
    const a=normalise(aInput),b=normalise(bInput);
    const at=Date.parse(a.updatedAt||0)||0,bt=Date.parse(b.updatedAt||0)||0,aNewer=at>=bt;
    const mergeMap=(aMap,bMap)=>aNewer?{...bMap,...aMap}:{...aMap,...bMap};
    return {
      saved:[...new Set([...(b.saved||[]),...(a.saved||[])])],
      booked:mergeMap(a.booked||{},b.booked||{}),
      notes:mergeMap(a.notes||{},b.notes||{}),
      watchBooking:[...new Set([...(b.watchBooking||[]),...(a.watchBooking||[])])],
      eventOverrides:mergeMap(a.eventOverrides||{},b.eventOverrides||{}),
      updatedAt:new Date(Math.max(at,bt)||Date.now()).toISOString()
    };
  };
  const localJSON=()=>JSON.stringify(normalise(readLocal()));
  const ownerConnected=()=>!!auth?.currentUser&&auth.currentUser.uid===OWNER_UID;
  const tokenConnected=()=>!!tokenRef;
  const isConnected=()=>ownerConnected()||tokenConnected();
  const rememberedToken=()=>localStorage.getItem(cfg.tokenKey)||'';
  const emit=(state,text)=>{
    const detail={state,text,connected:isConnected(),ownerConnected:ownerConnected(),tokenConnected:tokenConnected(),hasRememberedToken:!!rememberedToken()};
    window.dispatchEvent(new CustomEvent('openday:sync-status',{detail}));
    window.AppPlatform?.emit?.('sync:status',detail);
  };
  const friendly=error=>{
    const code=error?.code||'';
    if(code.includes('permission-denied'))return'Cloud access was denied. Check the memorable token or Kk-syllabus sign-in.';
    if(error?.message==='owner-mismatch')return'Sign in to the configured parent account in Kk-syllabus first.';
    if(error?.message==='token-not-recognised')return'Memorable token not recognised. If you forgot it, sign in to Kk-syllabus and set a new one; your saved data will be preserved.';
    return error?.message||'Sync unavailable.';
  };
  const emitCatalog=data=>{try{
    const detail={
      senior:data?.catalogSenior?JSON.parse(data.catalogSenior):null,
      primary:data?.catalogPrimary?JSON.parse(data.catalogPrimary):null,
      enhancements:data?.catalogEnhancements?JSON.parse(data.catalogEnhancements):null,
      version:data?.catalogVersion||'',
      updatedAt:data?.catalogUpdatedAt?.toDate?.()?.toISOString?.()||''
    };
    if(detail.senior||detail.primary){
      window.OpenDayCatalog=detail;
      window.dispatchEvent(new CustomEvent('openday:catalog-state',{detail}));
      window.AppPlatform?.emit?.('catalog:state',detail);
    }
  }catch(error){console.warn('Could not read cloud school catalogue',error)}};

  async function deriveTokenHash(token){
    const value=String(token??'');
    if(!value)throw new Error('Enter your memorable token.');
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(cfg.tokenSalt),iterations:120000},key,256);
    return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  async function loadFirebase(){
    if(auth)return;
    const [configMod,appMod,authMod,storeMod]=await Promise.all([
      import('/Kk-syllabus/src/firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
    ]);
    const {firebaseConfig}=configMod;OWNER_UID=configMod.OWNER_UID;FApp=appMod;FAuth=authMod;FStore=storeMod;
    const app=FApp.getApps().find(x=>x.options?.projectId===firebaseConfig.projectId)||FApp.initializeApp(firebaseConfig);
    auth=FAuth.getAuth(app);await FAuth.setPersistence(auth,FAuth.browserLocalPersistence);
    db=FStore.getFirestore(app);ref=FStore.doc(db,...cfg.documentPath);
    await auth.authStateReady();
    FAuth.onAuthStateChanged(auth,user=>handleAuth(user));
    await handleAuth(auth.currentUser);
  }

  function applyMerged(remote){
    const local=normalise(readLocal()),merged=mergeStates(local,remote),localJ=JSON.stringify(local),mergedJ=JSON.stringify(merged);
    if(localJ!==mergedJ){
      writeLocal(merged);lastLocal=mergedJ;
      window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:merged}));
    }else lastLocal=mergedJ;
    return {merged,json:mergedJ};
  }

  async function bindTokenHash(hash,{createIfOwner=false}={}){
    if(!hash)return false;
    await loadFirebase();
    tokenRef=FStore.doc(db,cfg.tokenCollection,hash);activeTokenHash=hash;
    window.FirebaseUsageMonitor?.read(1,'token-state-read','openday','kk-syllabus','(default)');
    let snap=await FStore.getDoc(tokenRef);
    if(!snap.exists()){
      if(!createIfOwner||!ownerConnected()){tokenRef=null;activeTokenHash='';throw new Error('token-not-recognised')}
      const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);
      window.FirebaseUsageMonitor?.write(1,'token-capability-create','openday','kk-syllabus','(default)');
      await FStore.setDoc(tokenRef,{app:'openday',active:true,ownerUid:OWNER_UID,tokenHash:hash,state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()});
      snap=await FStore.getDoc(tokenRef);
    }
    const data=snap.data()||{};
    if(data.app!=='openday'||data.active!==true||data.tokenHash!==hash){tokenRef=null;activeTokenHash='';throw new Error('token-not-recognised')}
    const {merged,json}=applyMerged(data.state||{});
    lastTokenState=JSON.stringify(normalise(data.state||{}));
    if(json!==lastTokenState)await push();
    startTokenListener();
    return true;
  }

  function startTokenListener(){
    if(!tokenRef)return;
    tokenUnsubscribe?.();tokenUnsubscribe=null;
    window.FirebaseUsageMonitor?.listener(1,'token-state-listener','openday','kk-syllabus','(default)');
    tokenUnsubscribe=FStore.onSnapshot(tokenRef,s=>{
      window.FirebaseUsageMonitor?.read(1,'token-state-listener-snapshot','openday','kk-syllabus','(default)');
      const data=s.data()||{};
      if(data.active!==true){tokenUnsubscribe?.();tokenUnsubscribe=null;tokenRef=null;activeTokenHash='';emit(ownerConnected()?'synced':'local','Memorable token was replaced.');return}
      const {json}=applyMerged(data.state||{});
      lastTokenState=JSON.stringify(normalise(data.state||{}));
      if(json!==lastTokenState)schedule();
      emit('synced','Synced with memorable token');
    },error=>emit('error',friendly(error)));
  }

  async function startOwner(){
    if(ownerPromise)return ownerPromise;
    ownerPromise=(async()=>{
      ownerUnsubscribe?.();ownerUnsubscribe=null;
      window.FirebaseUsageMonitor?.read(1,'state-read','openday','kk-syllabus','(default)');
      const snap=await FStore.getDoc(ref);
      const data=snap.exists()?snap.data():{};
      emitCatalog(data);
      const {json}=applyMerged(data.state||{});
      lastOwner=JSON.stringify(normalise(data.state||{}));
      if(json!==lastOwner)await push();
      const hash=data.activeTokenHash||'';
      if(hash&&!tokenRef){try{await bindTokenHash(hash)}catch(error){console.warn('Could not attach active memorable-token state',error)}}
      const legacy=rememberedToken();
      if(legacy&&!hash&&ownerConnected()){
        try{await setMemorableToken(legacy,{rotate:false,legacyRecovery:true})}catch(error){console.warn('Could not restore remembered token capability',error)}
      }
      window.FirebaseUsageMonitor?.listener(1,'state-listener','openday','kk-syllabus','(default)');
      ownerUnsubscribe=FStore.onSnapshot(ref,s=>{
        window.FirebaseUsageMonitor?.read(1,'state-listener-snapshot','openday','kk-syllabus','(default)');
        const d=s.data()||{};emitCatalog(d);
        const {json:mergedJSON}=applyMerged(d.state||{});
        lastOwner=JSON.stringify(normalise(d.state||{}));
        if(d.activeTokenHash&&d.activeTokenHash!==activeTokenHash)bindTokenHash(d.activeTokenHash).catch(()=>{});
        if(mergedJSON!==lastOwner)schedule();
        emit('synced',tokenRef?'Synced with memorable token':'Synced through Kk-syllabus');
      },error=>emit('error',friendly(error)));
    })().finally(()=>{ownerPromise=null});
    return ownerPromise;
  }

  async function handleAuth(user){
    const uid=user?.uid||null;
    if(uid===lastAuthUid&&((uid!==OWNER_UID)||ownerUnsubscribe||ownerPromise))return;
    lastAuthUid=uid;
    if(uid===OWNER_UID){emit('syncing','Connecting to kk-syllabus…');try{await startOwner()}catch(error){emit('error',friendly(error))}}
    else if(user?.email===cfg.legacyEmail){
      ownerUnsubscribe?.();ownerUnsubscribe=null;emit('syncing','Clearing old Openday sign-in…');
      try{await FAuth.signOut(auth)}catch{}
      lastAuthUid=null;emit(tokenRef?'synced':'local',tokenRef?'Synced with memorable token':'Old Openday sign-in cleared.');
    }else{
      ownerUnsubscribe?.();ownerUnsubscribe=null;
      if(!tokenRef)emit(uid?'error':'local',uid?'Different kk-syllabus account is signed in.':'Local only · enter memorable token to sync.');
    }
  }

  async function push(){
    await loadFirebase();
    if(!ownerConnected()&&!tokenRef)return false;
    const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);
    const json=JSON.stringify(state);lastLocal=json;emit('syncing','Saving…');
    try{
      const writes=[];
      if(ownerConnected()&&json!==lastOwner){
        window.FirebaseUsageMonitor?.write(1,'state-write','openday','kk-syllabus','(default)');
        writes.push(FStore.setDoc(ref,{app:'openday',state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp(),...(activeTokenHash?{activeTokenHash}:{})},{merge:true}).then(()=>{lastOwner=json}));
      }
      if(tokenRef&&json!==lastTokenState){
        window.FirebaseUsageMonitor?.write(1,'token-state-write','openday','kk-syllabus','(default)');
        writes.push(FStore.setDoc(tokenRef,{state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true}).then(()=>{lastTokenState=json}));
      }
      await Promise.all(writes);emit('synced',tokenRef?'Synced with memorable token':'Synced through Kk-syllabus');return true;
    }catch(error){emit('error',friendly(error));return false}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void push(),450)};

  async function connect(token){
    await loadFirebase();
    if(token!==undefined&&String(token)!==''){
      const value=String(token);const hash=await deriveTokenHash(value);
      await bindTokenHash(hash);localStorage.setItem(cfg.tokenKey,value);emit('synced','Synced with memorable token');return true;
    }
    if(!ownerConnected())throw new Error('owner-mismatch');
    await startOwner();return true;
  }

  async function setMemorableToken(token,{rotate=true,legacyRecovery=false}={}){
    await loadFirebase();if(!ownerConnected())throw new Error('owner-mismatch');
    const value=String(token??'');if(!value)throw new Error('Enter a memorable token.');
    const hash=await deriveTokenHash(value);
    const ownerSnap=await FStore.getDoc(ref),ownerData=ownerSnap.exists()?ownerSnap.data():{};
    const existingHash=ownerData.activeTokenHash||activeTokenHash||'';
    let merged=mergeStates(readLocal(),ownerData.state||{});
    if(existingHash){
      try{
        window.FirebaseUsageMonitor?.read(1,'token-state-reset-read','openday','kk-syllabus','(default)');
        const prior=await FStore.getDoc(FStore.doc(db,cfg.tokenCollection,existingHash));
        if(prior.exists())merged=mergeStates(merged,prior.data()?.state||{});
      }catch(error){console.warn('Could not merge prior memorable-token state before reset',error)}
    }
    merged.updatedAt=new Date().toISOString();writeLocal(merged);
    if(rotate&&existingHash&&existingHash!==hash){
      try{
        const oldRef=FStore.doc(db,cfg.tokenCollection,existingHash);
        window.FirebaseUsageMonitor?.write(1,'token-capability-rotate','openday','kk-syllabus','(default)');
        await FStore.setDoc(oldRef,{active:false,rotatedAt:FStore.serverTimestamp()},{merge:true});
      }catch(error){console.warn('Could not deactivate old memorable token',error)}
    }
    tokenUnsubscribe?.();tokenUnsubscribe=null;tokenRef=FStore.doc(db,cfg.tokenCollection,hash);activeTokenHash=hash;
    window.FirebaseUsageMonitor?.write(2,legacyRecovery?'token-legacy-restore':'token-capability-set','openday','kk-syllabus','(default)');
    await Promise.all([
      FStore.setDoc(tokenRef,{app:'openday',active:true,ownerUid:OWNER_UID,tokenHash:hash,state:merged,clientUpdatedAt:merged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true}),
      FStore.setDoc(ref,{app:'openday',state:merged,activeTokenHash:hash,clientUpdatedAt:merged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true})
    ]);
    lastOwner=JSON.stringify(merged);lastTokenState=JSON.stringify(merged);localStorage.setItem(cfg.tokenKey,value);startTokenListener();
    emit('synced',legacyRecovery?'Old memorable token restored':'Memorable token set and synced');return true;
  }

  async function resetMemorableToken(token){return setMemorableToken(token,{rotate:true})}
  function forgetToken(){localStorage.removeItem(cfg.tokenKey);tokenUnsubscribe?.();tokenUnsubscribe=null;tokenRef=null;activeTokenHash='';emit(ownerConnected()?'synced':'local',ownerConnected()?'Kk-syllabus sync remains connected.':'Memorable token forgotten on this device.')}
  const getToken=()=>rememberedToken();
  const hasToken=()=>!!rememberedToken();
  const setupLink=(token=rememberedToken())=>token?location.origin+location.pathname+'#sync='+encodeURIComponent(token):'';

  async function consumeSetupLink(){
    const raw=location.hash.startsWith('#')?location.hash.slice(1):'';if(!raw)return;
    const params=new URLSearchParams(raw),token=params.get('sync');if(token===null)return;
    params.delete('sync');history.replaceState(null,'',location.pathname+location.search+(params.toString()?'#'+params:''));
    try{await connect(token)}catch(error){emit('error',friendly(error))}
  }

  async function boot(){
    await loadFirebase();
    const token=rememberedToken();
    if(token){try{await bindTokenHash(await deriveTokenHash(token),{createIfOwner:ownerConnected()})}catch(error){if(ownerConnected())console.warn('Remembered token will need reset',error)}}
    if(ownerConnected())await startOwner();
    await consumeSetupLink();
    setInterval(()=>{if(!isConnected()||document.visibilityState!=='visible')return;const json=localJSON();if(json!==lastLocal){lastLocal=json;schedule()}},5000);
    window.addEventListener('online',()=>{if(tokenRef)bindTokenHash(activeTokenHash).catch(()=>{});if(ownerConnected())startOwner().catch(()=>{})});
  }

  const api={connect,push,schedule,isConnected,ownerConnected,tokenConnected,currentUser:()=>auth?.currentUser||null,loginUrl:cfg.loginUrl,ownerUid:()=>OWNER_UID,getToken,hasToken,setupLink,setMemorableToken,resetMemorableToken,forgetToken,deriveTokenHash};
  window.OpenDaySync=api;window.AppPlatform?.register?.('firebase-token-sync',api);boot().catch(error=>emit('error',friendly(error)));
})();
