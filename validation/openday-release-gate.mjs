export async function run({page,assert,sleep,waitForQuiescence,metrics}){
  const legacy={
    saved:['ark-morning-2026-09-28'],
    booked:{'ark-evening':true,'ark-morning-2026-09-29':false},
    notes:{
      'ark-morning-2026-09-28':'Morning visit note',
      'ark-evening':'Evening visit note'
    },
    watchBooking:['ark-evening'],
    visitedSchools:['ark-morning-2026-09-29'],
    shortlistedSchools:['ark-morning-2026-09-30'],
    rejectedSchools:[],
    schoolDecisions:{
      'ark-morning-2026-09-28':['liked'],
      'ark-evening':['try-for']
    },
    eventOverrides:{},
    performanceSchoolSets:{},
    performanceCompareOrder:[],
    performanceSubjectOrder:{gcse:[],alevel:[]},
    mergeConflicts:{},
    updatedAt:'2026-10-01T12:00:00.000Z'
  };
  const ids=['ark-morning-2026-09-28','ark-morning-2026-09-29','ark-morning-2026-09-30','ark-evening'];
  const key='school:ark-academy:wembley';

  await page.evaluate(data=>localStorage.setItem('openDayState',JSON.stringify(data)),legacy);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#list .card',{timeout:10000});

  const migrated=await page.evaluate(({ids,key})=>{
    const state=JSON.parse(localStorage.getItem('openDayState')||'{}');
    const schoolFields=['saved','watchBooking','visitedSchools','shortlistedSchools','rejectedSchools'];
    return {
      state,
      schoolFields:schoolFields.map(field=>({field,values:state[field]||[],legacy:(state[field]||[]).filter(v=>ids.includes(v))})),
      noteKeys:Object.keys(state.notes||{}),
      decisionKeys:Object.keys(state.schoolDecisions||{}),
      decisions:state.schoolDecisions?.[key]||[],
      canonicalKey:window.OpenDaySchoolState?.key?.({name:'Ark Academy',area:'Wembley'}),
      hasSyncTestHooks:!!window.OpenDaySync?.__test
    };
  },{ids,key});

  assert.equal(migrated.canonicalKey,key,'Ark Academy resolves to one canonical school key');
  assert(migrated.hasSyncTestHooks,'Release-gate-only sync test hooks are available');
  for(const row of migrated.schoolFields)assert.equal(row.legacy.length,0,`${row.field} contains no legacy Ark event IDs after migration`);
  assert(migrated.state.saved.includes(key),'Saved state survives migration at school level');
  assert(migrated.state.watchBooking.includes(key),'Booking watch survives migration at school level');
  assert(migrated.state.visitedSchools.includes(key),'Visited state survives migration at school level');
  assert(migrated.state.shortlistedSchools.includes(key),'Shortlist state survives migration at school level');
  assert.equal(migrated.state.rejectedSchools.length,0,'Rejected state remains unchanged');
  assert.deepEqual(migrated.decisions.sort(),['liked','try-for'],'All My View selections survive and combine');
  assert.equal(migrated.decisionKeys.filter(k=>ids.includes(k)).length,0,'Legacy event decision keys are removed');
  assert(migrated.noteKeys.includes(key),'Notes move to the canonical school key');
  assert.equal(migrated.noteKeys.filter(k=>ids.includes(k)).length,0,'Legacy event note keys are removed');
  assert(String(migrated.state.notes[key]).includes('Morning visit note'),'Morning note text survives migration');
  assert(String(migrated.state.notes[key]).includes('Evening visit note'),'Evening note text survives migration');
  assert.equal(migrated.state.booked['ark-evening'],true,'Booked state remains attached to the selected visit');
  assert.equal(migrated.state.booked['ark-morning-2026-09-29'],false,'Unbooked visit remains unbooked');

  await page.locator('[data-filter="all"]').click();
  await page.locator('#search').fill('Ark Academy');
  await page.locator('#list .card .details').first().click();
  assert.equal(await page.locator('#detailBody [data-decision].selected').count(),2,'Ark detail shows both shared My View selections');
  assert.equal(await page.locator('#detailBody [data-decision="liked"].selected').count(),1,'Liked is selected');
  assert.equal(await page.locator('#detailBody [data-decision="try-for"].selected').count(),1,'Want to try for is selected');
  assert(String(await page.locator('#note').inputValue()).includes('Morning visit note'),'Shared school note is visible from any Ark event card');
  await page.locator('#detail [data-close]').click();

  const repeated=await page.evaluate(({legacy})=>{
    const sync=window.OpenDaySync,events={cloud:0,scheduled:0};
    window.addEventListener('openday:cloud-state',()=>events.cloud++);
    const originalSchedule=sync.schedule;
    sync.schedule=()=>{events.scheduled++};
    const before=sync.__test.comparableJSON(JSON.parse(localStorage.getItem('openDayState')||'{}'));
    const outcomes=[];
    for(let i=0;i<6;i++)outcomes.push(sync.__test.applyRemote(legacy));
    const after=sync.__test.comparableJSON(JSON.parse(localStorage.getItem('openDayState')||'{}'));
    sync.schedule=originalSchedule;
    return {before,after,events,needsCloudWrite:outcomes.map(x=>x.needsCloudWrite)};
  },{legacy});

  assert.equal(repeated.before,repeated.after,'Repeated legacy cloud snapshots do not alter canonical local state');
  assert.equal(repeated.events.cloud,0,'Repeated equivalent legacy snapshots emit no local cloud-change events');
  assert.equal(repeated.events.scheduled,0,'Repeated equivalent legacy snapshots schedule no writes');
  assert(repeated.needsCloudWrite.every(v=>v===false),'Equivalent legacy snapshots require no cloud write');

  const changedRemote=structuredClone(legacy);
  changedRemote.notes['ark-evening']='Evening visit note\nNew cloud line';
  changedRemote.updatedAt='2026-10-01T12:05:00.000Z';
  const changed=await page.evaluate(({changedRemote})=>{
    const sync=window.OpenDaySync,events={cloud:0,scheduled:0};
    window.addEventListener('openday:cloud-state',()=>events.cloud++);
    const originalSchedule=sync.schedule;sync.schedule=()=>{events.scheduled++};
    const first=sync.__test.applyRemote(changedRemote);
    const afterFirst=sync.__test.comparableJSON(JSON.parse(localStorage.getItem('openDayState')||'{}'));
    const more=[];for(let i=0;i<5;i++)more.push(sync.__test.applyRemote(changedRemote));
    const afterRepeated=sync.__test.comparableJSON(JSON.parse(localStorage.getItem('openDayState')||'{}'));
    sync.schedule=originalSchedule;
    return {events,firstNeeds:first.needsCloudWrite,moreNeeds:more.map(x=>x.needsCloudWrite),afterFirst,afterRepeated,state:JSON.parse(localStorage.getItem('openDayState')||'{}')};
  },{changedRemote});

  assert.equal(changed.events.cloud,1,'One substantive remote change is applied once');
  assert.equal(changed.events.scheduled,0,'Applying a canonical remote change does not schedule a write-back loop');
  assert.equal(changed.afterFirst,changed.afterRepeated,'Repeated identical remote snapshots are quiescent');
  assert.equal(changed.firstNeeds,false,'Accepted remote change does not require a write-back');
  assert(changed.moreNeeds.every(v=>v===false),'Repeated remote snapshots remain no-op');
  assert(String(changed.state.notes[key]).includes('New cloud line'),'Remote note change is preserved after convergence');

  const writeDecision=await page.evaluate(({key})=>{
    const sync=window.OpenDaySync;
    const cloud=JSON.parse(localStorage.getItem('openDayState')||'{}');
    const local=structuredClone(cloud);
    local.schoolDecisions[key]=[...(local.schoolDecisions[key]||[]),'visit-again'];
    const first=sync.__test.shouldWrite(local,cloud);
    const settled=sync.__test.shouldWrite(local,local);
    return {first,settled};
  },{key});
  assert.equal(writeDecision.first,true,'A deliberate local state change requires one cloud write');
  assert.equal(writeDecision.settled,false,'After cloud catches up, the same state requires no further write');

  const quiet=await waitForQuiescence(async()=>page.evaluate(()=>({
    state:window.OpenDaySync?.__test?.comparableJSON?.(JSON.parse(localStorage.getItem('openDayState')||'{}')),
    pending:JSON.parse(localStorage.getItem('openday.unsyncedNotes.v1')||'[]').length
  })),{quietMs:400,timeoutMs:2500,maxChanges:2});
  assert(quiet.changes<=2,'App state reaches quiescence within the allowed transition budget');

  metrics.scenario={
    name:'OpenDay school-state + sync quiescence',
    canonicalSchoolKey:key,
    legacyEventIds:ids.length,
    repeatedEquivalentSnapshots:6,
    repeatedChangedSnapshots:5,
    cloudChangeEventsForEquivalentSnapshot:repeated.events.cloud,
    scheduledWritesForEquivalentSnapshot:repeated.events.scheduled,
    cloudChangeEventsForOneRemoteChange:changed.events.cloud,
    scheduledWritesForOneRemoteChange:changed.events.scheduled,
    quiescenceTransitions:quiet.changes,
    quiescenceElapsedMs:quiet.elapsedMs
  };
}
