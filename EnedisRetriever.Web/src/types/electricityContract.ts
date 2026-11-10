/** Daily time range as "HH:mm" strings; `end` is exclusive and may wrap past midnight. */
export type TimeRange = {
  start: string;
  end: string;
};

export type TariffOption = 'base' | 'hphc';

/**
 * Prices are entered excluding taxes (HT), exactly as printed on the invoice;
 * taxes are entered separately so a regulatory change is a single field to update.
 */
export type ElectricityContract = {
  name: string;
  subscribedPowerKva: number;
  /** The option actually billed. */
  option: TariffOption;

  base: {
    monthlySubscriptionHt: number;
    pricePerKwhHt: number;
  };

  hphc: {
    monthlySubscriptionHt: number;
    peakPricePerKwhHt: number;
    offPeakPricePerKwhHt: number;
  };

  taxes: {
    /** Accise sur l'électricité, €/kWh. */
    excisePerKwh: number;
    /** Contribution tarifaire d'acheminement, € HT per month. */
    ctaMonthly: number;
    /** VAT in percent, applied to every line. */
    vatRate: number;
  };

  offPeakRanges: TimeRange[];

  /** Also estimate the cost with the other option. */
  compareOptions: boolean;
};

export const SUBSCRIBED_POWERS_KVA = [3, 6, 9, 12, 15, 18, 24, 30, 36];

// Primeo Fixe Confort+ 6 kVA, prices HT from the invoice of October 2026
// (in force since the 1 August 2026 TURPE and excise update).
// The base option values are indicative only.
export const DEFAULT_CONTRACT: ElectricityContract = {
  name: '',
  subscribedPowerKva: 6,
  option: 'hphc',
  base: {
    monthlySubscriptionHt: 11.61,
    pricePerKwhHt: 0.132
  },
  hphc: {
    monthlySubscriptionHt: 12.65,
    peakPricePerKwhHt: 0.1145,
    offPeakPricePerKwhHt: 0.0814
  },
  taxes: {
    excisePerKwh: 0.03062,
    ctaMonthly: 1.43,
    vatRate: 20
  },
  offPeakRanges: [
    { start: '02:00', end: '07:00' },
    { start: '14:00', end: '17:00' }
  ],
  compareOptions: false
};

/** All-taxes-included rates, used for every continuous estimate in the app. */
export type TtcRates = {
  monthlySubscription: number;
  peak: number;
  offPeak: number;
};

export function ttcRates(contract: ElectricityContract, option: TariffOption): TtcRates {
  const vat = 1 + contract.taxes.vatRate / 100;
  const excise = contract.taxes.excisePerKwh;
  const monthlySubscription = (contract[option].monthlySubscriptionHt + contract.taxes.ctaMonthly) * vat;

  if (option === 'base') {
    const price = (contract.base.pricePerKwhHt + excise) * vat;

    return { monthlySubscription, peak: price, offPeak: price };
  }

  return {
    monthlySubscription,
    peak: (contract.hphc.peakPricePerKwhHt + excise) * vat,
    offPeak: (contract.hphc.offPeakPricePerKwhHt + excise) * vat
  };
}
