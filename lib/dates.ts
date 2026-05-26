import { WeekRange } from '@/types';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(date: Date = new Date()): WeekRange {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday

  // Weeks run Sunday–Saturday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  return {
    start: sunday,
    end: saturday,
    startISO: sunday.toISOString(),
    endISO: saturday.toISOString(),
    startDate: toDateStr(sunday),
    endDate: toDateStr(saturday),
  };
}

export function getPreviousWeekRange(date: Date = new Date()): WeekRange {
  const current = getWeekRange(date);
  const prevSunday = new Date(current.start);
  prevSunday.setDate(prevSunday.getDate() - 7);
  return getWeekRange(prevSunday);
}

// Returns true on Sunday — the first day of the Sun–Sat week.
// Used to decide whether to show last-week comparison on the dashboard.
export function isSunday(date: Date = new Date()): boolean {
  return date.getDay() === 0;
}

// Build a WeekRange from arbitrary YYYY-MM-DD strings (for custom date range queries).
export function buildRangeFromDates(startDate: string, endDate: string): WeekRange {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59.999');
  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate,
    endDate,
  };
}

export function formatLastUpdated(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

export function formatWeekLabel(range: WeekRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = range.start.toLocaleDateString('en-US', opts);
  const end = range.end.toLocaleDateString('en-US', opts);
  return `${start} – ${end}`;
}

// Parse MM/DD/YYYY from Google Sheets and return a Date
export function parseSheetDate(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  const [month, day, year] = parts.map(Number);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

export function isDateInRange(date: Date | null, range: WeekRange): boolean {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

// Returns date string 45 days before a given date (for dormant lead detection)
export function getDormantThreshold(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - 45);
  d.setHours(0, 0, 0, 0);
  return d;
}
