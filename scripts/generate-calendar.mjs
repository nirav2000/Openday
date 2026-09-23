import fs from 'node:fs';

const seniorData=JSON.parse(fs.readFileSync('data/schools.json','utf8'));
const primaryData=JSON.parse(fs.readFileSync('data/primary-schools.json','utf8'));
const enhancements=JSON.parse(fs.readFileSync('data/enhancements.json','utf8'));
const esc=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const dateOnly=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const dt=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');

const schools=[
  ...(seniorData.schools||[]).map(s=>({...s,phase:'Senior'})),
  ...(primaryData.schools||[]).map(s=>({...s,phase:'Primary'}))
];
const events=[];

for(const school of schools){
  if(school.start)events.push({
    uid:school.id,name:school.name,event:school.event,start:school.start,end:school.end,area:school.area,
    infoUrl:school.infoUrl,note:school.note||'',phase:school.phase
  });
  const extra=enhancements.schools?.[school.id];
  const alternates=[...(school.alternateVisits||[]),...(extra?.alternateVisits||[])];
  for(const [i,visit] of alternates.entries()){
    if(!visit.start)continue;
    events.push({
      uid:`${school.id}-alt-${i}`,name:school.name,event:visit.event,start:visit.start,end:visit.end,area:school.area,
      infoUrl:visit.bookingUrl||school.infoUrl,note:visit.note||'',phase:school.phase
    });
  }
}

const unique=[...new Map(events.map(e=>[`${e.uid}|${e.event}`,e])).values()];
const lines=[
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Open Day Tracker//EN',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:School Open Days',
  'X-WR-CALDESC:Public school open days and admissions visits tracked in Openday'
];

for(const event of unique){
  const timing=[];
  if(dateOnly(event.start)){
    const start=event.start.replace(/-/g,''),d=new Date(event.start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);
    const end=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
    timing.push(`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`);
  }else{
    timing.push(`DTSTART:${dt(event.start)}`);
    if(event.end)timing.push(`DTEND:${dt(event.end)}`);
  }
  lines.push(
    'BEGIN:VEVENT',
    `UID:${esc(event.uid)}@openday`,
    `DTSTAMP:${dt(new Date())}`,
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
console.log(`Generated calendar.ics with ${unique.length} events from calendar-source files`);
