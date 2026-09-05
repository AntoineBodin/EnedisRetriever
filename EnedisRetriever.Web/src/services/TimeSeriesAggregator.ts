import type { ConsumptionGranularity } from '../types/consumption';

export type TimeSeriesPoint = {
  start: string;
  value: number;
};

function getBucketStart(
  date: Date,
  granularity: ConsumptionGranularity
): Date {
  const bucketStart = new Date(date);

  switch (granularity) {
    case 'HalfHour': {
      const minutes = bucketStart.getMinutes() < 30 ? 0 : 30;
      bucketStart.setMinutes(minutes, 0, 0);
      return bucketStart;
    }

    case 'Hour':
      bucketStart.setMinutes(0, 0, 0);
      return bucketStart;

    case 'Day':
      bucketStart.setHours(0, 0, 0, 0);
      return bucketStart;

    case 'Week': {
      bucketStart.setHours(0, 0, 0, 0);

      const isoWeekday = bucketStart.getDay() || 7;
      bucketStart.setDate(bucketStart.getDate() - isoWeekday + 1);
      return bucketStart;
    }

    case 'Month':
      bucketStart.setHours(0, 0, 0, 0);
      bucketStart.setDate(1);
      return bucketStart;

    case 'Year':
      bucketStart.setHours(0, 0, 0, 0);
      bucketStart.setMonth(0, 1);
      return bucketStart;
  }
}

// the API is only ever queried at HalfHour granularity, buckets for other granularities are built client-side
export function aggregateTimeSeries(
  points: TimeSeriesPoint[],
  granularity: ConsumptionGranularity
): TimeSeriesPoint[] {
  if (granularity === 'HalfHour') {
    return points;
  }

  const buckets = new Map<number, { start: Date; value: number }>();

  for (const point of points) {
    const bucketStart = getBucketStart(
      new Date(point.start),
      granularity
    );

    const key = bucketStart.getTime();
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.value += point.value;
    } else {
      buckets.set(key, {
        start: bucketStart,
        value: point.value
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({
      start: bucket.start.toISOString(),
      value: bucket.value
    }));
}

export type CostSeriesPoint = {
  start: string;
  peakCost: number;
  offPeakCost: number;
  subscriptionCost: number;
};

// same bucketing as aggregateTimeSeries, but sums the 3 cost breakdown fields together
export function aggregateCostSeries(
  points: CostSeriesPoint[],
  granularity: ConsumptionGranularity
): CostSeriesPoint[] {
  if (granularity === 'HalfHour') {
    return points;
  }

  const buckets = new Map<
    number,
    {
      start: Date;
      peakCost: number;
      offPeakCost: number;
      subscriptionCost: number;
    }
  >();

  for (const point of points) {
    const bucketStart = getBucketStart(
      new Date(point.start),
      granularity
    );

    const key = bucketStart.getTime();
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.peakCost += point.peakCost;
      bucket.offPeakCost += point.offPeakCost;
      bucket.subscriptionCost += point.subscriptionCost;
    } else {
      buckets.set(key, {
        start: bucketStart,
        peakCost: point.peakCost,
        offPeakCost: point.offPeakCost,
        subscriptionCost: point.subscriptionCost
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({
      start: bucket.start.toISOString(),
      peakCost: bucket.peakCost,
      offPeakCost: bucket.offPeakCost,
      subscriptionCost: bucket.subscriptionCost
    }));
}

export type EnergySeriesPoint = {
  start: string;
  peakKwh: number;
  offPeakKwh: number;
};

// same bucketing as aggregateTimeSeries, but sums the peak/off-peak kWh split together
export function aggregateEnergySeries(
  points: EnergySeriesPoint[],
  granularity: ConsumptionGranularity
): EnergySeriesPoint[] {
  if (granularity === 'HalfHour') {
    return points;
  }

  const buckets = new Map<
    number,
    { start: Date; peakKwh: number; offPeakKwh: number }
  >();

  for (const point of points) {
    const bucketStart = getBucketStart(
      new Date(point.start),
      granularity
    );

    const key = bucketStart.getTime();
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.peakKwh += point.peakKwh;
      bucket.offPeakKwh += point.offPeakKwh;
    } else {
      buckets.set(key, {
        start: bucketStart,
        peakKwh: point.peakKwh,
        offPeakKwh: point.offPeakKwh
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({
      start: bucket.start.toISOString(),
      peakKwh: bucket.peakKwh,
      offPeakKwh: bucket.offPeakKwh
    }));
}

