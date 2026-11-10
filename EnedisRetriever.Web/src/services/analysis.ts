import {
  durationToMinutes,
  parseLocalTimestamp,
  timeToMinutes,
  toIsoDay
} from '../lib/dates';
import {
  formatLongDay,
  formatMonth,
  formatShortDay,
  formatTime,
  formatWeekdayDay
} from '../lib/format';
import type { ConsumptionPoint, Granularity } from '../types/consumption';
import {
  ttcRates,
  type ElectricityContract,
  type TariffOption,
  type TimeRange
} from '../types/electricityContract';

const MINUTES_PER_DAY = 1440;
const SLOTS_PER_DAY = 48;

/** One measured interval, placed on the clock by its START (the API gives its end). */
export type Slot = {
  start: Date;
  end: Date;
  /** Minutes since midnight of the interval start. */
  minuteOfDay: number;
  kwh: number;
  watts: number;
  /** Interval length in days, used to prorate the subscription. */
  dayFraction: number;
  offPeak: boolean;
};

export function isOffPeakMinute(minute: number, ranges: TimeRange[]): boolean {
  return ranges.some((range) => {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);

    if (start === end) {
      return false;
    }

    return start < end
      ? minute >= start && minute < end
      : minute >= start || minute < end;
  });
}

/** Total off-peak time per day, overlapping ranges counted once. */
export function offPeakMinutesPerDay(ranges: TimeRange[]): number {
  let total = 0;

  for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
    if (isOffPeakMinute(minute, ranges)) {
      total++;
    }
  }

  return total;
}

export function buildSlots(points: ConsumptionPoint[], ranges: TimeRange[]): Slot[] {
  return points.map((point) => {
    const end = parseLocalTimestamp(point.timestamp);
    const minutes = durationToMinutes(point.intervalDuration);
    const start = new Date(end.getTime() - minutes * 60_000);
    const minuteOfDay = start.getHours() * 60 + start.getMinutes();

    return {
      start,
      end,
      minuteOfDay,
      kwh: point.energyKwh,
      watts: point.powerWatts,
      dayFraction: minutes / MINUTES_PER_DAY,
      offPeak: isOffPeakMinute(minuteOfDay, ranges)
    };
  });
}

function dailySubscription(contract: ElectricityContract, option: TariffOption): number {
  return (ttcRates(contract, option).monthlySubscription * 12) / 365;
}

function energyCost(
  contract: ElectricityContract,
  option: TariffOption,
  peakKwh: number,
  offPeakKwh: number
): number {
  const rates = ttcRates(contract, option);

  return peakKwh * rates.peak + offPeakKwh * rates.offPeak;
}

export type Summary = {
  totalKwh: number;
  peakKwh: number;
  offPeakKwh: number;
  /** Days of the period that have at least one measure. */
  daysWithData: number;
  periodDays: number;
  averageKwhPerDay: number;

  energyCost: number;
  subscriptionCost: number;
  totalCost: number;
  /** Cost of the same consumption with the other tariff option. */
  alternative: { option: TariffOption; totalCost: number; difference: number } | null;

  maxPower: { watts: number; start: Date; end: Date } | null;

  measuredSlots: number;
  expectedSlots: number;
};

export function summarize(
  slots: Slot[],
  contract: ElectricityContract,
  /** Number of selected days: the subscription is due for each of them. */
  dayCount: number
): Summary {
  let peakKwh = 0;
  let offPeakKwh = 0;
  let maxSlot: Slot | null = null;
  const days = new Set<string>();

  for (const slot of slots) {
    if (slot.offPeak) {
      offPeakKwh += slot.kwh;
    } else {
      peakKwh += slot.kwh;
    }

    if (!maxSlot || slot.watts > maxSlot.watts) {
      maxSlot = slot;
    }

    days.add(toIsoDay(slot.start));
  }

  const periodDays = dayCount;
  const totalKwh = peakKwh + offPeakKwh;

  const costFor = (option: TariffOption) => ({
    energy: energyCost(contract, option, peakKwh, offPeakKwh),
    subscription: dailySubscription(contract, option) * periodDays
  });

  const current = costFor(contract.option);
  const totalCost = current.energy + current.subscription;

  let alternative: Summary['alternative'] = null;

  if (contract.compareOptions) {
    const option: TariffOption = contract.option === 'base' ? 'hphc' : 'base';
    const other = costFor(option);
    const otherTotal = other.energy + other.subscription;

    alternative = { option, totalCost: otherTotal, difference: otherTotal - totalCost };
  }

  return {
    totalKwh,
    peakKwh,
    offPeakKwh,
    daysWithData: days.size,
    periodDays,
    averageKwhPerDay: days.size > 0 ? totalKwh / days.size : 0,
    energyCost: current.energy,
    subscriptionCost: current.subscription,
    totalCost,
    alternative,
    maxPower: maxSlot
      ? { watts: maxSlot.watts, start: maxSlot.start, end: maxSlot.end }
      : null,
    measuredSlots: slots.length,
    expectedSlots: periodDays * SLOTS_PER_DAY
  };
}

export type Bucket = {
  key: number;
  /** Short label for the axis. */
  label: string;
  /** Full label for the tooltip and the table. */
  fullLabel: string;
  peakKwh: number;
  offPeakKwh: number;
  peakCost: number;
  offPeakCost: number;
  subscriptionCost: number;
};

