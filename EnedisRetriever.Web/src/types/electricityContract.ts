export type TimeRange = {
  start: string;
  end: string;
};

export type ElectricityContract = {
  name: string;

  pricingMode: 'SingleRate' | 'PeakOffPeak';

  pricePerKwh?: number;

  peakPricePerKwh?: number;
  offPeakPricePerKwh?: number;
  offPeakRanges?: TimeRange[];

  monthlySubscription: number;
};