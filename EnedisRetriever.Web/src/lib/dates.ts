/** Day helpers working on local calendar dates written as YYYY-MM-DD. */

export const DAY_MS = 86_400_000;

/** Enedis keeps about two years of load-curve history. */
export const MAX_HISTORY_DAYS = 730;

/** Longest period the dashboard loads in one go (matches the backend limit). */
export const MAX_PERIOD_DAYS = 366;

export function toIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseIsoDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(year, month - 1, date);
}

export function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseIsoDay(value).getTime());
}

export function addDays(day: string, amount: number): string {
  const date = parseIsoDay(day);

  date.setDate(date.getDate() + amount);

  return toIsoDay(date);
}

/** Number of days in [start, end], both included. */
export function countDays(start: string, end: string): number {
  return Math.round((parseIsoDay(end).getTime() - parseIsoDay(start).getTime()) / DAY_MS) + 1;
}

/** Today's curve is never complete, so the latest loadable day is yesterday. */
export function latestAvailableDay(): string {
  return addDays(toIsoDay(new Date()), -1);
}

export function earliestAvailableDay(): string {
  return addDays(latestAvailableDay(), -MAX_HISTORY_DAYS);
}

/**
 * Parses a backend timestamp ("2026-11-01T00:30:00", no offset) as local
 * wall-clock time, whatever the browser's time zone handling of ISO strings.
 */
export function parseLocalTimestamp(timestamp: string): Date {
  const [datePart, timePart = '00:00:00'] = timestamp.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, Math.floor(seconds || 0));
}

/** "HH:mm:ss" (or "d.HH:mm:ss") to minutes. */
export function durationToMinutes(duration: string): number {
  const parts = duration.split(':').map(Number);

  if (parts.length < 2 || parts.some(Number.isNaN)) {
    return 30;
  }

  return parts[0] * 60 + parts[1];
}

/** "HH:mm" to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return (hours || 0) * 60 + (minutes || 0);
}

export type Period = {
  /** First day, included. */
  start: string;
  /** Last day, included. */
  end: string;
};

export type PresetId = 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | '12m';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'yesterday', label: 'Hier' },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'lastMonth', label: 'Mois dernier' },
  { id: '12m', label: '12 mois' }
];

export function presetPeriod(id: PresetId): Period {
  const end = latestAvailableDay();
  const endDate = parseIsoDay(end);

  switch (id) {
    case 'yesterday':
      return { start: end, end };
    case '7d':
      return { start: addDays(end, -6), end };
    case '30d':
      return { start: addDays(end, -29), end };
    case 'month':
      return {
        start: toIsoDay(new Date(endDate.getFullYear(), endDate.getMonth(), 1)),
        end
      };
    case 'lastMonth': {
      const today = new Date();

      return {
        start: toIsoDay(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: toIsoDay(new Date(today.getFullYear(), today.getMonth(), 0))
      };
    }
    case '12m':
      return { start: addDays(end, -364), end };
  }
}

function isWholeMonth(period: Period): boolean {
  const start = parseIsoDay(period.start);
  const end = parseIsoDay(period.end);
  const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  return start.getDate() === 1 && end.getTime() === lastOfMonth.getTime();
}

/** Moves a period one "page" back (-1) or forward (+1); whole months stay whole months. */
export function shiftPeriod(period: Period, direction: -1 | 1): Period {
  if (isWholeMonth(period)) {
    const start = parseIsoDay(period.start);

    return {
      start: toIsoDay(new Date(start.getFullYear(), start.getMonth() + direction, 1)),
      end: toIsoDay(new Date(start.getFullYear(), start.getMonth() + direction + 1, 0))
    };
  }

  const length = countDays(period.start, period.end);

  return {
    start: addDays(period.start, direction * length),
    end: addDays(period.end, direction * length)
  };
}

/** Returns a message when the period can't be loaded, null when it is fine. */
export function validatePeriod(period: Period): string | null {
  if (!isIsoDay(period.start) || !isIsoDay(period.end)) {
    return 'Choisissez une date de début et une date de fin.';
  }

  if (period.start > period.end) {
    return 'La date de début doit précéder la date de fin.';
  }

  if (period.end > latestAvailableDay()) {
    return 'Les données les plus récentes sont celles d’hier.';
  }

  if (period.start < earliestAvailableDay()) {
    return 'Enedis ne conserve qu’environ deux ans d’historique.';
  }

  if (countDays(period.start, period.end) > MAX_PERIOD_DAYS) {
    return 'La période ne peut pas dépasser un an.';
  }

  return null;
}
