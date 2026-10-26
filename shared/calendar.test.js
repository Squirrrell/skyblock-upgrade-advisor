import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SB_DAY, SB_EPOCH, SB_YEAR, nextHourly, nextYearly, sbDate, sbToReal, upcomingEvents } from './calendar.js';

test('sbDate starts at year 1, Early Spring 1st', () => {
  assert.deepEqual(sbDate(SB_EPOCH), { year: 1, month: 1, monthName: 'Early Spring', day: 1, hour: 0, minute: 0 });
  const d = sbDate(sbToReal(522, 6, 17, 6));
  assert.equal(d.year, 522);
  assert.equal(d.monthName, 'Late Summer');
  assert.equal(d.day, 17);
  assert.equal(d.hour, 6);
});

test('the election elected in year 521 sits before late October 2026', () => {
  // 27 Oct 2026 is in year 522, after the Late Spring election.
  const now = Date.UTC(2026, 9, 27);
  assert.equal(sbDate(now).year, 522);
});

test('yearly windows report active and roll over to next year', () => {
  const start = sbToReal(10, 8, 29);
  assert.equal(nextYearly(start + SB_DAY, 8, 29, 3).active, true);
  assert.equal(nextYearly(start + 3 * SB_DAY, 8, 29, 3).start, start + SB_YEAR);
});

test('hourly events land on the right minute', () => {
  const now = Date.UTC(2026, 0, 1, 10, 40);
  const da = nextHourly(now, 55, 5);
  assert.equal(new Date(da.start).getUTCMinutes(), 55);
  assert.equal(da.active, false);
  assert.equal(nextHourly(Date.UTC(2026, 0, 1, 10, 20), 15, 20).active, true);
  assert.ok(upcomingEvents(now).length >= 10);
});
