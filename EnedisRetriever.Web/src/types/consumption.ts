export type ConsumptionPoint = {
  start: string;
  end: string;
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