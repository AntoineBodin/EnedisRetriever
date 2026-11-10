import {
  formatEuro,
  formatKw,
  formatKwh,
  formatNumericDay,
  formatPercent,
  formatSignedEuro,
  formatTime,
  formatWatts,
  formatWeekdayDay
} from '../lib/format';
import type { Summary } from '../services/analysis';
import type { SimulatedBill } from '../services/billSimulation';
import type { ElectricityContract } from '../types/electricityContract';

type Props = {
  summary: Summary;
  contract: ElectricityContract;
  /** Whether the peak / off-peak split means something for this contract. */
  showSplit: boolean;
  /** Power the home draws at rest (see App). */
  baseloadWatts: number;
  /** Invoice-style total (whole kWh, lines rounded), only for long enough periods. */
  bill: SimulatedBill | null;
  /**
   * Dates the same days would carry on an invoice, one day later than the
   * measures (null when the selection has gaps).
   */
  billPeriod: { start: string; end: string } | null;
  /** Moves the selection one day back, for dates copied from an invoice. */
  onAlignToInvoice: () => void;
};

const OPTION_LABEL = { base: 'Base', hphc: 'Heures creuses' } as const;

function KpiCards({ summary, contract, showSplit, baseloadWatts, bill, billPeriod, onAlignToInvoice }: Props) {
  const { maxPower, alternative } = summary;
  const subscribedWatts = contract.subscribedPowerKva * 1000;
  const powerShare = maxPower ? Math.min(1, maxPower.watts / subscribedWatts) : 0;

  return (
    <section className="kpis" aria-label="Chiffres clés">
      <article className="card kpi">
        <h2>Consommation</h2>
        <p className="kpi-value">
          {formatKwh(summary.totalKwh)} <span>kWh</span>
        </p>
        <p className="kpi-note">
          {summary.daysWithData > 1
            ? `${formatKwh(summary.averageKwhPerDay)} kWh par jour en moyenne`
            : 'sur la journée'}
        </p>
      </article>

      <article className="card kpi">
        <h2>Coût estimé</h2>
        <p className="kpi-value">{formatEuro(summary.totalCost)}</p>
        <p className="kpi-note">
          Énergie {formatEuro(summary.energyCost)} · Abonnement{' '}
          {formatEuro(summary.subscriptionCost)}
        </p>
        {alternative && (
          <p className="kpi-note kpi-compare">
            Option {OPTION_LABEL[alternative.option]} : {formatEuro(alternative.totalCost)}{' '}
            <span className="pill">{formatSignedEuro(alternative.difference)}</span>
          </p>
        )}
        {bill && (
          <>
            <button
              type="button"
              className="bill-label"
              popoverTarget="bill-detail"
              aria-label={`Facture simulée : ${formatEuro(bill.totalTtc)}. Voir le détail`}
            >
              <span>Facture simulée</span>
              <strong>{formatEuro(bill.totalTtc)}</strong>
            </button>

            <div id="bill-detail" popover="auto" className="bill-popover">
              <h3>Facture simulée</h3>
              <p className="bill-intro">
                Calculée comme votre fournisseur : kWh arrondis à l’unité, chaque ligne
                arrondie au centime hors taxes, TVA sur le total.
              </p>
              <table>
                <tbody>
                  {bill.lines.map((line) => (
                    <tr key={line.label}>
                      <th scope="row">
                        {line.label}
                        <small>{line.detail}</small>
                      </th>
                      <td>{formatEuro(line.amountHt)}</td>
                    </tr>
                  ))}
                  <tr className="bill-subtotal">
                    <th scope="row">Total HT</th>
                    <td>{formatEuro(bill.totalHt)}</td>
                  </tr>
                  <tr>
                    <th scope="row">TVA {contract.taxes.vatRate} %</th>
                    <td>{formatEuro(bill.vat)}</td>
                  </tr>
                  <tr className="bill-total">
                    <th scope="row">Total TTC</th>
                    <td>{formatEuro(bill.totalTtc)}</td>
                  </tr>
                </tbody>
              </table>
              {billPeriod && (
                <p className="bill-intro">
                  Sur une facture, ces jours apparaissent comme la période{" "}
                  <strong>
                    du {formatNumericDay(billPeriod.start)} au {formatNumericDay(billPeriod.end)}
                  </strong>
                  {" "}: le relevé daté d’un jour est pris à minuit, avant la consommation de ce jour.
                </p>
              )}
              {billPeriod && (
                <button
                  type="button"
                  className="button bill-align"
                  popoverTarget="bill-detail"
                  popoverTargetAction="hide"
                  onClick={onAlignToInvoice}
                >
                  J’ai saisi les dates d’une facture : décaler d’un jour
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                popoverTarget="bill-detail"
                popoverTargetAction="hide"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </article>

      {showSplit ? (
        <article className="card kpi">
          <h2>Heures pleines / creuses</h2>
          <div
            className="split-bar"
            role="img"
            aria-label={`Heures pleines ${formatPercent(summary.peakKwh, summary.totalKwh)}, heures creuses ${formatPercent(summary.offPeakKwh, summary.totalKwh)}`}
          >
            {summary.peakKwh > 0 && (
              <span className="split-peak" style={{ flexGrow: summary.peakKwh }} />
            )}
            {summary.offPeakKwh > 0 && (
              <span className="split-off-peak" style={{ flexGrow: summary.offPeakKwh }} />
            )}
          </div>
          <dl className="split-legend">
            <div>
              <dt>
                <span className="swatch swatch-peak" />
                Pleines
              </dt>
              <dd>
                <strong>{formatPercent(summary.peakKwh, summary.totalKwh)}</strong>
                {formatKwh(summary.peakKwh)} kWh
              </dd>
            </div>
            <div>
              <dt>
                <span className="swatch swatch-off-peak" />
                Creuses
              </dt>
              <dd>
                <strong>{formatPercent(summary.offPeakKwh, summary.totalKwh)}</strong>
                {formatKwh(summary.offPeakKwh)} kWh
              </dd>
            </div>
          </dl>
        </article>
      ) : (
        <article className="card kpi">
          <h2>Consommation de fond</h2>
          <p className="kpi-value">
            {formatWatts(baseloadWatts).replace(' W', '')} <span>W</span>
          </p>
          <p className="kpi-note">
            Puissance appelée en continu, soit environ{' '}
            {formatKwh((baseloadWatts * 24) / 1000)} kWh par jour
          </p>
        </article>
      )}

      <article className="card kpi">
        <h2>Pic de puissance</h2>
        {maxPower ? (
          <>
            <p className="kpi-value">
              {formatKw(maxPower.watts)} <span>kW</span>
            </p>
            <div
              className="meter"
              role="img"
              aria-label={`${formatPercent(maxPower.watts, subscribedWatts)} de la puissance souscrite`}
            >
              <span style={{ width: `${powerShare * 100}%` }} />
            </div>
            <p className="kpi-note">
              {formatPercent(maxPower.watts, subscribedWatts)} des{' '}
              {contract.subscribedPowerKva} kVA souscrits · {formatWeekdayDay(maxPower.start)},{' '}
              {formatTime(maxPower.start)} – {formatTime(maxPower.end)}
            </p>
          </>
        ) : (
          <p className="kpi-note">Aucune mesure</p>
        )}
      </article>
    </section>
  );
}

export default KpiCards;
