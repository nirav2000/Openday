import fs from 'node:fs';

const schoolData = JSON.parse(fs.readFileSync('data/schools.json','utf8'));
const enhancements = JSON.parse(fs.readFileSync('data/enhancements.json','utf8'));
const esc = value => String(value ?? '').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const dt = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const events = [];

for (const school of schoolData.schools) {
  if (school.start) events.push({uid:school.id,name:school.name,event:school.event,start:school.start,end:school.end,area:school.area,infoUrl:school.infoUrl,note:school.note});
  const extra = enhancements.schools?.[school.id];
  for (const [i,visit] of (extra?.alternateVisits || []).entries()) {
    if (!visit.start) continue;
    events.push({uid:`${school.id}-alt-${i}`,name:school.name,event:visit.event,start:visit.start,end:visit.end,area:school.area,infoUrl:visit.bookingUrl||school.infoUrl,note:visit.note||''});
  }
}

const unique = [...new Map(events.map(e => [`${e.name}|${e.event}|${e.start}`, e])).values()];
const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Open Day Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:School Open Days','X-WR-CALDESC:School open days and admissions visits tracked in Open Day Tracker'];
for (const event of unique) {
  const end = event.end || new Date(new Date(event.start).getTime()+2*60*60*1000).toISOString();
  lines.push('BEGIN:VEVENT',`UID:${esc(event.uid)}@openday`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(event.start)}`,`DTEND:${dt(end)}`,`SUMMARY:${esc(`${event.name} — ${event.event}`)}`,`LOCATION:${esc(event.area)}`,`DESCRIPTION:${esc(`${event.note || ''} ${event.infoUrl || ''}`.trim())}`,'END:VEVENT');
}
lines.push('END:VCALENDAR');
fs.writeFileSync('calendar.ics', lines.join('\r\n')+'\r\n');
console.log(`Generated calendar.ics with ${unique.length} events`);
