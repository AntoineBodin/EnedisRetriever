import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { getConsumptionAggregate } from './api/consumptionApi';
import type {
  ConsumptionAggregate,
  ConsumptionGranularity
} from './types/consumption';

import './Dashboard.css';
import TariffConfiguration from './components/TariffConfiguration';
import type { ElectricityContract } from './types/electricityContract';
import {
  calculateCostPoints,
  calculateElectricityCost,
  calculateEnergyPoints
} from './services/ElectricityCostCalculator';
import {
  aggregateCostSeries,
  aggregateEnergySeries
} from './services/TimeSeriesAggregator';

type ChartView = 'energy' | 'cost';

type ChartRow = {
  start: string;
  value?: number;
  peakKwh?: number;
  offPeakKwh?: number;
  peakCost?: number;
  offPeakCost?: number;
  subscriptionCost?: number;
};

function formatDate(date: Date): string {
  // Build from local calendar parts, not toISOString, to match the date picker's local date.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);

  return formatDate(date);
}

function getDefaultEndDate(): string {
  // Today's data is never complete yet, so the latest selectable day is yesterday.
  const date = new Date();
  date.setDate(date.getDate() - 1);

  return formatDate(date);
}

function getApiEndDate(inclusiveEndDate: string): string {
  const date = new Date(`${inclusiveEndDate}T00:00:00`);

  date.setDate(date.getDate() + 1);

  return formatDate(date);
}

function formatChartDate(
  dateString: string,
  granularity: ConsumptionGranularity
): string {
  const date = new Date(dateString);

  switch (granularity) {
    case 'HalfHour':
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

    case 'Hour':
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

    case 'Day':
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      });

    case 'Week':
      return `W${getWeekNumber(date)}`;

    case 'Month':
      return date.toLocaleDateString('fr-FR', {
        month: '2-digit',
        year: 'numeric'
      });

    case 'Year':
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric'
      });
  }
}

