(()=>{
  function createVersionLab({appId='app',currentVersion='0.0.0',storageKey=`${appId}.versionLab.v1`}={}){
    const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'{"releases":[],"decisions":{}}')}catch{return{releases:[],decisions:{}}}};
    const write=data=>{localStorage.setItem(storageKey,JSON.stringify(data));window.AppPlatform?.emit?.('version-lab:changed',data);return data};
    const recordRelease=release=>{const data=read(),item={version:release.version||currentVersion,date:release.date||new Date().toISOString().slice(0,10),summary:release.summary||'',areas:Array.isArray(release.areas)?release.areas:[]};const i=data.releases.findIndex(r=>r.version===item.version);if(i<0)data.releases.unshift(item);else data.releases[i]=item;return write(data)};
    const decide=(version,area,decision,note='')=>{const data=read();data.decisions[`${version}:${area}`]={decision,note,updatedAt:new Date().toISOString()};write(data);return data.decisions[`${version}:${area}`]};
    const developmentBrief=(version=currentVersion)=>{const data=read(),release=data.releases.find(r=>r.version===version);if(!release)return'';const lines=[`# ${appId} development brief`, `Version: ${version}`, '', release.summary, ''];for(const area of release.areas){const d=data.decisions[`${version}:${area}`]||{decision:'UNDECIDED',note:''};lines.push(`## ${area}`,`Decision: ${String(d.decision).toUpperCase()}`,d.note||'No additional note.','')}return lines.join('\n')};
    const api={read,recordRelease,decide,developmentBrief};window.AppPlatform?.register?.('version-lab',api);return api;
  }
  window.createVersionLab=createVersionLab;
})();
