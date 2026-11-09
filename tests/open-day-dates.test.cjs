'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const senior = load('schools.json').schools;
const primary = load('primary-schools.json').schools;
const lookup = (arr, id) => {
  const row = arr.find(s => s.id === id);
  assert.ok(row, 'Missing stable school/event ID ' + id);
  return row;
};
const day = new Date('2026-11-09T00:00:00Z');
const parse = value => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00Z' : value);
test('unique stable event IDs, usable dates, and supported future confirmed records', () => {
  for (const group of [senior, primary]) {
    assert.equal(new Set(group.map(s => s.id)).size, group.length, 'Duplicate IDs');
    for (const school of group) {
      for (const visit of [school, ...(school.alternateVisits || [])]) {
        if (!visit.start) continue;
        const start = parse(visit.start);
        assert.ok(Number.isFinite(start.getTime()), 'Unparseable date: ' + school.id + ' ' + visit.start);
        if (visit.end) assert.ok(parse(visit.end) >= start, 'End precedes start: ' + school.id);
        if (start >= day && visit.status === 'confirmed') {
          assert.match(school.dateVerification?.sourceUrl || '', /^https:\/\//, 'Missing dated official evidence: ' + school.id);
        }
      }
    }
  }
});
test('Winchester November/December 2026 history is retained without incorrectly showing an upcoming confirmed event', () => {
  for (const [id, date] of [['winchester-nov','2026-11-12'], ['winchester-dec','2026-12-04']]) {
    const row = lookup(senior, id);
    assert.equal(row.start, null);
    assert.ok(row.lastKnownStart.startsWith(date));
    assert.equal(row.dateVerification.level, 'previously-published-now-unlisted');
    assert.notEqual(row.status, 'confirmed');
  }
  assert.equal(lookup(senior, 'winchester-oct').status, 'confirmed');
  for (const [id, date] of [['winchester-2027-jan21','2027-01-21'],['winchester-2027-feb11','2027-02-11'],['winchester-2027-mar6','2027-03-06']]) {
    assert.ok(lookup(senior,id).start.startsWith(date));
  }
  assert.match(lookup(senior,'winchester-2027-feb11').eligibility,/overseas/i);
});
test('Reception 2027 dates are sourced and old-year mistakes are withdrawn', () => {
  for (const [id, date] of [
    ['cannon-lane-primary','2026-11-10'], ['primary-139117','2026-11-10'],
    ['aylward-primary','2026-11-17'], ['primary-139909','2026-11-19'],
    ['primary-138983','2026-11-25'], ['primary-141561','2026-11-09']
  ]) assert.ok(lookup(primary,id).start.startsWith(date));
  const tour = (id,date) => (lookup(primary,id).alternateVisits || []).some(v => v.start?.startsWith(date));
  assert.ok(tour('whitchurch-primary','2026-11-30'));
  assert.ok(!tour('whitchurch-primary','2026-11-09'));
  assert.ok(!tour('wembley-primary','2026-11-19'));
  assert.equal(lookup(primary,'priestmead-primary').start,null);
  assert.ok(!tour('priestmead-primary','2027-01-12'));
  assert.ok(tour('st-john-fisher-primary','2027-01-07'));
  for (const visit of lookup(primary,'st-john-fisher-primary').alternateVisits)
    if (/2026-11-(19|26)/.test(visit.start||'')) assert.equal(visit.availability,'sold-out');
});
test('main listing includes future alternate dates and calendar includes them too', () => {
  const js = fs.readFileSync(path.join(root, 'app.js'),'utf8');
  assert.doesNotThrow(() => new Function(js), 'JavaScript parse');
  assert.match(js, /nextUpcomingVisit=s=>knownVisits\(s\)/);
  assert.match(js, /if\(filter==='upcoming'\)return !!nextUpcomingVisit\(s\)/);
  assert.match(js, /const events=out\.flatMap\(s=>knownVisits\(s\)/);
  assert.match(js, /showDetail\(school,knownVisits\(school\)\.find/);
});
