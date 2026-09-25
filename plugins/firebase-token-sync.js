(()=>{
  const cfg={
    stateKey:'openDayState',
    documentPath:['app_private_state','openday'],
    tokenCollection:'openday_sync',
    tokenKey:'openday.sync.token.v1',
    stateBackupKey:'openday.state.before-token-connect.v1',
    loginUrl:'https://nirav2000.github.io/Kk-syllabus/',
    legacyEmail:'openday-sync@nirav2000.github.io',
    tokenSalt:'Openday memorable token v2 | kk-syllabus'
  };
  let FApp,FAuth,FStore,auth,db,ref,OWNER_UID='',tokenRef=null,activeTokenHash='',lastRemote='',lastLocal='',timer=null,booted=false;

  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(cfg.stateKey)||'{}')}catch{return{}}};
  const writeLocal=data=>localStorage.setItem(cfg.stateKey,JSON.stringify(data||{}));
  const backupLocal=()=>{try{localStorage.setItem(cfg.stateBackupKey,JSON.stringify({savedAt:new Date().toISOString(),state:readLocal()}))}catch{}};
  const normalise=data=>({
    saved:Array.isArray(data?.saved)?data.saved:[],
    booked:data?.booked||{},
    notes:data?.notes||{},
    watchBooking:Array.isArray(data?.watchBooking)?data.watchBooking:[],
    schoolDecisions:data?.schoolDecisions&&typeof data.schoolDecisions==='object'?data.schoolDecisions:{},
    eventOverrides:data?.eventOverrides&&typeof data.eventOverrides==='object'?data.eventOverrides:{},
    mergeConflicts:data?.mergeConflicts&&typeof data.mergeConflicts==='object'?data.mergeConflicts:{},
    updatedAt:data?.updatedAt||''
  });
  const mergeStates=(aInput,bInput)=>{
    const a=normalise(aInput),b=normalise(bInput);
    const at=Date.parse(a.updatedAt||0)||0,bt=Date.parse(b.updatedAt||0)||0,aNewer=at>=bt;
    const conflicts={...(b.mergeConflicts||{}),...(a.mergeConflicts||{})};
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
    const mergeMap=(field,aMap={},bMap={})=>{
      const out={},keys=new Set([...Object.keys(bMap),...Object.keys(aMap)]);
      for(const key of keys){
        const hasA=Object.prototype.hasOwnProperty.call(aMap,key),hasB=Object.prototype.hasOwnProperty.call(bMap,key);
        if(hasA&&hasB&&!same(aMap[key],bMap[key])){
          const id=field+':'+key;
          const prior=conflicts[id]||{};
          conflicts[id]={
            field,key,
            local:aMap[key],
            cloud:bMap[key],
            localUpdatedAt:a.updatedAt||'',
            cloudUpdatedAt:b.updatedAt||'',
            firstSeenAt:prior.firstSeenAt||new Date().toISOString(),
            status:'unresolved'
          };
        }
        if(hasA&&hasB)out[key]=aNewer?aMap[key]:bMap[key];
        else if(hasA)out[key]=aMap[key];
        else out[key]=bMap[key];
      }
      return out;
    };
    return {
      saved:[...new Set([...(b.saved||[]),...(a.saved||[])])],
      booked:mergeMap('booked',a.booked,b.booked),
      notes:mergeMap('notes',a.notes,b.notes),
      watchBooking:[...new Set([...(b.watchBooking||[]),...(a.watchBooking||[])])],
      schoolDecisions:mergeMap('schoolDecisions',a.schoolDecisions,b.schoolDecisions),
      eventOverrides:mergeMap('eventOverrides',a.eventOverrides,b.eventOverrides),
      mergeConflicts:conflicts,
      updatedAt:new Date(Math.max(at,bt)||Date.now()).toISOString()
    };
  };
  const mergeThreeWay=(baseInput,localInput,remoteInput)=>{
    const base=normalise(baseInput),local=normalise(localInput),remote=normalise(remoteInput),now=new Date().toISOString();
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const conflicts={...(remote.mergeConflicts||{}),...(local.mergeConflicts||{})};
    const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
    const mergeMap=(field,baseMap={},localMap={},remoteMap={})=>{
      const out={},keys=new Set([...Object.keys(baseMap),...Object.keys(localMap),...Object.keys(remoteMap)]);
      for(const key of keys){
        const bp=has(baseMap,key),lp=has(localMap,key),rp=has(remoteMap,key);
        const bv=bp?baseMap[key]:null,lv=lp?localMap[key]:null,rv=rp?remoteMap[key]:null;
        const localChanged=lp!==bp||(lp&&bp&&!same(lv,bv));
        const remoteChanged=rp!==bp||(rp&&bp&&!same(rv,bv));
        let present,value;
        if(localChanged&&!remoteChanged){present=lp;value=lv}
        else if(!localChanged&&remoteChanged){present=rp;value=rv}
        else if(localChanged&&remoteChanged){
          if(lp===rp&&(!lp||same(lv,rv))){present=lp;value=lv}
          else{
            present=lp;value=lv;
            const id=field+':'+key,prior=conflicts[id]||{};
            conflicts[id]={
              field,key,
              localPresent:lp,cloudPresent:rp,
              local:lp?lv:null,cloud:rp?rv:null,
              localUpdatedAt:local.updatedAt||'',cloudUpdatedAt:remote.updatedAt||'',
              firstSeenAt:prior.firstSeenAt||now,status:'unresolved'
            };
          }
        }else{present=rp;value=rv}
        if(present)out[key]=value;
      }
      return out;
    };
    const mergeMembership=(baseList=[],localList=[],remoteList=[])=>{
      const b=new Set(baseList),l=new Set(localList),r=new Set(remoteList),out=new Set(),keys=new Set([...b,...l,...r]);
      for(const key of keys){
        const bv=b.has(key),lv=l.has(key),rv=r.has(key),lc=lv!==bv,rc=rv!==bv;
        const chosen=lc&&!rc?lv:!lc&&rc?rv:lc&&rc?lv:rv;
        if(chosen)out.add(key);
      }
      return [...out];
    };
    return {
      saved:mergeMembership(base.saved,local.saved,remote.saved),
      booked:mergeMap('booked',base.booked,local.booked,remote.booked),
      notes:mergeMap('notes',base.notes,local.notes,remote.notes),
      watchBooking:mergeMembership(base.watchBooking,local.watchBooking,remote.watchBooking),
      schoolDecisions:mergeMap('schoolDecisions',base.schoolDecisions,local.schoolDecisions,remote.schoolDecisions),
      eventOverrides:mergeMap('eventOverrides',base.eventOverrides,local.eventOverrides,remote.eventOverrides),
      mergeConflicts:conflicts,
      updatedAt:now
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
      window.AppsAuth?.setAppIdentity(user,{app:'Openday'});
      if(!booted)return;
      if(user?.email===cfg.legacyEmail){FAuth.signOut(auth).catch(()=>{});return}
      if(user?.uid===OWNER_UID&&!rememberedToken()&&!tokenRef)refreshOwnerOnce().catch(()=>{});
    });
  }

  function applyRemote(remote){
    const local=normalise(readLocal()),merged=mergeStates(local,remote),mergedJSON=JSON.stringify(merged),remoteJSON=JSON.stringify(normalise(remote||{}));
    if(JSON.stringify(local)!==mergedJSON){
      writeLocal(merged);
      window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:merged}));
    }
    lastLocal=mergedJSON;
    lastRemote=remoteJSON;
    return {merged,mergedJSON,remoteJSON,needsCloudWrite:mergedJSON!==remoteJSON};
  }

  async function readTokenOnce(refToRead=tokenRef){
    if(!refToRead)return false;
    window.FirebaseUsageMonitor?.read(1,'token-state-read','openday','kk-syllabus','(default)');
    const snap=await FStore.getDoc(refToRead);
    if(!snap.exists())throw new Error('token-not-recognised');
    const data=snap.data()||{};
    if(data.app!=='openday'||data.active!==true)throw new Error('token-not-recognised');
    const merge=applyRemote(data.state||{});
    emit('synced','Synced · loaded once');
    return merge;
  }

  async function refreshOwnerOnce(){
    await loadFirebase();if(!ownerConnected())return false;
    window.FirebaseUsageMonitor?.read(1,'owner-state-read','openday','kk-syllabus','(default)');
    const snap=await FStore.getDoc(ref),data=snap.exists()?snap.data():{};
    applyRemote(data.state||{});
    return data;
  }

  async function bindTokenHash(hash,{createIfOwner=false,pushMerged=false}={}){
    if(!hash)return false;
    await loadFirebase();
    const candidate=FStore.doc(db,cfg.tokenCollection,hash);
    try{
      const merge=await readTokenOnce(candidate);
      tokenRef=candidate;activeTokenHash=hash;
      if(pushMerged&&merge?.needsCloudWrite){
        window.FirebaseUsageMonitor?.write(1,'token-recovery-merge-write','openday','kk-syllabus','(default)');
        const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);
        await FStore.setDoc(candidate,{state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
        lastRemote=JSON.stringify(state);lastLocal=lastRemote;
        emit('synced','Local and cloud data merged & synced');
      }
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
    let local=normalise(readLocal());
    local.updatedAt=new Date().toISOString();
    writeLocal(local);
    if(!tokenRef&&!ownerConnected()){lastLocal=JSON.stringify(local);emit('local','Saved on device · not connected');return false}
    emit('syncing','Reading latest cloud data…');
    try{
      const target=tokenRef||ref;
      let finalMerged=null;
      window.FirebaseUsageMonitor?.read(1,tokenRef?'token-prewrite-read':'owner-prewrite-read','openday','kk-syllabus','(default)');
      window.FirebaseUsageMonitor?.write(1,tokenRef?'token-merge-write':'owner-merge-write','openday','kk-syllabus','(default)');
      await FStore.runTransaction(db,async tx=>{
        const snap=await tx.get(target);
        if(tokenRef){
          if(!snap.exists())throw new Error('token-not-recognised');
          const data=snap.data()||{};
          if(data.app!=='openday'||data.active!==true)throw new Error('token-not-recognised');
        }
        const remote=snap.exists()?(snap.data()?.state||{}):{};
        let base={};
        try{base=lastRemote?JSON.parse(lastRemote):{}}catch{}
        finalMerged=lastRemote?mergeThreeWay(base,local,remote):mergeStates(local,remote);
        finalMerged.updatedAt=new Date().toISOString();
        if(tokenRef){
          tx.set(target,{state:finalMerged,clientUpdatedAt:finalMerged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
        }else{
          tx.set(target,{app:'openday',state:finalMerged,clientUpdatedAt:finalMerged.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});
        }
      });
      const merged=normalise(finalMerged||local),mergedJSON=JSON.stringify(merged);
      writeLocal(merged);lastLocal=mergedJSON;lastRemote=mergedJSON;
      window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:merged}));
      const conflicts=Object.values(merged.mergeConflicts||{}).filter(x=>x?.status!=='resolved').length;
      emit('synced',conflicts?'Saved, merged & synced · '+conflicts+' difference'+(conflicts===1?'':'s')+' preserved':'Saved, merged & synced');
      return true;
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
      backupLocal();
      await bindTokenHash(hash,{createIfOwner:ownerConnected(),pushMerged:true});
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

  const api={connect,push,schedule,refresh,isConnected,ownerConnected,tokenConnected,currentUser:()=>auth?.currentUser||null,loginUrl:cfg.loginUrl,ownerUid:()=>OWNER_UID,getToken,hasToken,setupLink,setMemorableToken,resetMemorableToken,forgetToken,deriveTokenHash,mergeStates,mergeThreeWay,normalise,readLocal};
  window.OpenDaySync=api;window.AppPlatform?.register?.('firebase-token-sync',api);boot().catch(error=>emit('error',friendly(error)));
})();
