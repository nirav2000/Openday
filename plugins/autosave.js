(()=>{
  const timers=new WeakMap();
  function attach(element,{delay=450,save,status}={}){
    if(!element||typeof save!=='function')return()=>{};
    const run=()=>{
      clearTimeout(timers.get(element));
      status?.('saving');
      timers.set(element,setTimeout(async()=>{
        try{await save(element.value,element);status?.('saved')}catch(error){console.warn('Autosave failed',error);status?.('error')}
      },delay));
    };
    element.addEventListener('input',run);
    element.addEventListener('change',run);
    return()=>{clearTimeout(timers.get(element));element.removeEventListener('input',run);element.removeEventListener('change',run)};
  }
  window.AppPlatform?.register('autosave',{attach});
})();
