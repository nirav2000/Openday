(()=>{
  const style=document.createElement('style');
  style.textContent=`
    [hidden]{display:none!important}
    .header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.version-link{border:1px solid #7892aa;background:#ffffff12;color:#fff;border-radius:999px;padding:8px 10px;font-size:.72rem;font-weight:800;text-decoration:none}.version-link.has-note-conflict{border-color:#ffca58;background:#ffca5822;color:#fff}.version-link .conflict-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;margin-left:4px;border-radius:999px;background:#ffca58;color:#4a3500;font-size:.62rem;font-weight:900}
    .sync-pill{border:1px solid #7892aa;background:#ffffff12;color:#fff;border-radius:999px;padding:8px 10px;font-size:.72rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;transition:background .18s,border-color .18s,color .18s}.sync-dot{width:7px;height:7px;border-radius:50%;background:#aab8c4}.sync-pill[data-state="synced"]{background:#176b50;border-color:#5ee0ae;color:#fff}.sync-pill[data-state="synced"] .sync-dot{background:#9df2ce}.sync-pill[data-state="recovery"]{background:#735f20;border-color:#e8c65c;color:#fff}.sync-pill[data-state="syncing"]{background:#725619;border-color:#ffca58}.sync-pill[data-state="syncing"] .sync-dot{background:#ffdf88}.sync-pill[data-state="error"]{background:#8b3434;border-color:#ff8585}.sync-pill[data-state="error"] .sync-dot{background:#ffb2b2}.sync-pill[data-pending="true"] .sync-dot{animation:pendingCloudPulse 1.8s ease-in-out infinite}.sync-pill[data-pending="true"]{border-color:#5ee0ae88}@keyframes pendingCloudPulse{0%,100%{opacity:.35;box-shadow:0 0 0 0 #5ee0ae22}50%{opacity:1;box-shadow:0 0 0 5px #5ee0ae12}}
    .autosave-status{font-size:.76rem;color:#61758a;margin:6px 0 12px;min-height:1.1em}
    .decision-panel{margin:14px 0;padding:13px;background:#f7f9fb;border:1px solid #dce5ed;border-radius:12px}
    .decision-panel h3{margin:4px 0 9px}
    .decision-options{display:flex;gap:7px;flex-wrap:wrap}
    .decision-options button{border:1px solid #c9d6e2;background:white;color:#29445d;border-radius:999px;padding:8px 11px;font:inherit;font-size:.82rem;font-weight:700}
    .decision-options button.selected{border-color:#1769aa;background:#eaf4fc;color:#10558d}.autosave-status.saved{color:#15805d}.autosave-status.error{color:#b94444}
    .calendar-action{gap:7px}.calendar-action .calendar-glyph{font-size:1.05rem}
    .feed-label{display:block;margin:14px 0 6px;font-size:.76rem;font-weight:800;color:#61758a;text-transform:uppercase;letter-spacing:.06em}
    .feed-copy{display:grid;grid-template-columns:1fr auto;gap:7px}.feed-copy input{min-width:0;border:1px solid #dce5ed;border-radius:10px;padding:10px;font:inherit;color:#102a43;background:#f8fafb}.feed-copy button{border:1px solid #dce5ed;border-radius:10px;background:white;color:#1769aa;font-weight:750;padding:8px 12px}
    .sync-dialog{max-width:540px}.sync-dialog .detail-inner{padding:24px}.sync-dialog input{width:100%;border:1px solid #dce5ed;border-radius:10px;padding:11px 12px;font:inherit;margin:8px 0}.sync-dialog .token-help{font-size:.82rem;color:#61758a;line-height:1.45}.sync-dialog .sync-message{min-height:1.2em;font-size:.82rem;color:#61758a}.sync-dialog .sync-message.error{color:#b94444}.sync-dialog .sync-message.ok{color:#15805d}.sync-hierarchy{display:grid;gap:7px;margin:12px 0}.sync-level{display:grid;grid-template-columns:26px 1fr;gap:9px;align-items:start;border:1px solid #dce5ed;background:#f8fafb;border-radius:10px;padding:9px}.sync-level strong{display:block;font-size:.82rem}.sync-level span{display:block;font-size:.74rem;color:#61758a;line-height:1.35;margin-top:2px}.sync-level.on{border-color:#acd9c8;background:#eef9f4}.sync-level.warn{border-color:#ead28f;background:#fff9e8}.sync-level-icon{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#dfe7ed;font-size:.72rem;font-weight:900}.sync-level.on .sync-level-icon{background:#176b50;color:#fff}.connect-state{margin:8px 0 12px;padding:9px 10px;border-radius:10px;background:#f5f7f9;color:#29445d;font-size:.8rem;font-weight:800}.connect-state.on{background:#e7f6ef;color:#176b50}.connect-state.warn{background:#fff4d9;color:#765300}.sync-dialog #connectToken.connected{background:#176b50;color:#fff;border-color:#176b50}
    .notes-dialog{width:min(760px,calc(100vw - 24px));max-height:86vh}.notes-dialog .detail-inner{padding:22px}.notes-list{display:grid;gap:10px;margin:14px 0}.note-card{border:1px solid #dce5ed;border-radius:12px;padding:12px;background:#fff}.note-card.has-conflict{border:2px solid #e0a72f;background:#fffaf0}.conflict-badge{display:inline-flex;background:#fff0d0;color:#765300;border-radius:999px;padding:3px 7px;font-size:.68rem;font-weight:900;margin-left:6px}.resolve-conflict{margin-top:9px;border:1px solid #d8b250;background:#fff;color:#765300;border-radius:8px;padding:7px 9px;font-weight:800}.conflict-editor{width:min(900px,calc(100vw - 24px));border:0;border-radius:18px;padding:0}.conflict-editor textarea{width:100%;min-height:160px;border:1px solid #dce5ed;border-radius:10px;padding:10px;font:inherit}.conflict-versions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.conflict-versions pre{white-space:pre-wrap;background:#f5f7f9;padding:10px;border-radius:10px;font:inherit;font-size:.82rem;line-height:1.65}.diff-device{background:#ffe5a6;border-radius:4px;padding:1px 2px;box-shadow:inset 0 -2px 0 #d89b20}.diff-cloud{background:#cdebdc;border-radius:4px;padding:1px 2px;box-shadow:inset 0 -2px 0 #39956c}.diff-list{display:grid;gap:8px;margin:12px 0}.diff-item{border:1px solid #dce5ed;border-radius:11px;padding:10px;background:#fbfcfd}.diff-item-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.diff-item-head b{font-size:.8rem}.diff-actions{display:flex;gap:5px;flex-wrap:wrap}.diff-actions button{border:1px solid #c8d5df;background:#fff;border-radius:999px;padding:5px 8px;font-size:.72rem;font-weight:800;color:#29445d}.diff-actions button.active[data-choice="local"]{background:#fff0c8;border-color:#d8aa37;color:#674900}.diff-actions button.active[data-choice="cloud"]{background:#e2f5eb;border-color:#6bb894;color:#185f43}.diff-snippets{display:grid;grid-template-columns:1fr 1fr;gap:7px}.diff-snippet{border-radius:8px;padding:8px;background:#f4f7f9;font-size:.78rem;line-height:1.45;white-space:pre-wrap}.diff-snippet.local{border-left:3px solid #d89b20}.diff-snippet.cloud{border-left:3px solid #39956c}.merge-help{font-size:.78rem;color:#61758a;line-height:1.45}.whole-merge-actions{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.whole-merge-actions button{border:1px solid #c9d6e2;background:#fff;border-radius:9px;padding:7px 10px;font-weight:800;color:#29445d}.note-card h3{margin:0 0 5px;font-size:1rem}.note-card p{white-space:pre-wrap;margin:0;color:#29445d;line-height:1.45}.note-meta{font-size:.74rem;color:#71869a;margin-top:7px}.merge-warning{border:1px solid #e5c36a;background:#fff9e8;border-radius:12px;padding:12px;margin:12px 0}.notes-empty{color:#61758a}.notes-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .pending-sync-bar{display:none;align-items:center;justify-content:space-between;gap:12px;background:#effaf5;border:1px solid #bfe8d6;border-radius:13px;padding:10px 12px;margin:-2px 0 12px}.pending-sync-bar.show{display:flex}.pending-sync-copy{display:flex;align-items:center;gap:9px;min-width:0}.pending-sync-cloud{font-size:1.2rem}.pending-sync-copy b{display:block;font-size:.84rem;color:#176b50}.pending-sync-copy span{display:block;font-size:.75rem;color:#5d746b;margin-top:2px}.pending-sync-bar button{border:0;border-radius:9px;background:#176b50;color:white;padding:9px 11px;font-weight:800;white-space:nowrap}
    @media(max-width:600px){.sync-pill .sync-label{display:none}.sync-pill{width:38px;height:38px;justify-content:center;padding:0}}
  `;
  document.head.appendChild(style);

  const nativeRender=typeof render==='function'?render:null;
  const sync=window.OpenDaySync;
  let noteTimer=null;
  const pendingNotesKey='openday.unsyncedNotes.v1';
  const readPendingNotes=()=>{try{return JSON.parse(localStorage.getItem(pendingNotesKey)||'[]')}catch{return[]}};
  const unsyncedNotes=new Set(readPendingNotes());
  const persistPendingNotes=()=>localStorage.setItem(pendingNotesKey,JSON.stringify([...unsyncedNotes]));

  function ensurePendingSyncBar(){
    let bar=document.querySelector('#pendingSyncBar');if(bar)return bar;
    bar=document.createElement('section');bar.id='pendingSyncBar';bar.className='pending-sync-bar';bar.innerHTML='<div class="pending-sync-copy"><span class="pending-sync-cloud">☁︎</span><div><b id="pendingSyncTitle"></b><span id="pendingSyncText"></span></div></div><button id="saveAllPendingNotes" type="button">Save to cloud</button>';
    const summary=document.querySelector('.summary');summary?.after(bar);
    bar.querySelector('#saveAllPendingNotes').onclick=async e=>{
      const button=e.currentTarget;
      if(!sync?.isConnected?.()){openSyncDialog();return}
      button.disabled=true;button.textContent='Saving…';
      const ok=await sync.push();
      if(!ok){button.disabled=false;button.textContent='Try again'}
    };
    return bar;
  }
  function updatePendingNotesUI(){
    const count=unsyncedNotes.size,bar=ensurePendingSyncBar(),pill=document.querySelector('#syncPill');
    if(pill)pill.dataset.pending=count?'true':'false';
    bar.classList.toggle('show',count>0);
    if(count){
      bar.querySelector('#pendingSyncTitle').textContent=count+' note'+(count===1?'':'s')+' waiting for cloud save';
      bar.querySelector('#pendingSyncText').textContent='One save sends every changed note on this device.';
      const button=bar.querySelector('#saveAllPendingNotes');button.disabled=false;button.textContent=sync?.isConnected?.()?'Save all to cloud':'Connect to save';
      if(pill)pill.title=count+' note'+(count===1?'':'s')+' waiting for cloud save';
    }
  }
  function noteConflictCount(){
    try{return Object.values(JSON.parse(localStorage.getItem('openDayState')||'{}').mergeConflicts||{}).filter(x=>x?.field==='notes'&&x?.status!=='resolved').length}catch{return 0}
  }
  function updateConflictIndicator(){
    const b=document.querySelector('#notesButton');if(!b)return;const n=noteConflictCount();
    b.classList.toggle('has-note-conflict',n>0);
    b.innerHTML='Notes'+(n?'<span class="conflict-count">'+n+'</span>':'');
    b.title=n?n+' note merge difference'+(n===1?'':'s')+' need review':'Notes';
  }
  function markNotePending(id){unsyncedNotes.add(id);persistPendingNotes();updatePendingNotesUI()}
  function clearPendingNotes(){unsyncedNotes.clear();persistPendingNotes();updatePendingNotesUI()}

  function enhanceHeader(){
    const header=document.querySelector('header');if(!header)return;
    let actions=header.querySelector('.header-actions');
    if(!actions){actions=document.createElement('div');actions.className='header-actions';header.appendChild(actions)}
    let history=actions.querySelector('a[href="version-lab/"]');if(!history){history=document.createElement('a');history.className='version-link';history.href='version-lab/';history.textContent='Versions';actions.appendChild(history)}
    let performance=actions.querySelector('a[href="performance.html"]');if(!performance){performance=document.createElement('a');performance.className='version-link';performance.href='performance.html';performance.textContent='Performance';actions.insertBefore(performance,history)}
    let notes=document.querySelector('#notesButton');if(!notes){notes=document.createElement('button');notes.id='notesButton';notes.className='version-link';notes.type='button';notes.textContent='Notes';actions.insertBefore(notes,performance)}
    notes.setAttribute('aria-label','Show notes and merge differences');notes.onclick=e=>{e.preventDefault();openLocalNotes()};updateConflictIndicator();
    let button=document.querySelector('#syncPill');if(!button){button=document.createElement('button');button.id='syncPill';button.className='sync-pill';button.type='button';button.innerHTML='<span class="sync-dot"></span><span class="sync-label">Sync</span>';actions.insertBefore(button,notes)}
    button.setAttribute('aria-label','Open sync settings');button.onclick=e=>{e.preventDefault();openSyncDialog()};
    const install=document.querySelector('#installBtn');if(install&&install.parentElement!==actions)actions.appendChild(install);
  }

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const diffTokens=value=>String(value??'').match(/\S+\s*|\s+/g)||[];
  function noteDiffSegments(localText,cloudText){
    const a=diffTokens(localText),b=diffTokens(cloudText),rows=a.length+1,cols=b.length+1;
    const dp=Array.from({length:rows},()=>new Uint16Array(cols));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    const raw=[];let i=0,j=0;
    while(i<a.length||j<b.length){
      if(i<a.length&&j<b.length&&a[i]===b[j]){raw.push({type:'same',text:a[i]});i++;j++;continue}
      if(i<a.length&&(j>=b.length||dp[i+1][j]>=dp[i][j+1])){raw.push({type:'local',text:a[i++]});continue}
      if(j<b.length)raw.push({type:'cloud',text:b[j++]});
    }
    const out=[];let pending=null;
    const flush=()=>{if(pending){out.push(pending);pending=null}};
    raw.forEach(op=>{
      if(op.type==='same'){flush();const last=out.at(-1);if(last?.type==='same')last.text+=op.text;else out.push({type:'same',text:op.text})}
      else{if(!pending)pending={type:'change',local:'',cloud:''};pending[op.type]+=op.text}
    });flush();return out;
  }
  const diffHtml=(segments,side)=>segments.map(seg=>seg.type==='same'?escapeHtml(seg.text):'<mark class="'+(side==='local'?'diff-device':'diff-cloud')+'">'+escapeHtml(seg[side]||'∅')+'</mark>').join('');
  const mergedFromChoices=(segments,choices)=>{let change=0;return segments.map(seg=>seg.type==='same'?seg.text:(choices[change++]==='cloud'?seg.cloud:seg.local)).join('')};
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
    const conflicts=Object.values(local.mergeConflicts||{}).filter(x=>x?.status!=='resolved');
    const noteConflictByKey=new Map(conflicts.filter(x=>x.field==='notes').map(x=>[x.key,x]));
    list.innerHTML=notes.length?notes.map(([id,note])=>{const conflict=noteConflictByKey.get(id);return '<article class="note-card'+(conflict?' has-conflict':'')+'"><h3>'+escapeHtml(localSchoolName(id))+(conflict?'<span class="conflict-badge">MERGE NEEDED</span>':'')+'</h3><p>'+escapeHtml(note)+'</p><div class="note-meta">'+escapeHtml(id)+'</div>'+(conflict?'<button class="resolve-conflict" type="button" data-resolve-note="'+escapeHtml(id)+'">Review & merge notes</button>':'')+'</article>'}).join(''):'<p class="notes-empty">No notes are stored locally on this device.</p>';
    list.querySelectorAll('[data-resolve-note]').forEach(b=>b.onclick=()=>openConflictEditor(b.dataset.resolveNote));
    const conflictBox=d.querySelector('#mergeConflictSummary');
    conflictBox.innerHTML=conflicts.length?'<div class="merge-warning"><b>'+conflicts.length+' preserved merge difference'+(conflicts.length===1?'':'s')+'</b><p>Local and cloud versions differed. Neither copy has been discarded.</p>'+conflicts.map(x=>'<details><summary>'+escapeHtml(localSchoolName(x.key))+' · '+escapeHtml(x.field)+'</summary><div class="note-card"><div class="note-meta">Local/device version</div><p>'+escapeHtml(typeof x.local==='string'?x.local:JSON.stringify(x.local,null,2))+'</p></div><div class="note-card"><div class="note-meta">Cloud version</div><p>'+escapeHtml(typeof x.cloud==='string'?x.cloud:JSON.stringify(x.cloud,null,2))+'</p></div></details>').join('')+'</div>':'';
    let backup={};try{backup=JSON.parse(localStorage.getItem('openday.state.before-token-connect.v1')||'{}')?.state||{}}catch{}
    const backupNotes=Object.entries(backup.notes||{}).filter(([,v])=>String(v||'').trim());
    d.querySelector('#backupNotesList').innerHTML=backupNotes.length?backupNotes.map(([id,note])=>'<article class="note-card"><h3>'+escapeHtml(localSchoolName(id))+'</h3><p>'+escapeHtml(note)+'</p><div class="note-meta">Backup · '+escapeHtml(id)+'</div></article>').join(''):'<p class="notes-empty">No pre-token-connect backup exists on this device yet.</p>';
  }
  function ensureConflictEditor(){
    let d=document.querySelector('#noteConflictEditor');if(d)return d;
    d=document.createElement('dialog');d.id='noteConflictEditor';d.className='conflict-editor';
    d.innerHTML='<div class="detail-inner"><p class="eyebrow" style="color:#1769aa">MERGE DIFFERENCE</p><h2 id="conflictSchoolName"></h2><p class="merge-help">Changed or added text is highlighted below. Choose the device or cloud text for each difference individually, or choose one whole version. You can still edit the merged note manually before saving.</p><div class="conflict-versions"><div><b>Device version</b><pre id="conflictLocal"></pre></div><div><b>Cloud version</b><pre id="conflictCloud"></pre></div></div><div class="whole-merge-actions"><button id="useDeviceNote" type="button">Use whole device note</button><button id="useCloudNote" type="button">Use whole cloud note</button><button id="combineNotes" type="button">Append both whole notes</button></div><div id="conflictDiffList" class="diff-list"></div><label><b>Merged note</b><textarea id="conflictMerged"></textarea></label><div class="modal-actions"><button id="saveMergedNote" class="primary" type="button">Save resolved note</button></div><p id="conflictSaveStatus" class="sync-message"></p></div><button class="close" data-close-conflict aria-label="Close">×</button>';
    document.body.appendChild(d);d.onclick=e=>{if(e.target===d||e.target.hasAttribute('data-close-conflict'))d.close()};return d;
  }
  function openConflictEditor(key){
    const local=JSON.parse(localStorage.getItem('openDayState')||'{}'),id='notes:'+key,conflict=local.mergeConflicts?.[id]||Object.values(local.mergeConflicts||{}).find(x=>x.field==='notes'&&x.key===key&&x.status!=='resolved');
    if(!conflict)return;
    const d=ensureConflictEditor(),lv=String(conflict.local??''),cv=String(conflict.cloud??''),segments=noteDiffSegments(lv,cv),changes=segments.filter(x=>x.type==='change');
    let choices=changes.map(()=>'local');
    const merged=d.querySelector('#conflictMerged'),list=d.querySelector('#conflictDiffList');
    const updateMerged=()=>{merged.value=mergedFromChoices(segments,choices);list.querySelectorAll('[data-diff-choice]').forEach(b=>b.classList.toggle('active',choices[Number(b.dataset.diffIndex)]===b.dataset.diffChoice))};
    d.dataset.conflictId=id;d.dataset.schoolKey=key;d.querySelector('#conflictSchoolName').textContent=localSchoolName(key);
    d.querySelector('#conflictLocal').innerHTML=diffHtml(segments,'local');d.querySelector('#conflictCloud').innerHTML=diffHtml(segments,'cloud');
    list.innerHTML=changes.length?changes.map((seg,i)=>'<article class="diff-item"><div class="diff-item-head"><b>Difference '+(i+1)+'</b><div class="diff-actions"><button type="button" data-diff-index="'+i+'" data-diff-choice="local">Keep device</button><button type="button" data-diff-index="'+i+'" data-diff-choice="cloud">Accept cloud</button></div></div><div class="diff-snippets"><div class="diff-snippet local"><b>Device</b><br>'+escapeHtml(seg.local||'∅')+'</div><div class="diff-snippet cloud"><b>Cloud</b><br>'+escapeHtml(seg.cloud||'∅')+'</div></div></article>').join(''):'<p class="notes-empty">The two notes are textually identical.</p>';
    list.querySelectorAll('[data-diff-choice]').forEach(b=>b.onclick=()=>{choices[Number(b.dataset.diffIndex)]=b.dataset.diffChoice;updateMerged()});
    d.querySelector('#useDeviceNote').onclick=()=>{choices=changes.map(()=>'local');merged.value=lv;updateMerged()};
    d.querySelector('#useCloudNote').onclick=()=>{choices=changes.map(()=>'cloud');merged.value=cv;updateMerged()};
    d.querySelector('#combineNotes').onclick=()=>merged.value=[lv,cv].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n\n');
    const currentValue=String(local.notes?.[key]??lv);if(currentValue===cv)choices=changes.map(()=>'cloud');updateMerged();if(currentValue!==lv&&currentValue!==cv)merged.value=currentValue;
    d.querySelector('#saveMergedNote').onclick=async()=>{
      const current=JSON.parse(localStorage.getItem('openDayState')||'{}'),value=merged.value;
      current.notes=current.notes||{};current.notes[key]=value;current.mergeConflicts=current.mergeConflicts||{};
      const rec=current.mergeConflicts[id]||conflict;current.mergeConflicts[id]={...rec,status:'resolved',resolvedAt:new Date().toISOString(),resolution:'per-difference-merge',resolvedValue:value};
      localStorage.setItem('openDayState',JSON.stringify(current));Object.assign(state,current);markNotePending(key);
      d.querySelector('#conflictSaveStatus').textContent='Resolved locally. Saving to cloud…';
      const ok=sync?.isConnected?.()?await sync.push():false;
      d.querySelector('#conflictSaveStatus').textContent=ok?'Resolved note saved & synced.':'Resolved locally; cloud save is still pending.';
      renderLocalNotes();updateConflictIndicator();if(ok)setTimeout(()=>d.close(),650);
    };
    d.showModal();
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
      <p class="token-help">The memorable token is this device's reusable key to your private Openday data. Once connected it is cached on this device; you should not normally need to enter it again.</p>
      <div id="syncConnectionState" class="connect-state">Checking connection…</div>
      <div class="sync-hierarchy" aria-label="Sync status hierarchy">
        <div id="syncLevelToken" class="sync-level"><span class="sync-level-icon">1</span><div><strong>Token saved on this device</strong><span>Portable access. This is the part that prevents repeated token entry on iPad/iPhone.</span></div></div>
        <div id="syncLevelChannel" class="sync-level"><span class="sync-level-icon">2</span><div><strong>Connected to your cloud channel</strong><span>The app can read and write the shared Openday state.</span></div></div>
        <div id="syncLevelLive" class="sync-level"><span class="sync-level-icon">3</span><div><strong>Live device updates</strong><span>Changes saved on another connected device are received automatically while Openday is open.</span></div></div>
      </div>
      <p id="syncMode" class="token-help"></p>
      <p id="localDataSummary" class="token-help"></p>
      <p class="token-help"><b>Recovery access</b> is different from a saved token: it lets the authorised owner recover/connect this app, but it is not the portable token itself.</p>
      <p class="token-help"><b>Multi-device safety:</b> each cloud save first reads the latest shared state and merges it transactionally. Changes on different schools combine automatically; conflicts on the same note are preserved for review.</p>
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
      const token=sync?.getToken?.()||'',owner=!!sync?.ownerConnected?.(),tokenConnected=!!sync?.tokenConnected?.(),st=sync?.status?.()||{};
      const channel=tokenConnected||st.connected,live=!!st.live;
      const state=d.querySelector('#syncConnectionState'),connect=d.querySelector('#connectToken');
      d.querySelector('#syncLevelToken')?.classList.toggle('on',!!token);
      d.querySelector('#syncLevelChannel')?.classList.toggle('on',!!channel);
      d.querySelector('#syncLevelLive')?.classList.toggle('on',!!live);
      if(state){
        state.className='connect-state '+(channel?'on':owner?'warn':'');
        state.textContent=channel?(live?'Connected & synced · live updates on':'Connected to cloud'):(owner?'Recovery access available · portable token not saved':'Local only · enter token to connect');
      }
      if(connect){
        connect.classList.toggle('connected',!!channel);
        connect.textContent=channel?'Connected & synced ✓':'Connect & sync';
        connect.disabled=!!channel;
      }
      mode.textContent=token&&channel?'Saved token + cloud channel connected.':channel&&owner?'Connected through owner recovery to the active sync channel.':owner?'Owner recovery access only — save the token here for normal portable access.':'Not connected to private cloud data.';
      try{
        const local=JSON.parse(localStorage.getItem('openDayState')||'{}');
        summary.textContent=`This device currently holds ${Object.keys(local.notes||{}).length} note(s), ${(local.saved||[]).length} saved school(s), and ${Object.keys(local.booked||{}).filter(k=>local.booked[k]).length} booked flag(s) locally.`+(st.lastSyncAt?' Last cloud sync: '+new Date(st.lastSyncAt).toLocaleString('en-GB')+'.':'');
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
    const d=ensureSyncDialog();
    const token=sync?.getToken?.()||'',owner=!!sync?.ownerConnected?.(),st=sync?.status?.()||{},channel=!!st.connected||!!sync?.tokenConnected?.(),live=!!st.live;
    d.querySelector('#syncLevelToken')?.classList.toggle('on',!!token);d.querySelector('#syncLevelChannel')?.classList.toggle('on',channel);d.querySelector('#syncLevelLive')?.classList.toggle('on',live);
    const state=d.querySelector('#syncConnectionState');if(state){state.className='connect-state '+(channel?'on':owner?'warn':'');state.textContent=channel?(live?'Connected & synced · live updates on':'Connected to cloud'):(owner?'Recovery access available · portable token not saved':'Local only · enter token to connect')}
    const connect=d.querySelector('#connectToken');if(connect){connect.classList.toggle('connected',channel);connect.textContent=channel?'Connected & synced ✓':'Connect & sync';connect.disabled=channel}
    const mode=d.querySelector('#syncMode');if(mode)mode.textContent=token&&channel?'Saved token + cloud channel connected.':channel&&owner?'Connected through owner recovery to the active sync channel.':owner?'Owner recovery access only — save the token here for normal portable access.':'Not connected to private cloud data.';
    const summary=d.querySelector('#localDataSummary');try{const local=JSON.parse(localStorage.getItem('openDayState')||'{}');if(summary)summary.textContent=`This device currently holds ${Object.keys(local.notes||{}).length} note(s), ${(local.saved||[]).length} saved school(s), and ${Object.keys(local.booked||{}).filter(k=>local.booked[k]).length} booked flag(s) locally.`+(st.lastSyncAt?' Last cloud sync: '+new Date(st.lastSyncAt).toLocaleString('en-GB')+'.':'')}catch{}
    const replace=d.querySelector('#replaceToken');if(replace){replace.hidden=!owner;replace.textContent=token?'Replace memorable token':'Set new memorable token'}
    d.showModal();
  }

  function updateSyncStatus(detail={}){
    const b=document.querySelector('#syncPill');if(!b)return;
    const state=detail.state||'local',connected=!!detail.connected;
    b.dataset.state=connected&&state!=='error'&&state!=='syncing'?'synced':state;
    const label=b.querySelector('.sync-label');
    if(label)label.textContent=state==='syncing'?'Syncing…':state==='error'?'Sync error':connected?'Connected ✓':detail.ownerConnected?'Recovery':'Connect';
    const levels=[
      detail.hasRememberedToken?'1. Token saved on this device':'1. Token not saved on this device',
      connected?'2. Cloud channel connected':'2. Cloud channel not connected',
      detail.live?'3. Live device updates on':'3. Live device updates off'
    ];
    const extra=detail.lastSyncAt?'\nLast sync: '+new Date(detail.lastSyncAt).toLocaleString('en-GB'):'';
    b.title=(detail.text||'Sync settings')+'\n'+levels.join('\n')+extra+'\nTap for details.';
    b.setAttribute('aria-label',(connected?'Connected and synced. ':'Not connected. ')+levels.join('. '));
    const openStatus=document.querySelector('#detailBody .autosave-status');if(openStatus&&state==='synced'){openStatus.className='autosave-status saved';openStatus.textContent='Saved & synced'}else if(openStatus&&state==='error'){openStatus.className='autosave-status error';openStatus.textContent='Saved locally · sync unavailable'}
    const message=document.querySelector('#syncMessage');if(message&&document.querySelector('#syncDialog')?.open)message.textContent=detail.text||'';
    if(document.querySelector('#syncDialog')?.open){
      const token=!!detail.hasRememberedToken,channel=connected,live=!!detail.live,d=document.querySelector('#syncDialog');
      d.querySelector('#syncLevelToken')?.classList.toggle('on',token);d.querySelector('#syncLevelChannel')?.classList.toggle('on',channel);d.querySelector('#syncLevelLive')?.classList.toggle('on',live);
      const box=d.querySelector('#syncConnectionState');if(box){box.className='connect-state '+(channel?'on':detail.ownerConnected?'warn':'');box.textContent=channel?(live?'Connected & synced · live updates on':'Connected to cloud'):(detail.ownerConnected?'Recovery access available · token not saved':'Local only · enter token to connect')}
      const connect=d.querySelector('#connectToken');if(connect){connect.classList.toggle('connected',channel);connect.textContent=channel?'Connected & synced ✓':'Connect & sync';connect.disabled=channel}
    }
  }
  window.addEventListener('openday:sync-status',e=>updateSyncStatus(e.detail));
  window.addEventListener('openday:cloud-state',e=>{if(typeof state==='object'&&e.detail){Object.assign(state,e.detail);localStorage.setItem('openDayState',JSON.stringify(state));updateConflictIndicator();nativeRender?.()}});
  window.addEventListener('openday:sync-write-success',()=>clearPendingNotes());

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
      markNotePending(school.id);
      status.className='autosave-status';
      status.textContent=sync?.isConnected?.()?'Saved on device · not yet synced':'Saved on device · cloud not connected';
    };
    note.addEventListener('input',persistLocal);
    note.addEventListener('change',persistLocal);
    if(saveButton)saveButton.onclick=async()=>{
      persistLocal();
      saveButton.disabled=true;
      status.className='autosave-status';
      status.textContent=sync?.isConnected?.()?'Saving all changed notes to cloud…':'Saved on device · cloud not connected';
      let ok=false;
      if(sync?.isConnected?.())ok=await sync.push();
      if(ok){
        status.className='autosave-status saved';
        status.textContent='All changed notes saved & synced';
        saveButton.textContent='Saved all ✓';
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

  enhanceHeader();ensurePendingSyncBar();updatePendingNotesUI();updateConflictIndicator();ensureSyncDialog();installCalendarSubscriptionFix();initialiseVersion();
  try{const stored=JSON.parse(localStorage.getItem('openDayState')||'{}');if(typeof state==='object'&&JSON.stringify(stored)!==JSON.stringify(state)){Object.assign(state,stored);nativeRender?.()}}catch{}
  updateSyncStatus({state:sync?.isConnected?.()?'syncing':'local',text:sync?.isConnected?.()?'Checking cloud…':'Enter memorable token to sync'});
})();
