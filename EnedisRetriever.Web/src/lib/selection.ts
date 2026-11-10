import {
  addDays,
  countDays,
  earliestAvailableDay,
  latestAvailableDay,
  MAX_PERIOD_DAYS,
  type Period
} from './dates';

/**
 * A selection is a sorted list of distinct days (YYYY-MM-DD). It is usually a
 * continuous range, but the calendar can add or remove single days.
 */
export type DaySelection = string[];

export function daysOf(period: Period): DaySelection {
  const days: string[] = [];

  for (let day = period.start; day <= period.end; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

export function normalize(days: Iterable<string>): DaySelection {
  return Array.from(new Set(days)).sort();
}

/** Smallest range containing every selected day. */
export function rangeOf(days: DaySelection): Period {
  return { start: days[0], end: days[days.length - 1] };
}

export function isContiguous(days: DaySelection): boolean {
  return days.length === 0 || countDays(days[0], days[days.length - 1]) === days.length;
}

export function sameSelection(a: DaySelection, b: DaySelection): boolean {
  return a.length === b.length && a.every((day, index) => day === b[index]);
}

export function isSelectable(day: string): boolean {
  return day >= earliestAvailableDay() && day <= latestAvailableDay();
}

/** Returns a message when the selection can't be loaded, null when it is fine. */
export function validateSelection(days: DaySelection): string | null {
  if (days.length === 0) {
    return 'Gardez au moins un jour sélectionné.';
  }

  if (!days.every(isSelectable)) {
    return 'Seuls les jours entre il y a deux ans et hier sont disponibles.';
  }

  // The whole span is loaded at once, so it is what the limit applies to.
  if (countDays(days[0], days[days.length - 1]) > MAX_PERIOD_DAYS) {
    return 'La sélection ne peut pas s’étendre sur plus d’un an.';
  }

  return null;
}
