(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const NOTE_KEY='openday.version-lab.notes.v1';
  let releases=[],currentVersion='',selectedVersion='',notes=loadNotes(),syncing=false;

  function loadNotes(){try{return JSON.parse(localStorage.getItem(NOTE_KEY)||'[]')}catch{return[]}}
  function saveNotes(){localStorage.setItem(NOTE_KEY,JSON.stringify(notes));renderNotes()}
  const release=v=>releases.find(r=>r.version===v)||releases[0];
  const sourceUrl=r=>r?.source||('https://github.com/nirav2000/Openday/tree/'+encodeURIComponent(r?.commit||'main'));
  const snapshotUrl=r=>r?.snapshot?(r.snapshot+'index.html?version-preview=1'):null;
  const openSnapshotUrl=r=>r?.snapshot?(r.snapshot+'index.html'):sourceUrl(r);
  const pairKey=()=>[$('leftVersion').value,$('rightVersion').value].sort().join('|');

  async function loadHistory(){
    const [history,current]=await Promise.all([
      fetch('manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manifest unavailable');return r.json()}).catch(async()=>{
        const reg=await fetch('releases.json',{cache:'no-store'}).then(r=>r.json());
        return{generatedAt:null,releases:[...(reg.releases||[])].reverse().map(x=>({...x,snapshot:'snapshots/'+x.version+'/',source:'https://github.com/nirav2000/Openday/tree/'+x.commit}))};
      }),
      fetch('../version.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({version:''}))
    ]);
    releases=history.releases||[];currentVersion=current.version||releases[0]?.version||'';
    $('currentPill').textContent=currentVersion?'Current · v'+currentVersion:'Version history';
    selectedVersion=currentVersion&&release(currentVersion)?currentVersion:releases[0]?.version;
    renderReleases();initControls();selectPreview(selectedVersion);
    $('staticFallback').hidden=true;
  }

  function renderReleases(){
    $('releaseGrid').innerHTML=releases.map((r,i)=>'<article class="release-card '+(r.version===currentVersion?'current':'')+'"><div class="release-meta"><span class="release-version">v'+esc(r.version)+'</span><span class="release-kind">'+esc(r.kind==='reconstructed'?'reconstructed milestone':r.version===currentVersion?'current release':'release')+'</span></div><h3>'+esc(r.label||r.subject||'Release')+'</h3><p>'+esc(r.date?new Date(r.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):String(r.commit||'').slice(0,12))+'</p><div class="release-actions"><button class="primary" type="button" data-preview="'+esc(r.version)+'">Preview</button><a href="'+esc(openSnapshotUrl(r))+'" target="_blank" rel="noopener">Browse version</a><button type="button" data-compare="'+esc(r.version)+'">Compare</button><a href="'+esc(sourceUrl(r))+'" target="_blank" rel="noopener">Source</a></div></article>').join('');
    document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{selectPreview(b.dataset.preview);document.querySelector('.snapshot-section').scrollIntoView({behavior:'smooth'})});
    document.querySelectorAll('[data-compare]').forEach(b=>b.onclick=()=>{const other=b.dataset.compare;$('leftVersion').value=currentVersion||releases[0]?.version;$('rightVersion').value=other;if($('leftVersion').value===$('rightVersion').value){const alt=releases.find(x=>x.version!==other);if(alt)$('leftVersion').value=alt.version}loadComparison();document.querySelector('#compare').scrollIntoView({behavior:'smooth'})});
  }

  function initControls(){
    const opts=selected=>releases.map(r=>'<option value="'+esc(r.version)+'" '+(r.version===selected?'selected':'')+'>v'+esc(r.version)+' · '+esc(r.label||r.subject||'Release')+'</option>').join('');
    const left=releases.find(r=>r.version!==currentVersion)?.version||releases[1]?.version||releases[0]?.version;
    $('leftVersion').innerHTML=opts(left);$('rightVersion').innerHTML=opts(currentVersion||releases[0]?.version);
    $('loadCompare').onclick=loadComparison;
    $('swapVersions').onclick=()=>{const a=$('leftVersion').value;$('leftVersion').value=$('rightVersion').value;$('rightVersion').value=a;loadComparison()};
    $('leftVersion').onchange=renderNotes;$('rightVersion').onchange=renderNotes;
    $('addComparisonNote').onclick=addNote;
    document.querySelectorAll('[data-viewport]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-viewport]').forEach(x=>x.classList.toggle('active',x===b));$('snapshotStage').className='snapshot-stage '+b.dataset.viewport});
    wireScrollSync($('leftFrame'),$('rightFrame'));wireScrollSync($('rightFrame'),$('leftFrame'));
    loadComparison();
  }

  function selectPreview(version){
    const r=release(version);if(!r)return;selectedVersion=version;
    $('previewTitle').textContent='v'+r.version+' · '+(r.label||r.subject||'Release');
    $('previewStatus').textContent=r.version===currentVersion?'Current exact deployment snapshot':'Exact Git-tree snapshot';
    $('openSource').href=sourceUrl(r);$('openSnapshot').href=openSnapshotUrl(r);
    const url=snapshotUrl(r);
    if(url){$('snapshotFrame').src=url}else{$('snapshotFrame').srcdoc='<div style="font-family:system-ui;padding:30px">Snapshot unavailable. Use the Git source link.</div>'}
  }

  function loadPreview(r,side){
    const frame=$(side+'Frame'),title=$(side+'Title'),status=$(side+'Status'),source=$(side+'Source');
    title.textContent='v'+r.version+' · '+(r.label||r.subject||'Release');source.href=sourceUrl(r);
    status.textContent='Loading exact snapshot…';
    const url=snapshotUrl(r);
    if(!url){frame.srcdoc='<div style="font-family:system-ui;padding:30px">Snapshot unavailable.</div>';status.textContent='Source only';return}
    frame.onload=()=>{status.textContent=r.version===currentVersion?'Current snapshot':'Frozen Git snapshot'};
    frame.src=url;
  }
  function loadComparison(){
    const left=release($('leftVersion').value),right=release($('rightVersion').value);
    if(!left||!right)return;loadPreview(left,'left');loadPreview(right,'right');renderNotes();
  }

  function wireScrollSync(frame,other){
    frame.addEventListener('load',()=>{
      try{
        frame.contentWindow.addEventListener('scroll',()=>{
          if(!$('syncScroll').checked||syncing)return;
          const d=frame.contentDocument?.documentElement,od=other.contentDocument?.documentElement;if(!d||!od)return;
          const max=Math.max(0,d.scrollHeight-frame.contentWindow.innerHeight),ratio=max?frame.contentWindow.scrollY/max:0,omax=Math.max(0,od.scrollHeight-other.contentWindow.innerHeight);
          syncing=true;other.contentWindow.scrollTo(0,omax*ratio);setTimeout(()=>{syncing=false},60);
        },{passive:true});
      }catch{}
    });
  }

  function addNote(){
    const text=$('comparisonNoteText').value.trim();if(!text)return;
    notes.push({id:crypto.randomUUID(),pair:pairKey(),versions:[$('leftVersion').value,$('rightVersion').value],text,createdAt:new Date().toISOString()});
    $('comparisonNoteText').value='';saveNotes();
  }
  function renderNotes(){
    const pair=pairKey(),list=$('comparisonNoteList');if(!list)return;
    const rows=notes.filter(n=>n.pair===pair);
    list.innerHTML=rows.length?rows.map(n=>'<article class="comparison-note"><button type="button" data-remove-note="'+esc(n.id)+'">Remove</button><small>v'+esc(n.versions?.[0])+' ↔ v'+esc(n.versions?.[1])+' · '+esc(new Date(n.createdAt).toLocaleString('en-GB'))+'</small><p>'+esc(n.text)+'</p></article>').join(''):'<p style="color:#61758a;font-size:.78rem">No notes for this version pair yet.</p>';
    list.querySelectorAll('[data-remove-note]').forEach(b=>b.onclick=()=>{notes=notes.filter(n=>n.id!==b.dataset.removeNote);saveNotes()});
  }

  loadHistory().catch(error=>{
    $('currentPill').textContent='Basic history';
    $('releaseGrid').innerHTML='<article class="release-card"><h3>Rich Version Lab could not load</h3><p>'+esc(error.message||error)+'</p></article>';
    $('staticFallback').hidden=false;
  });
})();