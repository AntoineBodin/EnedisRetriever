import { parseIsoDay } from './dates';

const LOCALE = 'fr-FR';

function number(value: number, minDigits: number, maxDigits = minDigits): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });
}

/** Energy with a precision that follows the magnitude: 0,133 · 12,4 · 1 284. */
export function formatKwh(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1000) return number(value, 0);
  if (abs >= 100) return number(value, 0, 1);
  if (abs >= 10) return number(value, 1);

  return number(value, 2);
}

export function formatEuro(value: number): string {
  return `${number(value, 2)} €`;
}

export function formatSignedEuro(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';

  return `${sign}${number(Math.abs(value), 2)} €`;
}

export function formatPercent(part: number, total: number): string {
  return total > 0 ? `${number((part / total) * 100, 0)} %` : '0 %';
}

export function formatKw(watts: number): string {
  return number(watts / 1000, 2);
}

export function formatWatts(watts: number): string {
  return `${number(watts, 0)} W`;
}

export function formatCount(value: number): string {
  return number(value, 0);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** "3 nov." or "3 nov. 2025" when the year differs from the current one. */
export function formatShortDay(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  });
}

export function formatLongDay(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function formatWeekdayDay(date: Date): string {
  return date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatMonth(date: Date, long = false): string {
  return date.toLocaleDateString(LOCALE, {
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : '2-digit'
  });
}

export function formatPeriod(start: string, end: string): string {
  const startDate = parseIsoDay(start);
  const endDate = parseIsoDay(end);

  if (start === end) {
    return formatLongDay(startDate);
  }

  const withYear: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  const from = startDate.toLocaleDateString(
    LOCALE,
    sameYear ? { day: 'numeric', month: 'short' } : withYear
  );

  return `${from} – ${endDate.toLocaleDateString(LOCALE, withYear)}`;
}

/** Minutes since midnight to "14 h" or "14 h 30". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

/** "26/09/2026", the way invoices print dates. */
export function formatNumericDay(day: string): string {
  return parseIsoDay(day).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
