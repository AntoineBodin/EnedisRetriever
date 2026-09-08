import type {
  ConsumptionAggregate,
  ConsumptionPoint
} from '../types/consumption';

import type {
  ElectricityContract,
  TimeRange
} from '../types/electricityContract';

export type ElectricityCost = {
  peakKwh: number;
  offPeakKwh: number;

  energyCost: number;
  subscriptionCost: number;
  totalCost: number;

  totalKwh: number;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

function isTimeInRange(
  time: string,
  range: TimeRange
): boolean {
  const currentMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(range.start);
  const endMinutes = timeToMinutes(range.end);

  if (startMinutes > endMinutes) {
    return (
      currentMinutes >= startMinutes ||
      currentMinutes < endMinutes
    );
  }

  return (
    currentMinutes >= startMinutes &&
    currentMinutes < endMinutes
  );
}

function isOffPeak(
  point: ConsumptionPoint,
  ranges: TimeRange[]
): boolean {
  const startTime = new Date(point.timestamp).toLocaleTimeString(
    'fr-FR',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  );

  return ranges.some((range) =>
    isTimeInRange(startTime, range)
  );
}

function getEnergyRate(
  point: ConsumptionPoint,
  contract: ElectricityContract
): number {
  if (contract.pricingMode === 'SingleRate') {
    return contract.pricePerKwh ?? 0;
  }

  return contract.offPeakRanges &&
    isOffPeak(point, contract.offPeakRanges)
    ? contract.offPeakPricePerKwh ?? 0
    : contract.peakPricePerKwh ?? 0;
}

export type CostPoint = {
  start: string;
  peakCost: number;
  offPeakCost: number;
  subscriptionCost: number;
};

export type EnergyPoint = {
  start: string;
  peakKwh: number;
  offPeakKwh: number;
};

// splits each point's energy into peak/off-peak so the chart can render a stacked HC/HP view
export function calculateEnergyPoints(
  consumption: ConsumptionAggregate,
  contract: ElectricityContract
): EnergyPoint[] {
  return consumption.map((point) => {
    const isPointOffPeak =
      contract.pricingMode === 'PeakOffPeak' &&
      contract.offPeakRanges !== undefined &&
      isOffPeak(point, contract.offPeakRanges);

    return {
      start: point.timestamp,
      peakKwh: isPointOffPeak ? 0 : point.energyKwh,
      offPeakKwh: isPointOffPeak ? point.energyKwh : 0
    };
  });
}

const HALF_HOURS_PER_DAY = 48;

// consumption points are always HalfHour granularity, so the subscription cost splits evenly across the day's slots
export function calculateCostPoints(
  consumption: ConsumptionAggregate,
  contract: ElectricityContract
): CostPoint[] {
  const subscriptionCostPerPoint =
    (contract.monthlySubscription * 12) /
    365 /
    HALF_HOURS_PER_DAY;

  return consumption.map((point) => {
    const isPointOffPeak =
      contract.pricingMode === 'PeakOffPeak' &&
      contract.offPeakRanges !== undefined &&
      isOffPeak(point, contract.offPeakRanges);

    const cost = point.energyKwh * getEnergyRate(point, contract);

    return {
      start: point.timestamp,
      peakCost: isPointOffPeak ? 0 : cost,
      offPeakCost: isPointOffPeak ? cost : 0,
      subscriptionCost: subscriptionCostPerPoint
    };
  });
}

function calculateSubscriptionCost(
  start: string,
  end: string,
  monthlySubscription: number
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const durationMs =
    endDate.getTime() - startDate.getTime();

  // end date is inclusive, so the selected end day counts as a full day
  const durationDays =
    durationMs / (1000 * 60 * 60 * 24) + 1;

  return monthlySubscription * 12 * durationDays / 365;
}

export function calculateElectricityCost(
  consumption: ConsumptionAggregate,
  contract: ElectricityContract,
  start: string,
  end: string
): ElectricityCost {
  let peakKwh = 0;
  let offPeakKwh = 0;

  for (const point of consumption) {
    if (
      contract.pricingMode === 'PeakOffPeak' &&
      contract.offPeakRanges &&
      isOffPeak(point, contract.offPeakRanges)
    ) {
      offPeakKwh += point.energyKwh;
    } else {
      peakKwh += point.energyKwh;
    }
  }

  const totalKwh = peakKwh + offPeakKwh;

  const energyCost =
    contract.pricingMode === 'SingleRate'
      ? totalKwh * (contract.pricePerKwh ?? 0)
      : peakKwh * (contract.peakPricePerKwh ?? 0) +
        offPeakKwh * (contract.offPeakPricePerKwh ?? 0);

  const subscriptionCost =
    calculateSubscriptionCost(
      start,
      end,
      contract.monthlySubscription
    );

  return {
    peakKwh,
    offPeakKwh,
    energyCost,
    subscriptionCost,
    totalCost: energyCost + subscriptionCost,
    totalKwh
  };
}