function bucketStart(date: Date, granularity: Granularity): Date {
  const start = new Date(date);

  switch (granularity) {
    case 'HalfHour':
      start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
      break;
    case 'Hour':
      start.setMinutes(0, 0, 0);
      break;
    case 'Day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'Week':
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() || 7) - 1));
      break;
    case 'Month':
      start.setHours(0, 0, 0, 0);
      start.setDate(1);
      break;
  }

  return start;
}

function bucketLabels(
  start: Date,
  granularity: Granularity,
  multiDay: boolean
): { label: string; fullLabel: string } {
  switch (granularity) {
    case 'HalfHour':
    case 'Hour': {
      const minutes = granularity === 'HalfHour' ? 30 : 60;
      const end = new Date(start.getTime() + minutes * 60_000);
      const time = formatTime(start);
      const dayAndMonth = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      return {
        label: multiDay ? `${dayAndMonth} ${time}` : time,
        fullLabel: `${formatWeekdayDay(start)} · ${time} – ${formatTime(end)}`
      };
    }
    case 'Day':
      return { label: formatShortDay(start), fullLabel: formatLongDay(start) };
    case 'Week': {
      const end = new Date(start);

      end.setDate(end.getDate() + 6);

      return {
        label: formatShortDay(start),
        fullLabel: `Semaine du ${formatShortDay(start)} au ${formatShortDay(end)}`
      };
    }
    case 'Month':
      return { label: formatMonth(start), fullLabel: formatMonth(start, true) };
  }
}

export function buildBuckets(
  slots: Slot[],
  contract: ElectricityContract,
  granularity: Granularity,
  multiDay: boolean
): Bucket[] {
  const subscriptionPerDay = dailySubscription(contract, contract.option);
  const buckets = new Map<number, Bucket>();

  for (const slot of slots) {
    const start = bucketStart(slot.start, granularity);
    const key = start.getTime();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = {
        key,
        ...bucketLabels(start, granularity, multiDay),
        peakKwh: 0,
        offPeakKwh: 0,
        peakCost: 0,
        offPeakCost: 0,
        subscriptionCost: 0
      };
      buckets.set(key, bucket);
    }

    if (slot.offPeak) {
      bucket.offPeakKwh += slot.kwh;
      bucket.offPeakCost += energyCost(contract, contract.option, 0, slot.kwh);
    } else {
      bucket.peakKwh += slot.kwh;
      bucket.peakCost += energyCost(contract, contract.option, slot.kwh, 0);
    }

    bucket.subscriptionCost += subscriptionPerDay * slot.dayFraction;
  }

  return Array.from(buckets.values()).sort((a, b) => a.key - b.key);
}

export type ProfilePoint = {
  minuteOfDay: number;
  /** Average power over the period for this half-hour of the day. */
  watts: number;
  offPeak: boolean;
};

/** Average day: mean power for each half-hour of the day across the period. */
export function buildDailyProfile(slots: Slot[], ranges: TimeRange[]): ProfilePoint[] {
  const sums = new Array<number>(SLOTS_PER_DAY).fill(0);
  const counts = new Array<number>(SLOTS_PER_DAY).fill(0);

  for (const slot of slots) {
    const index = Math.min(SLOTS_PER_DAY - 1, Math.floor(slot.minuteOfDay / 30));

    sums[index] += slot.watts;
    counts[index]++;
  }

  return sums.map((sum, index) => ({
    minuteOfDay: index * 30,
    watts: counts[index] > 0 ? sum / counts[index] : 0,
    offPeak: isOffPeakMinute(index * 30, ranges)
  }));
}

export const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'HalfHour', label: '30 min' },
  { id: 'Hour', label: 'Heure' },
  { id: 'Day', label: 'Jour' },
  { id: 'Week', label: 'Semaine' },
  { id: 'Month', label: 'Mois' }
];

const MAX_BARS = 200;

function barCount(days: number, granularity: Granularity): number {
  switch (granularity) {
    case 'HalfHour':
      return days * 48;
    case 'Hour':
      return days * 24;
    case 'Day':
      return days;
    case 'Week':
      return Math.ceil(days / 7);
    case 'Month':
      return Math.ceil(days / 30);
  }
}

/** Granularities that keep the chart readable for a period of that many days. */
export function allowedGranularities(days: number): Granularity[] {
  return GRANULARITIES.map((entry) => entry.id).filter((id) => {
    const count = barCount(days, id);

    if (count > MAX_BARS) return false;
    if (id === 'Week') return days >= 14;
    if (id === 'Month') return days >= 59;

    return true;
  });
}

export function defaultGranularity(days: number): Granularity {
  if (days <= 1) return 'HalfHour';
  if (days <= 3) return 'Hour';
  if (days <= 92) return 'Day';
  if (days <= 200) return 'Week';

  return 'Month';
}

/**
 * Power the home draws "at rest": the level that 90 % of the half-hours exceed.
 * A percentile rather than the minimum, so one odd reading doesn't decide it.
 */
export function baseloadWatts(slots: Slot[]): number {
  if (slots.length === 0) {
    return 0;
  }

  const sorted = slots.map((slot) => slot.watts).sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length * 0.1)];
}
