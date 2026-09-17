(()=>{
  const style=document.createElement('style');
  style.textContent='[hidden]{display:none!important}.feed-label{display:block;margin:14px 0 6px;font-size:.76rem;font-weight:800;color:#61758a;text-transform:uppercase;letter-spacing:.06em}.feed-copy{display:grid;grid-template-columns:1fr auto;gap:7px}.feed-copy input{min-width:0;border:1px solid #dce5ed;border-radius:10px;padding:10px;font:inherit;color:#102a43;background:#f8fafb}.feed-copy button{border:1px solid #dce5ed;border-radius:10px;background:white;color:#1769aa;font-weight:750;padding:8px 12px}';
  document.head.appendChild(style);

  const $=s=>document.querySelector(s);
  const list=$('#list'),calendar=$('#calendarView'),listBtn=$('#listViewBtn'),calendarBtn=$('#calendarViewBtn');
  const forceView=view=>setTimeout(()=>{
    if(!list||!calendar)return;
    const isCalendar=view==='calendar';
    list.hidden=isCalendar; list.style.display=isCalendar?'none':'';
    calendar.hidden=!isCalendar; calendar.style.display=isCalendar?'block':'none';
  },0);
  calendarBtn?.addEventListener('click',()=>forceView('calendar'));
  listBtn?.addEventListener('click',()=>forceView('list'));

  const feed='https://nirav2000.github.io/Openday/calendar.ics';
  const wireFeed=()=>setTimeout(()=>{
    const webcal=$('#webcalLink'),ics=$('#icsLink'),input=$('#feedUrl');
    if(webcal)webcal.href=feed.replace('https:','webcal:');
    if(ics)ics.href=feed;
    if(input)input.value=feed;
  },0);
  $('#subscribeBtn')?.addEventListener('click',wireFeed);
  $('#copyFeedBtn')?.addEventListener('click',async e=>{
    try{await navigator.clipboard.writeText(feed)}catch{const input=$('#feedUrl');input?.focus();input?.select();document.execCommand('copy')}
    e.currentTarget.textContent='Copied ✓';
  });

  const transit={
    'Berkhamsted Boys':'🚆 PT est. ~45–55 min overall',
    "St Margaret's School":'🚌 PT est. ~45–50 min'
  };
  const enhanceTravel=()=>document.querySelectorAll('.card').forEach(card=>{
    const meta=card.querySelector('.meta'),name=card.querySelector('h2')?.textContent;if(!meta||!name||meta.dataset.travelFixed)return;
    let text=meta.textContent
      .replace(/Approx\. ([^·;]+?) drive from HA1 3PU · check live traffic/g,'🚗 Car est. $1 from HA1 3PU')
      .replace(/Approx\. ([^·;]+?) drive from HA1 3PU; check live traffic/g,'🚗 Car est. $1 from HA1 3PU');
    if(transit[name]&&!text.includes('PT est.')){const parts=text.split(' · ');parts.splice(Math.max(1,parts.length-1),0,transit[name]);text=parts.join(' · ')}
    meta.textContent=text;meta.dataset.travelFixed='1';
  });
  enhanceTravel();
  if(list)new MutationObserver(enhanceTravel).observe(list,{childList:true,subtree:true});
})();
