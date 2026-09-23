(()=>{
  const cfg={loginEmail:'openday-sync@nirav2000.github.io',stateKey:'openDayState',documentPath:['app_private_state','openday']};
  let FApp,FAuth,FStore,auth,db,ref,unsubscribe=null,lastRemote='',lastLocal='',timer=null,lastToken='';
  const emit=(state,text)=>{const detail={state,text,connected:!!auth?.currentUser};window.dispatchEvent(new CustomEvent('openday:sync-status',{detail}));window.AppPlatform?.emit?.('sync:status',detail)};
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(cfg.stateKey)||'{}')}catch{return{}}};
  const writeLocal=data=>localStorage.setItem(cfg.stateKey,JSON.stringify(data||{}));
  const normalise=data=>({saved:Array.isArray(data.saved)?data.saved:[],booked:data.booked||{},notes:data.notes||{},watchBooking:Array.isArray(data.watchBooking)?data.watchBooking:[],updatedAt:data.updatedAt||''});
  const localJSON=()=>JSON.stringify(normalise(readLocal()));
  const emitCatalog=data=>{try{const detail={senior:data?.catalogSenior?JSON.parse(data.catalogSenior):null,primary:data?.catalogPrimary?JSON.parse(data.catalogPrimary):null,enhancements:data?.catalogEnhancements?JSON.parse(data.catalogEnhancements):null,version:data?.catalogVersion||'',updatedAt:data?.catalogUpdatedAt?.toDate?.()?.toISOString?.()||''};if(detail.senior||detail.primary){window.OpenDayCatalog=detail;window.dispatchEvent(new CustomEvent('openday:catalog-state',{detail}));window.AppPlatform?.emit?.('catalog:state',detail)}}catch(error){console.warn('Could not read cloud school catalogue',error)}};
  const friendly=error=>{const code=error?.code||'';if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return'Token not recognised.';if(code.includes('operation-not-allowed'))return'Enable Email/Password sign-in in Firebase Authentication first.';if(code.includes('permission-denied'))return'Firestore rules do not yet allow the Openday sync user.';return error?.message||'Sync unavailable.'};

  async function loadFirebase(){
    if(auth)return;
    const [{firebaseConfig},appMod,authMod,storeMod]=await Promise.all([
      import('/Kk-syllabus/src/firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
    ]);
    FApp=appMod;FAuth=authMod;FStore=storeMod;
    const app=FApp.getApps().length?FApp.getApp():FApp.initializeApp(firebaseConfig);
    auth=FAuth.getAuth(app);await FAuth.setPersistence(auth,FAuth.browserLocalPersistence);db=FStore.getFirestore(app);ref=FStore.doc(db,...cfg.documentPath);
    FAuth.onAuthStateChanged(auth,user=>{if(user){emit('syncing','Connecting…');startRealtime().catch(error=>emit('error',friendly(error)))}else{unsubscribe?.();unsubscribe=null;emit('local','Local only')}});
  }

  async function startRealtime(){
    unsubscribe?.();unsubscribe=null;
    window.FirebaseUsageMonitor?.read(1,'state-read','openday');const snap=await FStore.getDoc(ref),local=normalise(readLocal());
    if(snap.exists()){emitCatalog(snap.data());if(snap.data()?.state){const remote=normalise(snap.data().state),json=JSON.stringify(remote);lastRemote=json;if(Date.parse(remote.updatedAt||0)>Date.parse(local.updatedAt||0)){writeLocal(remote);lastLocal=json;window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:remote}))}else if(localJSON()!==json)await push()}else await push()}else await push();
    window.FirebaseUsageMonitor?.listener(1,'state-listener','openday');unsubscribe=FStore.onSnapshot(ref,s=>{const data=s.data()||{};emitCatalog(data);const remote=data.state;if(remote){const n=normalise(remote),json=JSON.stringify(n);lastRemote=json;const localNow=normalise(readLocal());if(Date.parse(n.updatedAt||0)>Date.parse(localNow.updatedAt||0)){writeLocal(n);lastLocal=json;window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:n}))}}emit('synced','Synced')},error=>emit('error',friendly(error)));
    emit('synced','Synced');
  }

  async function push(){await loadFirebase();if(!auth.currentUser)return false;const state=normalise(readLocal());state.updatedAt=new Date().toISOString();writeLocal(state);const json=JSON.stringify(state);if(json===lastRemote)return true;emit('syncing','Saving…');try{window.FirebaseUsageMonitor?.write(1,'state-write','openday');await FStore.setDoc(ref,{app:'openday',state,clientUpdatedAt:state.updatedAt,updatedAt:FStore.serverTimestamp()},{merge:true});lastLocal=json;lastRemote=json;emit('synced','Synced');return true}catch(error){emit('error',friendly(error));return false}}
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(push,450)};
  async function connect(token){const password=String(token??'');await loadFirebase();lastToken=password;emit('syncing','Connecting…');try{await FAuth.signInWithEmailAndPassword(auth,cfg.loginEmail,password);await startRealtime();return true}catch(error){emit('error',friendly(error));throw new Error(friendly(error))}}
  async function disconnect(){await loadFirebase();unsubscribe?.();unsubscribe=null;lastToken='';await FAuth.signOut(auth);emit('local','Local only')}
  const setupLink=(token=lastToken)=>token!==''?`${location.origin}${location.pathname}#sync=${encodeURIComponent(token)}`:'';
  const hasToken=()=>!!auth?.currentUser,getToken=()=>lastToken,currentUser=()=>auth?.currentUser||null;
  async function consumeSetupLink(){const raw=location.hash.startsWith('#')?location.hash.slice(1):'';if(!raw)return;const params=new URLSearchParams(raw),token=params.get('sync');if(token===null)return;params.delete('sync');history.replaceState(null,'',location.pathname+location.search+(params.toString()?`#${params}`:''));try{await connect(token)}catch(error){console.warn('Setup-link sync failed',error)}}
  async function boot(){await loadFirebase();if(auth.currentUser)await startRealtime();await consumeSetupLink();setInterval(()=>{if(!auth.currentUser||document.visibilityState!=='visible')return;const json=localJSON();if(json!==lastLocal&&json!==lastRemote){lastLocal=json;schedule()}},5000);window.addEventListener('online',()=>auth.currentUser&&startRealtime().catch(()=>{})}
  const api={connect,disconnect,push,schedule,setupLink,hasToken,getToken,currentUser,loginEmail:cfg.loginEmail};window.OpenDaySync=api;window.AppPlatform?.register?.('firebase-token-sync',api);boot().catch(error=>emit('error',friendly(error)));
})();
