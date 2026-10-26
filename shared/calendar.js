// SkyBlock calendar. A SkyBlock day is 20 real minutes, a month is 31 days
// and a year is 12 months (124 real hours). Year 1 started at the epoch below.

export const SB_EPOCH = 1_560_275_700_000;
export const SB_HOUR = 50_000;
export const SB_DAY = 1_200_000;
export const SB_MONTH = 31 * SB_DAY;
export const SB_YEAR = 12 * SB_MONTH;

export const MONTHS = [
  'Early Spring', 'Spring', 'Late Spring', 'Early Summer', 'Summer', 'Late Summer',
  'Early Autumn', 'Autumn', 'Late Autumn', 'Early Winter', 'Winter', 'Late Winter',
];

export function sbDate(now = Date.now()) {
  const elapsed = now - SB_EPOCH;
  const year = Math.floor(elapsed / SB_YEAR) + 1;
  const inYear = elapsed % SB_YEAR;
  const month = Math.floor(inYear / SB_MONTH) + 1;
  const inMonth = inYear % SB_MONTH;
  const day = Math.floor(inMonth / SB_DAY) + 1;
  const inDay = inMonth % SB_DAY;
  const hour = Math.floor(inDay / SB_HOUR);
  const minute = Math.floor((inDay % SB_HOUR) / (SB_HOUR / 60));
  return { year, month, monthName: MONTHS[month - 1], day, hour, minute };
}

/** Real timestamp when SkyBlock `year`/`month`/`day` (all 1-based) begins. */
export const sbToReal = (year, month, day, hour = 0) => SB_EPOCH + (year - 1) * SB_YEAR + (month - 1) * SB_MONTH + (day - 1) * SB_DAY + hour * SB_HOUR;

/** Next (or current) yearly window starting on month/day and lasting `days`. */
export function nextYearly(now, month, day, days) {
  const { year } = sbDate(now);
  for (const y of [year - 1, year, year + 1]) {
    const start = sbToReal(y, month, day);
    const end = start + days * SB_DAY;
    if (end > now) return { start, end, active: start <= now };
  }
  return null;
}

/** Next window on given days of every month. `length` is in ms. */
export function nextMonthly(now, days, length, hour = 0) {
  const { year, month } = sbDate(now);
  for (let i = 0; i < 3; i++) {
    const m = ((month - 1 + i) % 12) + 1;
    const y = year + Math.floor((month - 1 + i) / 12);
    for (const d of days) {
      const start = sbToReal(y, m, d, hour);
      if (start + length > now) return { start, end: start + length, active: start <= now };
    }
  }
  return null;
}

/** Next window at a fixed real-time minute every hour, lasting `minutes`. */
export function nextHourly(now, minute, minutes) {
  const hour = Math.floor(now / 3_600_000) * 3_600_000;
  for (const base of [hour - 3_600_000, hour, hour + 3_600_000]) {
    const start = base + minute * 60_000;
    const end = start + minutes * 60_000;
    if (end > now) return { start, end, active: start <= now };
  }
  return null;
}

/**
 * Upcoming events, soonest first. `mayorKeys` are the keys of the current
 * mayor and minister, for mayor-only events.
 */
export function upcomingEvents(now = Date.now(), mayorKeys = []) {
  const list = [
    { id: 'jacob', name: "Jacob's Farming Contest", note: 'Every hour, three crops each', window: nextHourly(now, 15, 20) },
    { id: 'dark_auction', name: 'Dark Auction', note: 'Every hour at :55', window: nextHourly(now, 55, 5) },
    { id: 'star_cult', name: 'Cult of the Fallen Star', note: 'Dwarven Mines, 7th, 14th, 21st and 28th of each month', window: nextMonthly(now, [7, 14, 21, 28], 6 * SB_HOUR) },
    { id: 'spooky', name: 'Spooky Festival', note: 'Autumn 29th to 31st', window: nextYearly(now, 8, 29, 3) },
    { id: 'jerry', name: 'Season of Jerry', note: 'Late Winter 24th to 26th', window: nextYearly(now, 12, 24, 3) },
    { id: 'new_year', name: 'New Year Celebration', note: 'Late Winter 29th to 31st', window: nextYearly(now, 12, 29, 3) },
    { id: 'zoo_summer', name: 'Traveling Zoo', note: 'Early Summer 1st to 3rd', window: nextYearly(now, 4, 1, 3) },
    { id: 'zoo_winter', name: 'Traveling Zoo', note: 'Early Winter 1st to 3rd', window: nextYearly(now, 10, 1, 3) },
    { id: 'hoppity', name: "Hoppity's Hunt", note: 'All of spring', window: nextYearly(now, 1, 1, 93) },
    { id: 'election', name: 'Election booth open', note: 'Late Summer 27th to Late Spring 27th', window: nextYearly(now, 6, 27, 279) },
    { id: 'mayor', name: 'New mayor takes office', note: 'Late Spring 27th', window: nextYearly(now, 3, 27, 1) },
  ];
  if (mayorKeys.includes('fishing')) {
    list.push({ id: 'fishing_festival', name: 'Fishing Festival', note: 'Marina: first 3 days of every month', window: nextMonthly(now, [1], 3 * SB_DAY) });
  }
  return list.filter((e) => e.window).sort((a, b) => Number(b.window.active) - Number(a.window.active) || a.window.start - b.window.start);
}
