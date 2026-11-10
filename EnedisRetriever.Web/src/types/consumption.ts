/** Raw half-hour point as returned by GET /api/consumption. */
export type ConsumptionPoint = {
  id: number;
  /** End of the measured interval, local wall-clock time without offset. */
  timestamp: string;
  powerWatts: number;
  /** Interval length as "HH:mm:ss". */
  intervalDuration: string;
  energyKwh: number;
};

/** Response of GET /api/consumption/availability. */
export type Availability = {
  firstDay: string | null;
  lastDay: string | null;
  totalPoints: number;
  expectedPointsPerFullDay: number;
  days: { date: string; points: number }[];
};

export type Granularity = 'HalfHour' | 'Hour' | 'Day' | 'Week' | 'Month';
