(()=>{
  const cfg={
    endpoint:'https://europe-west2-kk-syllabus.cloudfunctions.net/opendaySync',
    tokenKey:'openday.sync.token.v1',
    stateKey:'openDayState',
    ...(window.OPENDAY_SYNC_CONFIG||{})
  };
  let token=localStorage.getItem(cfg.tokenKey)||'',lastLocal='',lastRemote='',timer=null,busy=false;
  const emit=(state,text)=>{
    const detail={state,text,connected:!!token};
    window.dispatchEvent(new CustomEvent('openday:sync-status',{detail}));
    window.AppPlatform?.emit?.('sync:status',detail);
  };
  const cleanToken=value=>String(value||'').trim();
  const readLocal=()=>{try{return JSON.parse(localStorage.getItem(cfg.stateKey)||'{}')}catch{return{}}};
  const writeLocal=value=>localStorage.setItem(cfg.stateKey,JSON.stringify(value||{}));
  const localJSON=()=>JSON.stringify(readLocal());
  const stamp=value=>({...value,updatedAt:new Date().toISOString()});

  function consumeSetupLink(){
    const raw=location.hash.startsWith('#')?location.hash.slice(1):'';
    const params=new URLSearchParams(raw);
    const fromLink=cleanToken(params.get('sync'));
    if(!fromLink)return;
    token=fromLink;localStorage.setItem(cfg.tokenKey,token);
    params.delete('sync');
    const rest=params.toString();
    history.replaceState(null,'',location.pathname+location.search+(rest?`#${rest}`:''));
  }
  consumeSetupLink();

  async function request(method,state){
    if(!token)throw new Error('No sync token');
    const res=await fetch(cfg.endpoint,{
      method,
      mode:'cors',
      cache:'no-store',
      headers:{'Content-Type':'application/json','X-OpenDay-Token':token},
      body:method==='POST'?JSON.stringify({state}):undefined
    });
    if(res.status===401||res.status===403)throw new Error('Token not recognised');
    if(!res.ok)throw new Error(`Sync service unavailable (${res.status})`);
    return res.status===204?{}:res.json();
  }

  async function postLocal({restamp=true}={}){
    let state=readLocal();
    if(restamp){state=stamp(state);writeLocal(state)}
    const json=JSON.stringify(state);
    await request('POST',state);
    lastLocal=json;lastRemote=json;
    return state;
  }

  async function pull(){
    if(!token||busy)return false;busy=true;emit('syncing','Checking cloud…');
    try{
      const body=await request('GET'),remote=body?.state||null;
      if(!remote){await postLocal();emit('synced','Synced');return true}
      const remoteJSON=JSON.stringify(remote),local=readLocal();
      const remoteTime=Date.parse(remote.updatedAt||0),localTime=Date.parse(local.updatedAt||0);
      lastRemote=remoteJSON;
      if(remoteTime>localTime){
        writeLocal(remote);lastLocal=remoteJSON;
        window.dispatchEvent(new CustomEvent('openday:cloud-state',{detail:remote}));
      }else if(JSON.stringify(local)!==remoteJSON){
        await postLocal();
      }else lastLocal=remoteJSON;
      emit('synced','Synced');return true;
    }catch(error){emit('error',error.message);return false}finally{busy=false}
  }

  async function push(){
    if(!token||busy)return false;
    const current=localJSON();if(current===lastRemote)return true;
    busy=true;emit('syncing','Saving…');
    try{await postLocal();emit('synced','Synced');return true}
    catch(error){emit('error',error.message);return false}
    finally{busy=false}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(push,500)}
  async function connect(value){
    const next=cleanToken(value);
    if(next.length<16)throw new Error('Use a memorable phrase of at least 16 characters.');
    token=next;localStorage.setItem(cfg.tokenKey,token);emit('syncing','Connecting…');
    const ok=await pull();if(!ok)throw new Error('Could not connect. Check the token or sync service.');return true;
  }
  function disconnect(){token='';localStorage.removeItem(cfg.tokenKey);lastLocal='';lastRemote='';emit('local','Local only')}
  function setupLink(){if(!token)return'';return `${location.origin}${location.pathname}#sync=${encodeURIComponent(token)}`}
  function hasToken(){return!!token}
  function getToken(){return token}

  setInterval(()=>{
    if(!token)return;
    const json=localJSON();
    if(json!==lastLocal&&json!==lastRemote){lastLocal=json;schedule()}
  },900);
  window.addEventListener('online',()=>token&&pull());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&token)pull()});

  const api={connect,disconnect,pull,push,schedule,setupLink,hasToken,getToken,endpoint:cfg.endpoint};
  window.OpenDaySync=api;window.AppPlatform?.register('shared-token-sync',api);
  if(token)pull();else emit('local','Local only');
})();
