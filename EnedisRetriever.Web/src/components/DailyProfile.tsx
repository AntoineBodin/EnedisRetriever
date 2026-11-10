import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatMinutes, formatWatts } from '../lib/format';
import type { ProfilePoint } from '../services/analysis';

type Props = {
  profile: ProfilePoint[];
  showSplit: boolean;
  days: number;
};

/** Round axis ticks (0, 500, 1 000…) covering the highest value. */
function niceTicks(max: number): number[] {
  if (max <= 0) {
    return [0, 1];
  }

  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((s) => s >= rough)!;
  const ticks: number[] = [];

  for (let tick = 0; tick < max + step; tick += step) {
    ticks.push(tick);
  }

  return ticks;
}

function DailyProfile({ profile, showSplit, days }: Props) {
  const ticks = niceTicks(Math.max(...profile.map((point) => point.watts)));

  return (
    <section className="card chart-card">
      <header className="chart-header">
        <div>
          <h2>Journée type</h2>
          <p className="chart-subtitle">
            Puissance moyenne par demi-heure, sur {days} jours
          </p>
        </div>
      </header>

      <div className="chart-meta">
        {showSplit ? (
          <ul className="legend">
            <li>
              <span className="swatch swatch-peak" />
              Heures pleines
            </li>
            <li>
              <span className="swatch swatch-off-peak" />
              Heures creuses
            </li>
          </ul>
        ) : (
          <span />
        )}
      </div>

      <div className="chart-plot chart-plot-small">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={profile} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="12%">
            <CartesianGrid vertical={false} stroke="var(--hairline)" />

            <XAxis
              dataKey="minuteOfDay"
              tickLine={false}
              axisLine={{ stroke: 'var(--axis)' }}
              tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
              tickFormatter={(minutes: number) => formatMinutes(minutes)}
              // One tick every 6 hours: 0 h, 6 h, 12 h, 18 h.
              interval={11}
              tickMargin={8}
            />

            <YAxis
              width={44}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
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

                const point = payload[0].payload as ProfilePoint;
                const offPeak = showSplit && point.offPeak;

                return (
                  <div className="tooltip">
                    <p className="tooltip-title">
                      {formatMinutes(point.minuteOfDay)} – {formatMinutes(point.minuteOfDay + 30)}
                    </p>
                    <p className="tooltip-row">
                      <span
                        className="tooltip-key"
                        style={{
                          background: offPeak ? 'var(--series-off-peak)' : 'var(--series-peak)'
                        }}
                      />
                      <span>
                        {showSplit ? (offPeak ? 'Heures creuses' : 'Heures pleines') : 'Moyenne'}
                      </span>
                      <strong>{formatWatts(point.watts)}</strong>
                    </p>
                  </div>
                );
              }}
            />

            <Bar dataKey="watts" name="Puissance moyenne (W)" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false}>
              {profile.map((point) => (
                <Cell
                  key={point.minuteOfDay}
                  fill={
                    showSplit && point.offPeak ? 'var(--series-off-peak)' : 'var(--series-peak)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default DailyProfile;
