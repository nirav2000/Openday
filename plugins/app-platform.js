(()=>{
  const plugins=new Map(),listeners=new Map();
  const api={
    register(name,plugin){plugins.set(name,plugin);api.emit('plugin:registered',{name,plugin});return plugin},
    get(name){return plugins.get(name)},
    has(name){return plugins.has(name)},
    on(name,fn){const set=listeners.get(name)||new Set();set.add(fn);listeners.set(name,set);return()=>set.delete(fn)},
    emit(name,detail){for(const fn of listeners.get(name)||[])try{fn(detail)}catch(error){console.warn('AppPlatform listener failed',name,error)}window.dispatchEvent(new CustomEvent(`app:${name}`,{detail}))}
  };
  window.AppPlatform=window.AppPlatform||api;
})();
