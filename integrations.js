(()=>{
  const style=document.createElement('style');
  style.textContent=`
    [hidden]{display:none!important}
    .header-actions{display:flex;align-items:center;gap:8px}
    .sync-pill{border:1px solid #7892aa;background:#ffffff12;color:#fff;border-radius:999px;padding:8px 10px;font-size:.72rem;font-weight:800;display:inline-flex;align-items:center;gap:6px}
    .sync-dot{width:7px;height:7px;border-radius:50%;background:#aab8c4}.sync-pill[data-state="synced"] .sync-dot{background:#5ee0ae}.sync-pill[data-state="syncing"] .sync-dot{background:#ffca58}.sync-pill[data-state="error"] .sync-dot{background:#ff8585}
    .autosave-status{font-size:.76rem;color:#61758a;margin:6px 0 0;min-height:1.1em}.autosave-status.saved{color:#15805d}.autosave-status.error{color:#b94444}
    .calendar-action{gap:7px}.calendar-action .calendar-glyph{font-size:1.05rem}
    .feed-label{display:block;margin:14px 0 6px;font-size:.76rem;font-weight:800;color:#61758a;text-transform:uppercase;letter-spacing:.06em}
    .feed-copy{display:grid;grid-template-columns:1fr auto;gap:7px}.feed-copy input{min-width:0;border:1px solid #dce5ed;border-radius:10px;padding:10px;font:inherit;color:#102a43;background:#f8fafb}.feed-copy button{border:1px solid #dce5ed;border-radius:10px;background:white;color:#1769aa;font-weight:750;padding:8px 12px}
    .sync-dialog{max-width:480px}.sync-dialog .detail-inner{padding:24px}.sync-dialog input{width:100%;border:1px solid #dce5ed;border-radius:10px;padding:11px 12px;font:inherit;margin:8px 0}.sync-dialog .token-help{font-size:.82rem;color:#61758a;line-height:1.45}.sync-dialog .sync-message{min-height:1.2em;font-size:.82rem;color:#61758a}.sync-dialog .sync-message.error{color:#b94444}.sync-dialog .sync-message.ok{color:#15805d}
    @media(max-width:600px){.sync-pill .sync-label{display:none}.sync-pill{width:38px;height:38px;justify-content:center;padding:0}}
  `;
  document.head.appendChild(style);

  const nativeRender=typeof render==='function'?render:null;
  const sync=window.OpenDaySync;
  let noteTimer=null;

  function enhanceHeader(){
    const header=document.querySelector('header');if(!header||document.querySelector('#syncPill'))return;
    let actions=header.querySelector('.header-actions');
    if(!actions){actions=document.createElement('div');actions.className='header-actions';const install=document.querySelector('#installBtn');if(install)actions.appendChild(install);header.appendChild(actions)}
    const button=document.createElement('button');button.id='syncPill';button.className='sync-pill';button.type='button';button.dataset.state=sync?.hasToken?.()?'syncing':'local';button.innerHTML='<span class="sync-dot"></span><span class="sync-label">Sync</span>';button.setAttribute('aria-label','Open sync settings');actions.insertBefore(button,actions.firstChild);button.onclick=openSyncDialog;
  }

  function ensureSyncDialog(){
    let d=document.querySelector('#syncDialog');if(d)return d;
    d=document.createElement('dialog');d.id='syncDialog';d.className='sync-dialog';d.innerHTML=`<div class="detail-inner"><p class="eyebrow" style="color:#1769aa">PRIVATE SYNC</p><h2>Sync across your devices</h2><p>Enter the same memorable token on each device. There is no visible account or login screen.</p><label for="syncToken"><b>Memorable token</b></label><input id="syncToken" type="password" autocomplete="current-password" spellcheck="false" placeholder="e.g. four-unrelated-words-27"><p class="token-help">The token is the password for one dedicated Firebase Authentication account used only by Openday. The app signs in directly to Firebase and Firestore rules restrict the private Openday document to that account. No Firebase Function is used.</p><div class="modal-actions"><button id="connectToken" class="primary" type="button">Connect & sync</button><button id="showToken" type="button">Show</button><button id="copySetupLink" type="button">Copy setup link</button><button id="forgetToken" type="button">Forget token</button></div><p id="syncMessage" class="sync-message"></p><p class="sources">Use the same token on another device, or paste it manually here. A setup link can carry it in the URL fragment, which is removed after the app reads it.</p></div><button class="close" data-close-sync aria-label="Close">×</button>`;document.body.appendChild(d);
    const input=d.querySelector('#syncToken'),message=d.querySelector('#syncMessage');
    d.querySelector('#showToken').onclick=e=>{input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Show':'Hide'};
    d.querySelector('#connectToken').onclick=async()=>{
      message.className='sync-message';message.textContent='Connecting…';
      try{await sync.connect(input.value);message.className='sync-message ok';message.textContent='Connected. Changes will sync automatically.'}
      catch(error){message.className='sync-message error';message.textContent=error.message}
    };
    d.querySelector('#copySetupLink').onclick=async e=>{
      const typed=input.value.trim();const link=sync?.setupLink?.(typed);if(!link){message.className='sync-message error';message.textContent='Enter your token first.';return}
      try{await navigator.clipboard.writeText(link);e.currentTarget.textContent='Copied ✓';message.className='sync-message ok';message.textContent='Private setup link copied.'}catch{message.className='sync-message error';message.textContent='Could not copy the link on this browser.'}
    };
    d.querySelector('#forgetToken').onclick=()=>{sync?.disconnect?.();input.value='';message.className='sync-message';message.textContent='Firebase session removed from this device.'};
    d.onclick=e=>{if(e.target.hasAttribute('data-close-sync')||e.target===d)d.close()};
    return d;
  }
  function openSyncDialog(){ensureSyncDialog().showModal()}

  function updateSyncStatus(detail={}){
    const b=document.querySelector('#syncPill');if(!b)return;b.dataset.state=detail.state||'local';const label=b.querySelector('.sync-label');if(label)label.textContent=detail.state==='synced'?'Synced':detail.state==='syncing'?'Saving':'Sync';b.title=detail.text||'Sync settings';
    const openStatus=document.querySelector('#detailBody .autosave-status');if(openStatus&&detail.state==='synced'){openStatus.className='autosave-status saved';openStatus.textContent='Saved & synced'}else if(openStatus&&detail.state==='error'){openStatus.className='autosave-status error';openStatus.textContent='Saved locally · sync unavailable'}
    const message=document.querySelector('#syncMessage');if(message&&document.querySelector('#syncDialog')?.open&&!message.textContent)message.textContent=detail.text||'';
  }
  window.addEventListener('openday:sync-status',e=>updateSyncStatus(e.detail));
  window.addEventListener('openday:cloud-state',e=>{
    if(typeof state==='object'&&e.detail){Object.assign(state,e.detail);localStorage.setItem('openDayState',JSON.stringify(state));nativeRender?.()}
  });

  function identifyOpenSchool(){
    const name=document.querySelector('#detailBody h2')?.textContent;if(!name||typeof schools==='undefined')return null;
    const dateText=document.querySelector('#detailBody .bigdate')?.textContent;
    return schools.find(s=>s.name===name&&(!dateText||fmtDate(s.start)===dateText))||schools.find(s=>s.name===name)||null;
  }
  function enhanceDetail(){
    const note=document.querySelector('#detailBody #note');if(!note||note.dataset.autosave)return;
    const school=identifyOpenSchool();if(!school)return;note.dataset.autosave='1';
    document.querySelector('#detailBody #saveNote')?.remove();
    const status=document.createElement('p');status.className='autosave-status saved';status.textContent=sync?.hasToken?.()?'Saved automatically · sync connected':'Saved automatically on this device';note.after(status);
    const persist=()=>{
      state.notes[school.id]=note.value;saveState();status.className='autosave-status saved';status.textContent=sync?.hasToken?.()?'Saved locally · syncing…':'Saved on this device';sync?.schedule?.();
    };
    note.addEventListener('input',()=>{status.className='autosave-status';status.textContent='Saving…';clearTimeout(noteTimer);noteTimer=setTimeout(persist,350)});
    note.addEventListener('blur',()=>{clearTimeout(noteTimer);persist()});
    const cal=document.querySelector('#detailBody #calendar');if(cal){cal.classList.add('calendar-action');cal.innerHTML='<span class="calendar-glyph" aria-hidden="true">📅</span> Add to calendar';cal.setAttribute('aria-label','Add this visit to calendar')}
  }
  const detailBody=document.querySelector('#detailBody');if(detailBody)new MutationObserver(enhanceDetail).observe(detailBody,{childList:true,subtree:true});

  function enhanceTravelCards(){
    document.querySelectorAll('.card').forEach(card=>{
      const meta=card.querySelector('.meta');if(!meta||meta.dataset.travelLabelled)return;
      meta.textContent=meta.textContent.replace(/Approx\. ([^·;]+?) drive from HA1 3PU(?: · check live traffic|; check live traffic)?/g,'🚗 Car est. $1 from HA1 3PU');meta.dataset.travelLabelled='1';
    });
  }
  const list=document.querySelector('#list');if(list)new MutationObserver(enhanceTravelCards).observe(list,{childList:true,subtree:true});enhanceTravelCards();

  function installCalendarSubscriptionFix(){
    const button=document.querySelector('#subscribeBtn');if(!button)return;
    const feed='https://nirav2000.github.io/Openday/calendar.ics';
    const copy=document.querySelector('#copyFeedBtn');if(copy)copy.onclick=async e=>{try{await navigator.clipboard.writeText(feed);e.currentTarget.textContent='Copied ✓'}catch{const input=document.querySelector('#feedUrl');input.focus();input.select();document.execCommand('copy')}};
    button.onclick=()=>{
      document.querySelector('#icsLink').href=feed;document.querySelector('#feedUrl').value=feed;
      const apple=document.querySelector('#webcalLink'),webcal=`webcal://${feed.replace(/^https?:\/\//,'')}`;apple.href=webcal;
      apple.onclick=e=>{e.preventDefault();window.location.assign(webcal)};
      document.querySelector('#subscribeDialog').showModal();
    };
  }

  async function initialiseVersion(){
    try{
      const release=await fetch('version.json',{cache:'no-store'}).then(r=>r.json());
      const el=document.querySelector('#appVersion');if(el)el.textContent=`v${release.version}`;
      const lab=window.createVersionLab?.({appId:'openday',currentVersion:release.version});
      lab?.recordRelease?.({version:release.version,date:release.released,summary:release.summary,areas:['sync','autosave','calendar','card-density','developer-notes']});
    }catch{}
  }

  enhanceHeader();ensureSyncDialog();installCalendarSubscriptionFix();initialiseVersion();
  try{const stored=JSON.parse(localStorage.getItem('openDayState')||'{}');if(typeof state==='object'&&JSON.stringify(stored)!==JSON.stringify(state)){Object.assign(state,stored);nativeRender?.()}}catch{}
  updateSyncStatus({state:sync?.hasToken?.()?'syncing':'local',text:sync?.hasToken?.()?'Checking cloud…':'Local only'});
})();
