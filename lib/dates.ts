import { WeekRange } from '@/types';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(date: Date = new Date()): WeekRange {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday,
    end: sunday,
    startISO: monday.toISOString(),
    endISO: sunday.toISOString(),
    startDate: toDateStr(monday),
    endDate: toDateStr(sunday),
  };
}

export function getPreviousWeekRange(date: Date = new Date()): WeekRange {
  const current = getWeekRange(date);
  const prevMonday = new Date(current.start);
  prevMonday.setDate(prevMonday.getDate() - 7);
  return getWeekRange(prevMonday);
}

export function isMonday(date: Date = new Date()): boolean {
  return date.getDay() === 1;
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
