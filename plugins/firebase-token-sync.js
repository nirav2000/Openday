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
  let FApp,FAuth,FStore,auth,db,ref,OWNER_UID='',tokenRef=null,activeTokenHash='',lastRemote='',lastLocal='',timer=null,booted=false;

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
  const isConnected=()=>tokenConnected()||ownerConnected();
  const rememberedToken=()=>localStorage.getItem(cfg.tokenKey)||'';
  const emit=(state,text)=>{
    const detail={state,text,connected:isConnected(),ownerConnected:ownerConnected(),tokenConnected:tokenConnected(),hasRememberedToken:!!rememberedToken()};
    window.dispatchEvent(new CustomEvent('openday:sync-status',{detail}));
    window.AppPlatform?.emit?.('sync:status',detail);
  };
  const friendly=error=>{
    const code=error?.code||'';
    if(code.includes('permission-denied'))return'Cloud access was denied. Check the memorable token.';
    if(error?.message==='owner-mismatch')return'This recovery action needs the authorised Firebase owner session.';
    if(error?.message==='token-not-recognised')return'Memorable token not recognised.';
    return error?.message||'Sync unavailable.';
  };

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
    FAuth.onAuthStateChanged(auth,user=>{
      if(!booted)return;
      if(user?.email===cfg.legacyEmail){FAuth.signOut(auth).catch(()=>{});return}
      if(user?.uid===OWNER_UID&&!rememberedToken()&&!tokenRef)refreshOwnerOnce().catch(()=>{});
    });
  }

  function applyRemote(remote){
    const local=normalise(readLocal()),merged=mergeStates(local,remote),mergedJSON=JSON.stringify(merged);
    if(JSON.stringify(local)!==mergedJSON){
      writeLocal(merged);
      window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:merged}));
    }
    lastLocal=mergedJSON;
    lastRemote=JSON.stringify(normalise(remote||{}));
    return merged;
  }

  async function readTokenOnce(refToRead=tokenRef){
    if(!refToRead)return false;
    window.FirebaseUsageMonitor?.read(1,'token-state-read','openday','kk-syllabus','(default)');
    const snap=await FStore.getDoc(refToRead);
    if(!snap.exists())throw new Error('token-not-recognised');
    const data=snap.data()||{};
    if(data.app!=='openday'||data.active!==true)throw new Error('token-not-recognised');
    applyRemote(data.state||{});
    emit('synced','Synced · loaded once');
    return true;
  }

  async function refreshOwnerOnce(){
    await loadFirebase();if(!ownerConnected())return false;
    window.FirebaseUsageMonitor?.read(1,'owner-state-read','openday','kk-syllabus','(default)');
    const snap=await FStore.getDoc(ref),data=snap.exists()?snap.data():{};
    applyRemote(data.state||{});
    return data;
  }

  async function bindTokenHash(hash,{createIfOwner=false}={}){
    if(!hash)return false;
    await loadFirebase();
    const candidate=FStore.doc(db,cfg.tokenCollection,hash);
    try{
      await readTokenOnce(candidate);
      tokenRef=candidate;activeTokenHash=hash;
      return true;
    }catch(error){
      if(error?.message!=='token-not-recognised'||!createIfOwner||!ownerConnected())throw error;
      const ownerData=await refreshOwnerOnce();
      const state=mergeStates(readLocal(),ownerData?.state||{});state.updatedAt=new Date().toISOString();writeLocal(state);
      window.FirebaseUsageMonitor?.write(1,'token-capability-create','openday','kk-syllabus','(default)');
      await FStore.setDoc(candidate,{app:'openday',active:true,ownerUid:OWNER_UID,tokenHash:hash,state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()});
      tokenRef=candidate;activeTokenHash=hash;lastRemote=JSON.stringify(state);lastLocal=lastRemote;
      emit('synced','Memorable token restored');
      return true;
    }
  }

  async function refresh(){
    await loadFirebase();
    emit('syncing','Refreshing cloud data…');
    try{
      if(tokenRef)return await readTokenOnce(tokenRef);
      const token=rememberedToken();
      if(token){
        const hash=await deriveTokenHash(token);
        return await bindTokenHash(hash,{createIfOwner:ownerConnected()});
      }
      if(ownerConnected()){
        await refreshOwnerOnce();emit('synced','Owner recovery data refreshed');return true;
      }
      emit('local','Enter memorable token to sync');return false;
    }catch(error){emit('error',friendly(error));throw error}
  }

  async function push(){
    await loadFirebase();
    const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);
    const json=JSON.stringify(state);lastLocal=json;
    if(!tokenRef&&!ownerConnected()){emit('local','Saved on device · not connected');return false}
    emit('syncing','Saving to cloud…');
    try{
      if(tokenRef){
        if(json===lastRemote){emit('synced','Already synced');return true}
        window.FirebaseUsageMonitor?.write(1,'token-state-write','openday','kk-syllabus','(default)');
        await FStore.setDoc(tokenRef,{state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
        lastRemote=json;
      }else{
        window.FirebaseUsageMonitor?.write(1,'owner-state-write','openday','kk-syllabus','(default)');
        await FStore.setDoc(ref,{app:'openday',state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
        lastRemote=json;
      }
      emit('synced','Saved & synced');return true;
    }catch(error){emit('error',friendly(error));return false}
  }

  const schedule=()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>void push(),900);
  };

  async function connect(token){
    await loadFirebase();
    if(token!==undefined&&String(token)!==''){
      const value=String(token),hash=await deriveTokenHash(value);
      await bindTokenHash(hash,{createIfOwner:ownerConnected()});
      localStorage.setItem(cfg.tokenKey,value);
      emit('synced','Synced with memorable token');
      return true;
    }
    if(ownerConnected()){await refreshOwnerOnce();emit('synced','Owner recovery data loaded');return true}
    throw new Error('owner-mismatch');
  }

  async function setMemorableToken(token,{rotate=true,legacyRecovery=false}={}){
    await loadFirebase();if(!ownerConnected())throw new Error('owner-mismatch');
    const value=String(token??'');if(!value)throw new Error('Enter a memorable token.');
    const hash=await deriveTokenHash(value);
    const ownerData=await refreshOwnerOnce()||{};
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
    tokenRef=FStore.doc(db,cfg.tokenCollection,hash);activeTokenHash=hash;
    window.FirebaseUsageMonitor?.write(2,legacyRecovery?'token-legacy-restore':'token-capability-set','openday','kk-syllabus','(default)');
    await Promise.all([
      FStore.setDoc(tokenRef,{app:'openday',active:true,ownerUid:OWNER_UID,tokenHash:hash,state:merged,clientUpdatedAt:merged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true}),
      FStore.setDoc(ref,{app:'openday',state:merged,activeTokenHash:hash,clientUpdatedAt:merged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true})
    ]);
    lastRemote=JSON.stringify(merged);lastLocal=lastRemote;localStorage.setItem(cfg.tokenKey,value);
    emit('synced',legacyRecovery?'Old memorable token restored':'Memorable token set and synced');
    return true;
  }

  async function resetMemorableToken(token){return setMemorableToken(token,{rotate:true})}
  function forgetToken(){localStorage.removeItem(cfg.tokenKey);tokenRef=null;activeTokenHash='';emit(ownerConnected()?'synced':'local',ownerConnected()?'Recovery session remains available.':'Memorable token forgotten on this device.')}
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
    await loadFirebase();booted=true;
    const token=rememberedToken();
    if(token){
      try{await bindTokenHash(await deriveTokenHash(token),{createIfOwner:ownerConnected()})}
      catch(error){
        if(ownerConnected()){
          try{await refreshOwnerOnce()}catch{}
        }
        emit('error',friendly(error));
      }
    }else if(ownerConnected()){
      try{await refreshOwnerOnce();emit('synced','Recovery data loaded once')}catch(error){emit('error',friendly(error))}
    }else emit('local','Local data loaded · enter token to sync');
    await consumeSetupLink();
  }

  const api={connect,push,schedule,refresh,isConnected,ownerConnected,tokenConnected,currentUser:()=>auth?.currentUser||null,loginUrl:cfg.loginUrl,ownerUid:()=>OWNER_UID,getToken,hasToken,setupLink,setMemorableToken,resetMemorableToken,forgetToken,deriveTokenHash};
  window.OpenDaySync=api;window.AppPlatform?.register?.('firebase-token-sync',api);boot().catch(error=>emit('error',friendly(error)));
})();
