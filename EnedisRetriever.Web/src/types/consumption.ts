export type ConsumptionPoint = {
  id: number;
  timestamp: string;
  powerWatts: number;
  intervalDuration: string;
  energyKwh: number;
};

export type ConsumptionAggregate = ConsumptionPoint[];

export type ConsumptionGranularity =
  | 'HalfHour'
  | 'Hour'
  | 'Day'
  | 'Week'
  | 'Month'
  | 'Year';

export type BillingPeriod = {
  start: string;
  end: string;
  billedAmount?: number;
};