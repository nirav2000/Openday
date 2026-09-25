(()=>{
  const style=document.createElement('style');
  style.textContent=`
    [hidden]{display:none!important}
    .header-actions{display:flex;align-items:center;gap:8px}.version-link{border:1px solid #7892aa;background:#ffffff12;color:#fff;border-radius:999px;padding:8px 10px;font-size:.72rem;font-weight:800;text-decoration:none}
    .sync-pill{border:1px solid #7892aa;background:#ffffff12;color:#fff;border-radius:999px;padding:8px 10px;font-size:.72rem;font-weight:800;display:inline-flex;align-items:center;gap:6px}
    .sync-dot{width:7px;height:7px;border-radius:50%;background:#aab8c4}.sync-pill[data-state="synced"] .sync-dot{background:#5ee0ae}.sync-pill[data-state="syncing"] .sync-dot{background:#ffca58}.sync-pill[data-state="error"] .sync-dot{background:#ff8585}
    .autosave-status{font-size:.76rem;color:#61758a;margin:6px 0 12px;min-height:1.1em}
    .decision-panel{margin:14px 0;padding:13px;background:#f7f9fb;border:1px solid #dce5ed;border-radius:12px}
    .decision-panel h3{margin:4px 0 9px}
    .decision-options{display:flex;gap:7px;flex-wrap:wrap}
    .decision-options button{border:1px solid #c9d6e2;background:white;color:#29445d;border-radius:999px;padding:8px 11px;font:inherit;font-size:.82rem;font-weight:700}
    .decision-options button.selected{border-color:#1769aa;background:#eaf4fc;color:#10558d}.autosave-status.saved{color:#15805d}.autosave-status.error{color:#b94444}
    .calendar-action{gap:7px}.calendar-action .calendar-glyph{font-size:1.05rem}
    .feed-label{display:block;margin:14px 0 6px;font-size:.76rem;font-weight:800;color:#61758a;text-transform:uppercase;letter-spacing:.06em}
    .feed-copy{display:grid;grid-template-columns:1fr auto;gap:7px}.feed-copy input{min-width:0;border:1px solid #dce5ed;border-radius:10px;padding:10px;font:inherit;color:#102a43;background:#f8fafb}.feed-copy button{border:1px solid #dce5ed;border-radius:10px;background:white;color:#1769aa;font-weight:750;padding:8px 12px}
    .sync-dialog{max-width:480px}.sync-dialog .detail-inner{padding:24px}.sync-dialog input{width:100%;border:1px solid #dce5ed;border-radius:10px;padding:11px 12px;font:inherit;margin:8px 0}.sync-dialog .token-help{font-size:.82rem;color:#61758a;line-height:1.45}.sync-dialog .sync-message{min-height:1.2em;font-size:.82rem;color:#61758a}.sync-dialog .sync-message.error{color:#b94444}.sync-dialog .sync-message.ok{color:#15805d}
    .notes-dialog{width:min(760px,calc(100vw - 24px));max-height:86vh}.notes-dialog .detail-inner{padding:22px}.notes-list{display:grid;gap:10px;margin:14px 0}.note-card{border:1px solid #dce5ed;border-radius:12px;padding:12px;background:#fff}.note-card h3{margin:0 0 5px;font-size:1rem}.note-card p{white-space:pre-wrap;margin:0;color:#29445d;line-height:1.45}.note-meta{font-size:.74rem;color:#71869a;margin-top:7px}.merge-warning{border:1px solid #e5c36a;background:#fff9e8;border-radius:12px;padding:12px;margin:12px 0}.notes-empty{color:#61758a}.notes-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    @media(max-width:600px){.sync-pill .sync-label{display:none}.sync-pill{width:38px;height:38px;justify-content:center;padding:0}}
  `;
  document.head.appendChild(style);

  const nativeRender=typeof render==='function'?render:null;
  const sync=window.OpenDaySync;
  let noteTimer=null;
  const unsyncedNotes=new Set();

  function enhanceHeader(){
    const header=document.querySelector('header');if(!header||document.querySelector('#syncPill'))return;
    let actions=header.querySelector('.header-actions');
    if(!actions){actions=document.createElement('div');actions.className='header-actions';const install=document.querySelector('#installBtn');if(install)actions.appendChild(install);header.appendChild(actions)}
    const history=document.createElement('a');history.className='version-link';history.href='version-lab/';history.textContent='Versions';history.setAttribute('aria-label','Open Version Lab');actions.insertBefore(history,actions.firstChild);
    const notes=document.createElement('button');notes.className='version-link';notes.type='button';notes.textContent='Notes';notes.setAttribute('aria-label','Show all notes stored on this device');notes.onclick=openLocalNotes;actions.insertBefore(notes,history);
    const button=document.createElement('button');button.id='syncPill';button.className='sync-pill';button.type='button';button.dataset.state=sync?.isConnected?.()?'syncing':'local';button.innerHTML='<span class="sync-dot"></span><span class="sync-label">Sync</span>';button.setAttribute('aria-label','Open sync settings');actions.insertBefore(button,notes);button.onclick=openSyncDialog;
  }

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function localSchoolName(id){
    const sets=typeof schoolSets!=='undefined'?schoolSets:{};const all=[...(sets.senior||[]),...(sets.primary||[]),...(typeof schools!=='undefined'?schools:[])];
    return all.find(s=>s.id===id)?.name||id;
  }
  function ensureLocalNotesDialog(){
    let d=document.querySelector('#localNotesDialog');if(d)return d;
    d=document.createElement('dialog');d.id='localNotesDialog';d.className='notes-dialog';
    d.innerHTML='<div class="detail-inner"><p class="eyebrow" style="color:#1769aa">THIS DEVICE</p><h2>Local notes</h2><p class="token-help">Everything shown here comes from this browser\'s local Openday storage. Opening this view does not read or write Firebase.</p><div class="notes-toolbar"><button id="copyLocalNotes" type="button">Copy all notes</button></div><div id="mergeConflictSummary"></div><div id="localNotesList" class="notes-list"></div><details><summary>Pre-token-connect backup</summary><div id="backupNotesList" class="notes-list"></div></details></div><button class="close" data-close-local-notes aria-label="Close">×</button>';
    document.body.appendChild(d);
    d.onclick=e=>{if(e.target.hasAttribute('data-close-local-notes')||e.target===d)d.close()};
    d.querySelector('#copyLocalNotes').onclick=async()=>{
      const local=JSON.parse(localStorage.getItem('openDayState')||'{}'),entries=Object.entries(local.notes||{}).filter(([,v])=>String(v||'').trim());
      const text=entries.map(([id,note])=>localSchoolName(id)+'\n'+String(note)).join('\n\n---\n\n');
      try{await navigator.clipboard.writeText(text);d.querySelector('#copyLocalNotes').textContent='Copied ✓'}catch{d.querySelector('#copyLocalNotes').textContent='Copy failed'}
    };
    return d;
  }
  function renderLocalNotes(){
    const d=ensureLocalNotesDialog(),local=JSON.parse(localStorage.getItem('openDayState')||'{}');
    const notes=Object.entries(local.notes||{}).filter(([,v])=>String(v||'').trim());
    const list=d.querySelector('#localNotesList');
    list.innerHTML=notes.length?notes.map(([id,note])=>'<article class="note-card"><h3>'+escapeHtml(localSchoolName(id))+'</h3><p>'+escapeHtml(note)+'</p><div class="note-meta">'+escapeHtml(id)+'</div></article>').join(''):'<p class="notes-empty">No notes are stored locally on this device.</p>';
    const conflicts=Object.values(local.mergeConflicts||{}).filter(x=>x?.status!=='resolved');
    const conflictBox=d.querySelector('#mergeConflictSummary');
    conflictBox.innerHTML=conflicts.length?'<div class="merge-warning"><b>'+conflicts.length+' preserved merge difference'+(conflicts.length===1?'':'s')+'</b><p>Local and cloud versions differed. Neither copy has been discarded.</p>'+conflicts.map(x=>'<details><summary>'+escapeHtml(localSchoolName(x.key))+' · '+escapeHtml(x.field)+'</summary><div class="note-card"><div class="note-meta">Local/device version</div><p>'+escapeHtml(typeof x.local==='string'?x.local:JSON.stringify(x.local,null,2))+'</p></div><div class="note-card"><div class="note-meta">Cloud version</div><p>'+escapeHtml(typeof x.cloud==='string'?x.cloud:JSON.stringify(x.cloud,null,2))+'</p></div></details>').join('')+'</div>':'';
    let backup={};try{backup=JSON.parse(localStorage.getItem('openday.state.before-token-connect.v1')||'{}')?.state||{}}catch{}
    const backupNotes=Object.entries(backup.notes||{}).filter(([,v])=>String(v||'').trim());
    d.querySelector('#backupNotesList').innerHTML=backupNotes.length?backupNotes.map(([id,note])=>'<article class="note-card"><h3>'+escapeHtml(localSchoolName(id))+'</h3><p>'+escapeHtml(note)+'</p><div class="note-meta">Backup · '+escapeHtml(id)+'</div></article>').join(''):'<p class="notes-empty">No pre-token-connect backup exists on this device yet.</p>';
  }
  function openLocalNotes(){const d=ensureLocalNotesDialog();renderLocalNotes();d.showModal()}

  function ensureSyncDialog(){
    let d=document.querySelector('#syncDialog');if(d)return d;
    d=document.createElement('dialog');d.id='syncDialog';d.className='sync-dialog';
    d.innerHTML=`<div class="detail-inner">
      <p class="eyebrow" style="color:#1769aa">PRIVATE SYNC</p>
      <h2>Sync across your devices</h2>
      <p>Use your memorable token on any device. Openday keeps using the <b>kk-syllabus</b> Firebase project; the token is simply your private access capability.</p>
      <label for="syncToken"><b>Memorable token</b></label>
      <input id="syncToken" type="text" autocomplete="off" spellcheck="false" placeholder="Enter your memorable token">
      <p class="token-help">If this browser still remembers your old token, <b>Show saved token</b> can reveal it. A device may also have recovery access without actually possessing the memorable token.</p>
      <p id="syncMode" class="token-help"></p>
      <p id="localDataSummary" class="token-help"></p>
      <p class="token-help"><b>Multi-device safety:</b> each deliberate cloud save first reads the latest cloud state and merges it transactionally with this device. Changes on different schools are combined automatically; conflicting changes to the same item are preserved for review.</p>
      <div class="modal-actions">
        <button id="connectToken" class="primary" type="button">Connect & sync</button>
        <button id="showSavedToken" type="button">Show saved token</button>
        <button id="copySetupLink" type="button">Copy setup link</button>
        <button id="refreshCloud" type="button">Refresh cloud data</button>
      </div>
      <hr style="border:0;border-top:1px solid #e5ebf0;margin:18px 0">
      <h3>Forgotten token?</h3>
      <p class="token-help">A forgotten token cannot be reconstructed from the cloud because the plaintext is never stored there. First try <b>Show saved token</b> on any device that used Openday before. If no device remembers it, the token can be administratively replaced while keeping the existing Openday data.</p>
      <div class="modal-actions">
        <button id="replaceToken" type="button" hidden>Set / replace token</button>
        <button id="forgetToken" type="button">Forget on this device</button>
      </div>
      <p id="syncMessage" class="sync-message"></p>
    </div><button class="close" data-close-sync aria-label="Close">×</button>`;
    document.body.appendChild(d);
    const input=d.querySelector('#syncToken'),message=d.querySelector('#syncMessage'),mode=d.querySelector('#syncMode'),summary=d.querySelector('#localDataSummary');
    const setMessage=(text,kind='')=>{message.className='sync-message'+(kind?' '+kind:'');message.textContent=text};
    const refreshDialogState=()=>{
      const token=sync?.getToken?.()||'',owner=!!sync?.ownerConnected?.(),tokenConnected=!!sync?.tokenConnected?.();
      mode.textContent=tokenConnected?'Connected using memorable token.':owner?'Connected through recovery access only — this device does not currently know the memorable token.':'Not connected to private cloud data.';
      try{
        const local=JSON.parse(localStorage.getItem('openDayState')||'{}');
        summary.textContent=`This device currently holds ${Object.keys(local.notes||{}).length} note(s), ${(local.saved||[]).length} saved school(s), and ${Object.keys(local.booked||{}).filter(k=>local.booked[k]).length} booked flag(s) locally.`;
      }catch{summary.textContent='Could not inspect this device local Openday data.'}
      const replace=d.querySelector('#replaceToken');
      if(replace){replace.hidden=!owner;replace.textContent=token?'Replace memorable token':'Set new memorable token'}
    };
    d.querySelector('#connectToken').onclick=async()=>{
      setMessage('Connecting…');
      try{await sync.connect(input.value);setMessage('Connected. This device will now sync using the memorable token.','ok')}
      catch(error){setMessage(error.message||'Could not connect.','error')}
    };
    d.querySelector('#showSavedToken').onclick=()=>{
      const token=sync?.getToken?.()||'';
      if(!token){setMessage('This browser does not have the memorable token saved. If this device has recovery access, use Set new memorable token below.','error');refreshDialogState();return}
      input.value=token;setMessage('Saved token shown above.','ok');
    };
    d.querySelector('#copySetupLink').onclick=async e=>{
      const token=input.value||sync?.getToken?.()||'',link=sync?.setupLink?.(token);
      if(!link){setMessage('Enter your memorable token first.','error');return}
      try{await navigator.clipboard.writeText(link);e.currentTarget.textContent='Copied ✓';setMessage('Private setup link copied.','ok')}
      catch{setMessage('Could not copy the setup link on this browser.','error')}
    };
    d.querySelector('#refreshCloud').onclick=async()=>{
      setMessage('Refreshing cloud data…');
      try{
        await Promise.all([sync?.refresh?.(),window.OpenDayPublicOverrides?.refresh?.()]);
        setMessage('Cloud data refreshed. No further reads will be made until you refresh again or reload the app.','ok');
      }catch(error){setMessage(error?.message||'Could not refresh cloud data.','error')}
    };
    const replace=d.querySelector('#replaceToken');
    if(replace)replace.onclick=async()=>{
      const token=input.value;
      if(!sync?.ownerConnected?.()){setMessage('This device does not have recovery access, so it cannot create a replacement token.','error');return}
      if(!token){setMessage('Enter the new memorable token you want to use first.','error');return}
      setMessage('Setting the memorable token and preserving existing state…');
      try{await sync.resetMemorableToken(token);setMessage('New memorable token set. Existing Openday cloud data has been kept and this device is now token-synced.','ok');refreshDialogState()}
      catch(error){setMessage(error.message||'Could not set the memorable token.','error')}
    };
    refreshDialogState();
    d.querySelector('#forgetToken').onclick=()=>{sync?.forgetToken?.();input.value='';setMessage('The token was forgotten on this device. Cloud data was not deleted.','ok')};
    d.onclick=e=>{if(e.target.hasAttribute('data-close-sync')||e.target===d)d.close()};
    return d;
  }
  function openSyncDialog(){
    const d=ensureSyncDialog(),mode=d.querySelector('#syncMode'),summary=d.querySelector('#localDataSummary'),replace=d.querySelector('#replaceToken');
    const token=sync?.getToken?.()||'',owner=!!sync?.ownerConnected?.(),tokenConnected=!!sync?.tokenConnected?.();
    if(mode)mode.textContent=tokenConnected?'Connected using memorable token.':owner?'Connected through recovery access only — this device does not currently know the memorable token.':'Not connected to private cloud data.';
    try{const local=JSON.parse(localStorage.getItem('openDayState')||'{}');if(summary)summary.textContent=`This device currently holds ${Object.keys(local.notes||{}).length} note(s), ${(local.saved||[]).length} saved school(s), and ${Object.keys(local.booked||{}).filter(k=>local.booked[k]).length} booked flag(s) locally.`}catch{}
    if(replace){replace.hidden=!owner;replace.textContent=token?'Replace memorable token':'Set new memorable token'}
    d.showModal();
  }

  function updateSyncStatus(detail={}){
    const b=document.querySelector('#syncPill');if(!b)return;b.dataset.state=detail.state||'local';const label=b.querySelector('.sync-label');if(label)label.textContent=detail.state==='synced'?(detail.tokenConnected?'Token synced':detail.ownerConnected?'Recovery':'Synced'):detail.state==='syncing'?'Saving':'Sync';b.title=detail.text||'Sync settings';
    const openStatus=document.querySelector('#detailBody .autosave-status');if(openStatus&&detail.state==='synced'){openStatus.className='autosave-status saved';openStatus.textContent='Saved & synced'}else if(openStatus&&detail.state==='error'){openStatus.className='autosave-status error';openStatus.textContent='Saved locally · sync unavailable'}
    const message=document.querySelector('#syncMessage');if(message&&document.querySelector('#syncDialog')?.open&&!message.textContent)message.textContent=detail.text||'';
  }
  window.addEventListener('openday:sync-status',e=>updateSyncStatus(e.detail));
  window.addEventListener('openday:cloud-state',e=>{if(typeof state==='object'&&e.detail){Object.assign(state,e.detail);localStorage.setItem('openDayState',JSON.stringify(state));nativeRender?.()}});

  function identifyOpenSchool(){const name=document.querySelector('#detailBody h2')?.textContent;if(!name||typeof schools==='undefined')return null;const dateText=document.querySelector('#detailBody .bigdate')?.textContent;return schools.find(s=>s.name===name&&(!dateText||fmtDate(s.start)===dateText))||schools.find(s=>s.name===name)||null}
  function enhanceDetail(){
    const note=document.querySelector('#detailBody #note');if(!note||note.dataset.autosave)return;
    const school=identifyOpenSchool();if(!school)return;
    note.dataset.autosave='1';
    const saveButton=document.querySelector('#detailBody #saveNote');
    const status=document.createElement('p');status.className='autosave-status saved';status.textContent=sync?.isConnected?.()?'Saved on device · cloud unchanged until Save':'Saved on device';
    note.after(status);
    if(saveButton)saveButton.textContent=sync?.isConnected?.()?'Save note to cloud':'Save note';
    const persistLocal=()=>{
      state.notes[school.id]=note.value;
      saveState();
      unsyncedNotes.add(school.id);
      status.className='autosave-status';
      status.textContent=sync?.isConnected?.()?'Saved on device · not yet synced':'Saved on device · cloud not connected';
    };
    note.addEventListener('input',persistLocal);
    note.addEventListener('change',persistLocal);
    if(saveButton)saveButton.onclick=async()=>{
      persistLocal();
      saveButton.disabled=true;
      status.className='autosave-status';
      status.textContent=sync?.isConnected?.()?'Saving once to cloud…':'Saved on device · cloud not connected';
      let ok=false;
      if(sync?.isConnected?.())ok=await sync.push();
      if(ok){
        unsyncedNotes.delete(school.id);
        status.className='autosave-status saved';
        status.textContent='Saved & synced';
        saveButton.textContent='Saved ✓';
        setTimeout(()=>{if(document.contains(saveButton)){saveButton.textContent='Save note to cloud';saveButton.disabled=false}},900);
      }else{
        saveButton.disabled=false;
        saveButton.textContent=sync?.isConnected?.()?'Try cloud save again':'Save note';
      }
    };
    const cal=document.querySelector('#detailBody #calendar');if(cal){cal.classList.add('calendar-action');cal.innerHTML='<span class="calendar-glyph" aria-hidden="true">📅</span> Add to calendar';cal.setAttribute('aria-label','Add this visit to calendar')}
  }
  const detailBody=document.querySelector('#detailBody');if(detailBody)new MutationObserver(enhanceDetail).observe(detailBody,{childList:true,subtree:true});
  const detailDialog=document.querySelector('#detail');
  const warnUnsyncedClose=()=>{
    const school=identifyOpenSchool();
    if(!school||!unsyncedNotes.has(school.id))return true;
    return window.confirm('This note is saved on this device but has not been saved to the cloud. Close anyway?');
  };
  detailDialog?.addEventListener('click',e=>{
    if(!(e.target===detailDialog||e.target.hasAttribute('data-close')))return;
    if(!warnUnsyncedClose()){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  detailDialog?.addEventListener('cancel',e=>{if(!warnUnsyncedClose())e.preventDefault()});
  window.addEventListener('beforeunload',e=>{if(!unsyncedNotes.size)return;e.preventDefault();e.returnValue=''});

  function enhanceTravelCards(){document.querySelectorAll('.card').forEach(card=>{const meta=card.querySelector('.meta');if(!meta||meta.dataset.travelLabelled)return;meta.textContent=meta.textContent.replace(/Approx\. ([^·;]+?) drive from HA1 3PU(?: · check live traffic|; check live traffic)?/g,'🚗 Car est. $1 from HA1 3PU');meta.dataset.travelLabelled='1'})}
  const list=document.querySelector('#list');if(list)new MutationObserver(enhanceTravelCards).observe(list,{childList:true,subtree:true});enhanceTravelCards();

  function installCalendarSubscriptionFix(){const button=document.querySelector('#subscribeBtn');if(!button)return;const feed='https://nirav2000.github.io/Openday/calendar.ics';const copy=document.querySelector('#copyFeedBtn');if(copy)copy.onclick=async e=>{try{await navigator.clipboard.writeText(feed);e.currentTarget.textContent='Copied ✓'}catch{const input=document.querySelector('#feedUrl');input.focus();input.select();document.execCommand('copy')}};button.onclick=()=>{document.querySelector('#icsLink').href=feed;document.querySelector('#feedUrl').value=feed;const apple=document.querySelector('#webcalLink'),webcal=`webcal://${feed.replace(/^https?:\/\//,'')}`;apple.href=webcal;apple.onclick=e=>{e.preventDefault();window.location.assign(webcal)};document.querySelector('#subscribeDialog').showModal()}}

  async function initialiseVersion(){try{const release=await fetch('version.json',{cache:'no-store'}).then(r=>r.json());const el=document.querySelector('#appVersion');if(el)el.textContent=`v${release.version}`;const lab=window.createVersionLab?.({appId:'openday',currentVersion:release.version});lab?.recordRelease?.({version:release.version,date:release.released,summary:release.summary,areas:['sync','autosave','calendar','card-density','developer-notes']})}catch{}}

  enhanceHeader();ensureSyncDialog();installCalendarSubscriptionFix();initialiseVersion();
  try{const stored=JSON.parse(localStorage.getItem('openDayState')||'{}');if(typeof state==='object'&&JSON.stringify(stored)!==JSON.stringify(state)){Object.assign(state,stored);nativeRender?.()}}catch{}
  updateSyncStatus({state:sync?.isConnected?.()?'syncing':'local',text:sync?.isConnected?.()?'Checking cloud…':'Enter memorable token to sync'});
})();
