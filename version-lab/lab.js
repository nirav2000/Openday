(()=>{
  const start=()=>{
    if(!window.AppsVersionLab?.mount){
      const pill=document.getElementById('currentPill');
      if(pill)pill.textContent='Version Lab unavailable';
      return;
    }
    window.AppsVersionLab.mount({
      appId:'openday',
      appUrl:'../',
      versionUrl:'../version.json',
      manifestUrl:'manifest.json',
      releasesUrl:'releases.json',
      repoUrl:'https://github.com/nirav2000/Openday',
      notesKey:'openday.version-lab.notes.v1'
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();