function formatTooltipLabel(
  dateString: string,
  granularity: ConsumptionGranularity
): string {
  // an hourly point can't be told apart from the same hour on another day otherwise
  if (granularity !== 'Hour') {
    return formatChartDate(dateString, granularity);
  }

  const date = new Date(dateString);

  return `${date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit'
  })} ${date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getWeekNumber(date: Date): number {
  const utcDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )
  );

  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(
    utcDate.getUTCDate() + 4 - day
  );

  const yearStart = new Date(
    Date.UTC(
      utcDate.getUTCFullYear(),
      0,
      1
    )
  );

  return Math.ceil(
    (((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
  );
}

function Dashboard() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [startDate, setStartDate] = useState(
    getDefaultStartDate
  );

  const [endDate, setEndDate] = useState(
    getDefaultEndDate
  );

  const maxDate = getDefaultEndDate();

  // The UI uses an inclusive end date.
  // The API uses an exclusive end date.
  const apiEndDate = useMemo(
    () => getApiEndDate(endDate),
    [endDate]
  );

  const [granularity, setGranularity] =
    useState<ConsumptionGranularity>('Day');

  const [consumption, setConsumption] =
    useState<ConsumptionAggregate>([]);

  const [chartView, setChartView] =
    useState<ChartView>('energy');

  const [splitEnergyByRate, setSplitEnergyByRate] =
    useState(false);

  const [includeSubscription, setIncludeSubscription] =
    useState(true);

  const [contract, setContract] =
    useState<ElectricityContract>({
      name: 'Current contract',
      pricingMode: 'PeakOffPeak',
      peakPricePerKwh: 0.1726,
      offPeakPricePerKwh: 0.1337,
      offPeakRanges: [
        {
          start: '02:00',
          end: '07:00'
        },
        {
          start: '14:00',
          end: '17:00'
        }
      ],
      monthlySubscription:  16.36
    });

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConsumption() {
      try {
        setLoading(true);
        setError(null);

        // a single HalfHour fetch feeds both the summary cards and the chart;
        // any other granularity is aggregated client-side from these points
        const data = await getConsumptionAggregate(
          {
            start: startDate,
            end: apiEndDate,
            granularity: 'HalfHour'
          },
          controller.signal
        );

        setConsumption(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load consumption data.'
        );
      } finally {
        setLoading(false);
      }
    }

    // StrictMode immediately cleans up its first development-only effect pass.
    // Deferring the request lets that cleanup cancel the pass before fetch starts.
    const loadTimeout = window.setTimeout(loadConsumption, 0);

    // cancels a stale in-flight request (e.g. React StrictMode's double-invoke in dev, or fast filter changes)
    return () => {
      window.clearTimeout(loadTimeout);
      controller.abort();
    };
  }, [
    startDate,
    apiEndDate
  ]);

  const consumptionCost = useMemo(
    () =>
      calculateElectricityCost(
        consumption,
        contract,
        startDate,
        endDate
      ),
    [
      consumption,
      contract,
      startDate,
      endDate
    ]
  );

  const aggregatedEnergy = useMemo(
    () =>
      aggregateEnergySeries(
        calculateEnergyPoints(consumption, contract),
        granularity
      ),
    [
      consumption,
      contract,
      granularity
    ]
  );

  const aggregatedCost = useMemo(
    () =>
      aggregateCostSeries(
        calculateCostPoints(consumption, contract),
        granularity
      ),
    [
      consumption,
      contract,
      granularity
    ]
  );

  const totalConsumption = useMemo(
    () =>
      aggregatedEnergy.reduce(
        (total, point) => total + point.peakKwh + point.offPeakKwh,
        0
      ),
    [aggregatedEnergy]
  );

  const averageConsumption = useMemo(() => {
    if (aggregatedEnergy.length === 0) {
      return 0;
    }

    return (
      totalConsumption /
      aggregatedEnergy.length
    );
  }, [
    aggregatedEnergy,
    totalConsumption
  ]);

  const energyChartData = useMemo<ChartRow[]>(
    () =>
      aggregatedEnergy.map((point) => ({
        start: point.start,
        value: point.peakKwh + point.offPeakKwh,
        peakKwh: point.peakKwh,
        offPeakKwh: point.offPeakKwh
      })),
    [
      aggregatedEnergy,
      granularity
    ]
  );

  const costChartData = useMemo<ChartRow[]>(
    () =>
      aggregatedCost.map((point) => ({
        start: point.start,
        peakCost: point.peakCost,
        offPeakCost: point.offPeakCost,
        subscriptionCost: point.subscriptionCost
      })),
    [
      aggregatedCost,
      granularity
    ]
  );

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Electricity consumption</h1>

          <p>
            Monitor your electricity consumption over time.
          </p>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={() =>
            setTheme((current) =>
              current === 'dark' ? 'light' : 'dark'
            )
          }
          aria-label="Toggle dark mode"
        >
          {theme === 'dark'
            ? '☀️ Light mode'
            : '🌙 Dark mode'}
        </button>
      </header>

      <section className="dashboard-filters">
        <div className="dashboard-field">
          <label htmlFor="start-date">
            Start date
          </label>

          <input
            id="start-date"
            type="date"
            value={startDate}
            max={maxDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
          />
        </div>

        <div className="dashboard-field">
          <label htmlFor="end-date">
            End date
          </label>

          <input
            id="end-date"
            type="date"
            value={endDate}
            max={maxDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
          />
        </div>

        <div className="dashboard-field">
          <label htmlFor="granularity">
            Granularity
          </label>

          <select
            id="granularity"
            value={granularity}
            onChange={(event) =>
              setGranularity(
                event.target.value as ConsumptionGranularity
              )
            }
          >
            <option value="HalfHour">
              30 minutes
            </option>

            <option value="Hour">
              Hour
            </option>

            <option value="Day">
              Day
            </option>

            <option value="Week">
              Week
            </option>

            <option value="Month">
              Month
            </option>

            <option value="Year">
              Year
            </option>
          </select>
        </div>
      </section>

      {loading && (
        <div className="dashboard-state">
          Loading consumption...
        </div>
      )}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        consumption.length === 0 && (
          <div className="dashboard-state">
            No consumption data available for this period.
          </div>
        )}

      <TariffConfiguration
        config={contract}
        onChange={setContract}
      />

      {!loading &&
        !error &&
        consumption.length > 0 && (
          <>
            <section className="dashboard-summary">
              <div className="summary-card">
                <h2>Total consumption</h2>
                <p>
                  {totalConsumption.toFixed(2)} kWh
                </p>
              </div>

              <div className="summary-card">
                <h2>Average consumption</h2>
                <p>
                  {averageConsumption.toFixed(2)} kWh
                </p>
              </div>

              <div className="summary-card">
                <h2>Peak consumption</h2>
                <p>
                  {consumptionCost.peakKwh.toFixed(2)} kWh
                </p>
              </div>

              <div className="summary-card">
                <h2>Off-peak consumption</h2>
                <p>
                  {consumptionCost.offPeakKwh.toFixed(2)} kWh
                </p>
              </div>

              <div className="summary-card">
                <h2>Theoretical energy cost</h2>
                <p>
                  {consumptionCost.energyCost.toFixed(2)} €
                </p>
              </div>

              <div className="summary-card">
                <h2>Subscription cost</h2>
                <p>
                  {consumptionCost.subscriptionCost.toFixed(2)} €
                </p>
              </div>

              <div className="summary-card">
                <h2>Total theoretical cost</h2>
                <p>
                  {consumptionCost.totalCost.toFixed(2)} €
                </p>
              </div>

              <div className="summary-card">
                <h2>Data points</h2>
                <p>{aggregatedEnergy.length}</p>
              </div>

              <div className="summary-card">
                <h2>Calculated consumption</h2>
                <p>
                  {consumptionCost.totalKwh.toFixed(2)} kWh
                </p>
              </div>
            </section>

            <section className="dashboard-chart">
              <div className="chart-header">
                <h2>
                  {chartView === 'energy' ? 'Consumption' : 'Cost'}
                </h2>

                <div className="chart-controls">
                  <div
                    className="view-toggle"
                    role="group"
                    aria-label="Chart view"
                  >
                    <button
                      type="button"
                      className={chartView === 'energy' ? 'active' : ''}
                      aria-pressed={chartView === 'energy'}
                      onClick={() => setChartView('energy')}
                    >
                      ⚡ kWh
                    </button>

                    <button
                      type="button"
                      className={chartView === 'cost' ? 'active' : ''}
                      aria-pressed={chartView === 'cost'}
                      onClick={() => setChartView('cost')}
                    >
                      € Cost
                    </button>
                  </div>

                  {chartView === 'energy' &&
                    contract.pricingMode === 'PeakOffPeak' && (
                      <label className="subscription-toggle">
                        <input
                          type="checkbox"
                          checked={splitEnergyByRate}
                          onChange={(event) =>
                            setSplitEnergyByRate(event.target.checked)
                          }
                        />
                        Split peak / off-peak
                      </label>
                    )}

                  {chartView === 'cost' && (
                    <label className="subscription-toggle">
                      <input
                        type="checkbox"
                        checked={includeSubscription}
                        onChange={(event) =>
                          setIncludeSubscription(event.target.checked)
                        }
                      />
                      Include subscription
                    </label>
                  )}
                </div>
              </div>

              <ResponsiveContainer
                width="100%"
                height={400}
              >
                <ComposedChart
                  data={
                    chartView === 'energy'
                      ? energyChartData
                      : costChartData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />

                  <XAxis
                    dataKey="start"
                    tickFormatter={(value: string) =>
                      formatChartDate(value, granularity)
                    }
                    minTickGap={30}
                    stroke="var(--color-border)"
                    tick={{
                      fill: 'var(--color-text-muted)'
                    }}
                  />

                  <YAxis
                    stroke="var(--color-border)"
                    tick={{
                      fill: 'var(--color-text-muted)'
                    }}
                    label={{
                      value: chartView === 'energy' ? 'kWh' : '€',
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'var(--color-text-muted)'
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      color: 'var(--color-text)'
                    }}
                    labelStyle={{
                      color: 'var(--color-heading)'
                    }}
                    labelFormatter={(_, payload) =>
                      formatTooltipLabel(
                        (payload?.[0]?.payload as ChartRow | undefined)
                          ?.start ?? '',
                        granularity
                      )
                    }
                    formatter={(value, name) =>
                      chartView === 'energy'
                        ? [`${Number(value).toFixed(3)} kWh`, name]
                        : [`${Number(value).toFixed(2)} €`, name]
                    }
                  />

                  {(chartView === 'cost' ||
                    (chartView === 'energy' && splitEnergyByRate)) && (
                    <Legend
                      wrapperStyle={{ color: 'var(--color-text-muted)' }}
                    />
                  )}

                  {chartView === 'energy' ? (
                    splitEnergyByRate &&
                    contract.pricingMode === 'PeakOffPeak' ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="peakKwh"
                          name="Peak hours"
                          stackId="energy"
                          stroke="var(--color-peak)"
                          fill="var(--color-peak)"
                          fillOpacity={0.65}
                        />

                        <Area
                          type="monotone"
                          dataKey="offPeakKwh"
                          name="Off-peak hours"
                          stackId="energy"
                          stroke="var(--color-off-peak)"
                          fill="var(--color-off-peak)"
                          fillOpacity={0.65}
                        />
                      </>
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Consumption"
                        stroke="var(--color-accent)"
                        dot={false}
                      />
                    )
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="peakCost"
                        name={
                          contract.pricingMode === 'SingleRate'
                            ? 'Energy cost'
                            : 'Peak hours cost'
                        }
                        stackId="cost"
                        stroke="var(--color-peak)"
                        fill="var(--color-peak)"
                        fillOpacity={0.65}
                      />

                      {contract.pricingMode === 'PeakOffPeak' && (
                        <Area
                          type="monotone"
                          dataKey="offPeakCost"
                          name="Off-peak hours cost"
                          stackId="cost"
                          stroke="var(--color-off-peak)"
                          fill="var(--color-off-peak)"
                          fillOpacity={0.65}
                        />
                      )}

                      {includeSubscription && (
                        <Area
                          type="monotone"
                          dataKey="subscriptionCost"
                          name="Subscription cost"
                          stackId="cost"
                          stroke="var(--color-subscription)"
                          fill="var(--color-subscription)"
                          fillOpacity={0.65}
                        />
                      )}
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </section>
          </>
        )}
    </main>
  );
}

export default Dashboard;