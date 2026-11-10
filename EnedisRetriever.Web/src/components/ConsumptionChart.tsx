import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { formatEuro, formatKwh, formatPercent } from '../lib/format';
import { GRANULARITIES, type Bucket } from '../services/analysis';
import type { Granularity } from '../types/consumption';

type View = 'energy' | 'cost';

type SeriesKey = 'subscription' | 'offPeak' | 'peak';

type Series = {
  key: SeriesKey;
  label: string;
  color: string;
};

type Row = {
  label: string;
  fullLabel: string;
  subscription: number;
  offPeak: number;
  peak: number;
  total: number;
  /** Series drawn on top of the stack for this row: it gets the rounded end. */
  top: SeriesKey | null;
};

type Props = {
  buckets: Bucket[];
  /** Split consumption into peak / off-peak (false for a single-rate contract). */
  showSplit: boolean;
  granularity: Granularity;
  allowedGranularities: Granularity[];
  onGranularity: (granularity: Granularity) => void;
};

const COLORS: Record<SeriesKey, string> = {
  subscription: 'var(--series-subscription)',
  offPeak: 'var(--series-off-peak)',
  peak: 'var(--series-peak)'
};

/** Stack order, bottom to top. The fixed subscription sits at the base. */
const STACK_ORDER: SeriesKey[] = ['subscription', 'offPeak', 'peak'];

function buildSeries(view: View, showSplit: boolean, withSubscription: boolean): Series[] {
  const series: Series[] = [];

  if (view === 'cost' && withSubscription) {
    series.push({ key: 'subscription', label: 'Abonnement', color: COLORS.subscription });
  }

  if (showSplit) {
    series.push({ key: 'offPeak', label: 'Heures creuses', color: COLORS.offPeak });
    series.push({ key: 'peak', label: 'Heures pleines', color: COLORS.peak });
  } else {
    series.push({
      key: 'peak',
      label: view === 'cost' ? 'Énergie' : 'Consommation',
      color: COLORS.peak
    });
  }

  return series;
}

function buildRows(
  buckets: Bucket[],
  view: View,
  showSplit: boolean,
  withSubscription: boolean
): Row[] {
  return buckets.map((bucket) => {
    const peak = view === 'energy' ? bucket.peakKwh : bucket.peakCost;
    const offPeak = view === 'energy' ? bucket.offPeakKwh : bucket.offPeakCost;

    const values: Record<SeriesKey, number> = {
      subscription: view === 'cost' && withSubscription ? bucket.subscriptionCost : 0,
      // Without the split, everything is drawn as one series.
      offPeak: showSplit ? offPeak : 0,
      peak: showSplit ? peak : peak + offPeak
    };

    const top = [...STACK_ORDER].reverse().find((key) => values[key] > 0) ?? null;

    return {
      label: bucket.label,
      fullLabel: bucket.fullLabel,
      ...values,
      total: values.subscription + values.offPeak + values.peak,
      top
    };
  });
}

function ConsumptionChart({
  buckets,
  showSplit,
  granularity,
  allowedGranularities,
  onGranularity
}: Props) {
  const [view, setView] = useState<View>('energy');
  const [withSubscription, setWithSubscription] = useState(true);

  const series = useMemo(
    () => buildSeries(view, showSplit, withSubscription),
    [view, showSplit, withSubscription]
  );

  const rows = useMemo(
    () => buildRows(buckets, view, showSplit, withSubscription),
    [buckets, view, showSplit, withSubscription]
  );

  const format = view === 'energy' ? (value: number) => `${formatKwh(value)} kWh` : formatEuro;
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  // The surface-coloured gap between segments only fits when bars are wide enough.
  const gap = rows.length <= 70 ? 1.5 : 0;

  return (
    <section className="card chart-card">
      <header className="chart-header">
        <div>
          <h2>{view === 'energy' ? 'Consommation' : 'Coût estimé'}</h2>
          <p className="chart-subtitle">
            {format(total)} sur la période · en {view === 'energy' ? 'kWh' : 'euros'} par{' '}
            {GRANULARITIES.find((entry) => entry.id === granularity)?.label.toLowerCase()}
          </p>
        </div>

        <div className="chart-controls">
          <div className="segmented" role="group" aria-label="Grandeur affichée">
            <button
              type="button"
              aria-pressed={view === 'energy'}
              onClick={() => setView('energy')}
            >
              kWh
            </button>
            <button type="button" aria-pressed={view === 'cost'} onClick={() => setView('cost')}>
              €
            </button>
          </div>

          <div className="segmented" role="group" aria-label="Pas de temps">
            {GRANULARITIES.filter((entry) => allowedGranularities.includes(entry.id)).map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={granularity === entry.id}
                  onClick={() => onGranularity(entry.id)}
                >
                  {entry.label}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <div className="chart-meta">
        {series.length > 1 ? (
          <ul className="legend">
            {[...series].reverse().map((entry) => (
              <li key={entry.key}>
                <span className="swatch" style={{ background: entry.color }} />
                {entry.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}

        {view === 'cost' && (
          <label className="check">
            <input
              type="checkbox"
              checked={withSubscription}
              onChange={(event) => setWithSubscription(event.target.checked)}
            />
            Inclure l’abonnement
          </label>
        )}
      </div>

      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          {/* Recharts stacks bars in mount order: remount when the series change
              so the stack always follows STACK_ORDER. */}
          <BarChart key={series.map((entry) => entry.key).join('|')} data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--hairline)" />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis)' }}
              tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
              minTickGap={28}
              interval="preserveStartEnd"
              tickMargin={8}
            />

            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
              tickFormatter={(value: number) => value.toLocaleString('fr-FR')}
            />

            <Tooltip
              cursor={{ fill: 'var(--hover-wash)' }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const row = payload[0].payload as Row;

                return (
                  <div className="tooltip">
                    <p className="tooltip-title">{row.fullLabel}</p>
                    {[...series].reverse().map((entry) => (
                      <p key={entry.key} className="tooltip-row">
                        <span className="tooltip-key" style={{ background: entry.color }} />
                        <span>{entry.label}</span>
                        <strong>{format(row[entry.key])}</strong>
                        {series.length > 1 && view === 'energy' && (
                          <em>{formatPercent(row[entry.key], row.total)}</em>
                        )}
                      </p>
                    ))}
                    {series.length > 1 && (
                      <p className="tooltip-row tooltip-total">
                        <span />
                        <span>Total</span>
                        <strong>{format(row.total)}</strong>
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {series.map((entry) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label}
                stackId="stack"
                fill={entry.color}
                stroke="var(--surface)"
                strokeWidth={gap}
                maxBarSize={24}
                isAnimationActive={false}
                shape={(props: unknown) => {
                  const bar = props as { payload: Row } & Record<string, unknown>;

                  return (
                    <Rectangle
                      {...bar}
                      radius={bar.payload.top === entry.key ? [4, 4, 0, 0] : 0}
                    />
                  );
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="table-view">
        <summary>Voir les valeurs en tableau</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Période</th>
                {[...series].reverse().map((entry) => (
                  <th key={entry.key} scope="col">
                    {entry.label}
                  </th>
                ))}
                {series.length > 1 && <th scope="col">Total</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.fullLabel}>
                  <th scope="row">{row.fullLabel}</th>
                  {[...series].reverse().map((entry) => (
                    <td key={entry.key}>{format(row[entry.key])}</td>
                  ))}
                  {series.length > 1 && <td>{format(row.total)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export default ConsumptionChart;
