(()=>{
  const defaults={storageKey:'app.developerNotes.v1',appId:'app',version:'0.0.0'};
  function createDeveloperNotes(options={}){
    const cfg={...defaults,...options};
    const read=()=>{try{return JSON.parse(localStorage.getItem(cfg.storageKey)||'[]')}catch{return[]}};
    const write=notes=>{localStorage.setItem(cfg.storageKey,JSON.stringify(notes));window.AppPlatform?.emit?.('developer-notes:changed',notes);return notes};
    const upsert=note=>{
      const notes=read(),now=new Date().toISOString(),item={id:note.id||crypto.randomUUID(),text:String(note.text||'').trim(),status:note.status||'open',page:note.page||location.pathname+location.hash,app:cfg.appId,version:cfg.version,createdAt:note.createdAt||now,updatedAt:now,...note};
      const i=notes.findIndex(x=>x.id===item.id);if(i<0)notes.push(item);else notes[i]=item;write(notes);return item;
    };
    const archive=id=>{const notes=read(),n=notes.find(x=>x.id===id);if(n){n.status='archived';n.updatedAt=new Date().toISOString();write(notes)}return n};
    const open=()=>read().filter(n=>n.status!=='archived');
    const reviewPack=()=>JSON.stringify({app:cfg.appId,version:cfg.version,generatedAt:new Date().toISOString(),notes:open()},null,2);
    const api={read,write,upsert,archive,open,reviewPack};
    window.AppPlatform?.register?.('developer-notes',api);return api;
  }
  window.createDeveloperNotes=createDeveloperNotes;
})();
