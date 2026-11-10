import type { ElectricityContract, TariffOption } from '../types/electricityContract';

/** Below this, rounding kWh to the unit says nothing about a real invoice. */
export const MIN_BILL_DAYS = 28;

export type BillLine = {
  label: string;
  /** Quantity and unit price, as printed on an invoice. */
  detail: string;
  /** Amount excluding VAT, rounded to the cent. */
  amountHt: number;
};

export type SimulatedBill = {
  lines: BillLine[];
  totalHt: number;
  vat: number;
  totalTtc: number;
};

/** Rounds half up to `digits` decimals, without the binary floating point drift. */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;

  return Math.round(value * factor + 1e-9 * Math.sign(value)) / factor;
}

const LOCALE = 'fr-FR';

function price(value: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 5 });
}

/**
 * Rebuilds an invoice the way a supplier computes it:
 * - kWh come from meter indexes, so each register is a whole number of kWh;
 * - the subscription uses a daily price rounded to 4 decimals (monthly x 12 / 365);
 * - every line is computed excluding VAT and rounded to the cent;
 * - VAT is applied once, on the rounded total.
 */
export function simulateBill(
  contract: ElectricityContract,
  option: TariffOption,
  peakKwh: number,
  offPeakKwh: number,
  days: number
): SimulatedBill {
  const { taxes } = contract;
  const lines: BillLine[] = [];

  const dailySubscription = round((contract[option].monthlySubscriptionHt * 12) / 365, 4);

  lines.push({
    label: 'Abonnement',
    detail: `${days} j × ${price(dailySubscription)} €`,
    amountHt: round(dailySubscription * days, 2)
  });

  let totalKwh: number;

  if (option === 'base') {
    totalKwh = Math.round(peakKwh + offPeakKwh);

    lines.push({
      label: 'Consommation',
      detail: `${totalKwh} kWh × ${price(contract.base.pricePerKwhHt)} €`,
      amountHt: round(totalKwh * contract.base.pricePerKwhHt, 2)
    });
  } else {
    const peak = Math.round(peakKwh);
    const offPeak = Math.round(offPeakKwh);

    totalKwh = peak + offPeak;

    lines.push(
      {
        label: 'Heures pleines',
        detail: `${peak} kWh × ${price(contract.hphc.peakPricePerKwhHt)} €`,
        amountHt: round(peak * contract.hphc.peakPricePerKwhHt, 2)
      },
      {
        label: 'Heures creuses',
        detail: `${offPeak} kWh × ${price(contract.hphc.offPeakPricePerKwhHt)} €`,
        amountHt: round(offPeak * contract.hphc.offPeakPricePerKwhHt, 2)
      }
    );
  }

  lines.push(
    {
      label: 'Accise',
      detail: `${totalKwh} kWh × ${price(taxes.excisePerKwh)} €`,
      amountHt: round(totalKwh * taxes.excisePerKwh, 2)
    },
    {
      label: 'CTA',
      detail: `${days} j`,
      amountHt: round(((taxes.ctaMonthly * 12) / 365) * days, 2)
    }
  );

  const totalHt = round(
    lines.reduce((sum, line) => sum + line.amountHt, 0),
    2
  );
  const vat = round((totalHt * taxes.vatRate) / 100, 2);

  return { lines, totalHt, vat, totalTtc: round(totalHt + vat, 2) };
}
