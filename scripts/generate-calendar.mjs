import fs from 'node:fs';

const seniorData=JSON.parse(fs.readFileSync('data/schools.json','utf8'));
const primaryData=JSON.parse(fs.readFileSync('data/primary-schools.json','utf8'));
const enhancements=JSON.parse(fs.readFileSync('data/enhancements.json','utf8'));
const esc=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const dateOnly=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const dt=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const datePart=value=>String(value||'').slice(0,10);
const timePart=value=>dateOnly(value)?'':(String(value||'').match(/T(\d{2}:\d{2})/)?.[1]||'');

function londonOffset(date){
  const probe=new Date(date+'T12:00:00Z');
  const name=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeZoneName:'longOffset'}).formatToParts(probe).find(p=>p.type==='timeZoneName')?.value||'GMT';
  const m=name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if(!m)return '+00:00';
  return (m[1]==='-'?'-':'+')+m[2]+':'+(m[3]||'00');
}
const localIso=(date,time)=>date+(time?'T'+time+':00'+londonOffset(date):'');

function fireValue(value){
  if(!value)return null;
  if('stringValue'in value)return value.stringValue;
  if('timestampValue'in value)return value.timestampValue;
  if('booleanValue'in value)return value.booleanValue;
  return null;
}
async function publicReports(){
  try{
    const url='https://firestore.googleapis.com/v1/projects/kk-syllabus/databases/(default)/documents/openday_public_reports?pageSize=1000';
    const res=await fetch(url,{headers:{'User-Agent':'openday-calendar-builder'}});
    if(!res.ok){console.warn('Public Openday reports unavailable for calendar build:',res.status);return new Map()}
    const body=await res.json(),latest=new Map();
    for(const doc of body.documents||[]){
      const f=doc.fields||{},r={
        schoolId:String(fireValue(f.schoolId)||''),
        date:String(fireValue(f.date)||''),
        startTime:String(fireValue(f.startTime)||''),
        endTime:String(fireValue(f.endTime)||''),
        contributorLabel:String(fireValue(f.contributorLabel)||'Anonymous reporter'),
        updatedAt:String(fireValue(f.updatedAt)||'')
      };
      if(!r.schoolId)continue;
      const prior=latest.get(r.schoolId);
      if(!prior||Date.parse(r.updatedAt||0)>=Date.parse(prior.updatedAt||0))latest.set(r.schoolId,r);
    }
    console.log('Loaded '+latest.size+' latest public date/time reports');
    return latest;
  }catch(error){console.warn('Could not load public Openday reports:',error.message);return new Map()}
}

const reports=await publicReports();
const schools=[...(seniorData.schools||[]).map(s=>({...s,phase:'Senior'})),...(primaryData.schools||[]).map(s=>({...s,phase:'Primary'}))];
const events=[];

function reportedTiming(s,report){
  if(!report)return {start:s.start,end:s.end,attribution:''};
  const baseDate=datePart(s.start||s.lastKnownStart||'');
  const date=report.date||baseDate;
  if(!date)return {start:s.start,end:s.end,attribution:''};
  const startTime=report.startTime||timePart(s.start);
  const endTime=report.endTime||timePart(s.end);
  return {
    start:startTime?localIso(date,startTime):date,
    end:endTime?localIso(date,endTime):null,
    attribution:`Reported date/time by ${report.contributorLabel}${report.updatedAt?' on '+new Date(report.updatedAt).toISOString().slice(0,10):''}. `,
    updatedAt:report.updatedAt
  };
}

for(const school of schools){
  const report=reports.get(school.id),timing=reportedTiming(school,report);
  if(timing.start)events.push({
    uid:school.id,name:school.name,event:school.event,start:timing.start,end:timing.end,area:school.area,
    infoUrl:school.infoUrl,note:timing.attribution+(school.note||''),phase:school.phase,updatedAt:timing.updatedAt
  });
  const extra=enhancements.schools?.[school.id];
  const alternates=[...(school.alternateVisits||[]),...(extra?.alternateVisits||[])];
  for(const [i,visit] of alternates.entries()){
    if(!visit.start)continue;
    events.push({uid:`${school.id}-alt-${i}`,name:school.name,event:visit.event,start:visit.start,end:visit.end,area:school.area,infoUrl:visit.bookingUrl||school.infoUrl,note:visit.note||'',phase:school.phase});
  }
}

const unique=[...new Map(events.map(e=>[`${e.uid}|${e.event}`,e])).values()];
const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Open Day Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:School Open Days','X-WR-CALDESC:Public school open days and admissions visits tracked in Openday','REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
for(const event of unique){
  const timing=[];
  if(dateOnly(event.start)){
    const start=event.start.replace(/-/g,''),d=new Date(event.start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);
    const end=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
    timing.push(`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`);
  }else{
    const end=event.end||new Date(new Date(event.start).getTime()+2*60*60*1000).toISOString();
    timing.push(`DTSTART:${dt(event.start)}`,`DTEND:${dt(end)}`);
  }
  lines.push(
    'BEGIN:VEVENT',
    `UID:${esc(event.uid)}@openday`,
    `DTSTAMP:${dt(new Date())}`,
    ...(event.updatedAt?[`LAST-MODIFIED:${dt(event.updatedAt)}`]:[]),
    ...timing,
    `SUMMARY:${esc(`${event.name} — ${event.event}`)}`,
    `LOCATION:${esc(event.area)}`,
    `CATEGORIES:${esc(event.phase)}`,
    `DESCRIPTION:${esc(`${event.note||''} ${event.infoUrl||''}`.trim())}`,
    'END:VEVENT'
  );
}
lines.push('END:VCALENDAR');
fs.writeFileSync('calendar.ics',lines.join('\r\n')+'\r\n');
console.log(`Generated calendar.ics with ${unique.length} public events from Senior and Primary catalogues`);
