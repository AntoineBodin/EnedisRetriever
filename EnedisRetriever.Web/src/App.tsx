import { useCallback, useEffect, useMemo, useState } from 'react';

import CalendarCard from './components/CalendarCard';
import ConsumptionChart from './components/ConsumptionChart';
import ContractPanel from './components/ContractPanel';
import DailyProfile from './components/DailyProfile';
import { AlertIcon, BoltIcon, MoonIcon, SlidersIcon, SunIcon } from './components/Icons';
import KpiCards from './components/KpiCards';
import PeriodBar from './components/PeriodBar';
import SwipePanels from './components/SwipePanels';
import { useConsumption } from './hooks/useConsumption';
import { useStoredState } from './hooks/useStoredState';
import { addDays, countDays, PRESETS, presetPeriod, toIsoDay, type PresetId } from './lib/dates';
import {
  daysOf,
  isContiguous,
  rangeOf,
  sameSelection,
  validateSelection,
  type DaySelection
} from './lib/selection';
import { formatPercent } from './lib/format';
import {
  allowedGranularities,
  baseloadWatts,
  buildBuckets,
  buildDailyProfile,
  buildSlots,
  defaultGranularity,
  summarize
} from './services/analysis';
import { MIN_BILL_DAYS, simulateBill } from './services/billSimulation';
import type { Granularity } from './types/consumption';
import { DEFAULT_CONTRACT, type ElectricityContract } from './types/electricityContract';

type Theme = 'light' | 'dark';

function reviveTheme(stored: unknown, fallback: Theme): Theme {
  return stored === 'light' || stored === 'dark' ? stored : fallback;
}

function revivePreset(stored: unknown, fallback: PresetId): PresetId {
  return PRESETS.some((preset) => preset.id === stored) ? (stored as PresetId) : fallback;
}

/** Fills whatever is missing from a stored contract with the defaults. */
function reviveContract(stored: unknown, fallback: ElectricityContract): ElectricityContract {
  if (typeof stored !== 'object' || stored === null) {
    return fallback;
  }

  const saved = stored as Partial<ElectricityContract>;

  return {
    ...fallback,
    ...saved,
    base: { ...fallback.base, ...saved.base },
    hphc: { ...fallback.hphc, ...saved.hphc },
    taxes: { ...fallback.taxes, ...saved.taxes },
    offPeakRanges: Array.isArray(saved.offPeakRanges)
      ? saved.offPeakRanges
      : fallback.offPeakRanges
  };
}

function initialTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [theme, setTheme] = useStoredState<Theme>('conso.theme', initialTheme(), reviveTheme);
  const [contract, setContract] = useStoredState(
    // v2: prices are stored excluding taxes (v1 stored TTC prices under other keys).
    'conso.contract.v2',
    DEFAULT_CONTRACT,
    reviveContract
  );
  const [preset, setPreset] = useStoredState<PresetId>('conso.preset', '7d', revivePreset);
  // Null while a preset drives the selection.
  const [customDays, setCustomDays] = useState<DaySelection | null>(null);
  const [panel, setPanel] = useStoredState<number>('conso.panel', 0, (stored, fallback) =>
    stored === 0 || stored === 1 ? stored : fallback
  );
  const [granularityChoice, setGranularityChoice] = useState<Granularity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const presetDays = useMemo(() => daysOf(presetPeriod(preset)), [preset]);
  const selectedDays = customDays ?? presetDays;
  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);

  // The whole span is loaded; days left out of the selection are filtered below.
  const { start, end } = rangeOf(selectedDays);
  const period = useMemo(() => ({ start, end }), [start, end]);

  const { points, period: loadedPeriod, loading, error, availability, retry } =
    useConsumption(period);

  // Everything below describes the period that is actually on screen, which
  // lags behind the requested one while a new period loads.
  const shownPeriod = loadedPeriod ?? period;
  // Span drives the chart layout; the day count drives totals and the subscription.
  const days = countDays(shownPeriod.start, shownPeriod.end);
  const dayCount = selectedDays.filter(
    (day) => day >= shownPeriod.start && day <= shownPeriod.end
  ).length;

  const showSplit = contract.option === 'hphc' || contract.compareOptions;

  const slots = useMemo(
    () =>
      buildSlots(points, contract.offPeakRanges).filter((slot) =>
        selectedSet.has(toIsoDay(slot.start))
      ),
    [points, contract.offPeakRanges, selectedSet]
  );

  const summary = useMemo(
    () => summarize(slots, contract, dayCount),
    [slots, contract, dayCount]
  );

  const allowed = allowedGranularities(days);
  const granularity =
    granularityChoice && allowed.includes(granularityChoice)
      ? granularityChoice
      : defaultGranularity(days);

  const buckets = useMemo(
    () => buildBuckets(slots, contract, granularity, days > 1),
    [slots, contract, granularity, days]
  );

  const profile = useMemo(
    () => buildDailyProfile(slots, contract.offPeakRanges),
    [slots, contract.offPeakRanges]
  );

  const baseload = useMemo(() => baseloadWatts(slots), [slots]);

  const bill = useMemo(
    () =>
      dayCount >= MIN_BILL_DAYS
        ? simulateBill(contract, contract.option, summary.peakKwh, summary.offPeakKwh, dayCount)
        : null,
    [contract, summary.peakKwh, summary.offPeakKwh, dayCount]
  );

  const selectPreset = useCallback(
    (id: PresetId) => {
      setPreset(id);
      setCustomDays(null);
    },
    [setPreset]
  );

  /** Applies a new selection; returns why it was refused, if it was. */
  const selectDays = useCallback(
    (next: DaySelection): string | null => {
      const problem = validateSelection(next);

      if (problem) {
        return problem;
      }

      // Back on a preset when the selection matches one exactly.
      const matching = PRESETS.find((entry) => sameSelection(daysOf(presetPeriod(entry.id)), next));

      if (matching) {
        selectPreset(matching.id);
      } else {
        setCustomDays(next);
      }

      return null;
    },
    [selectPreset]
  );

  const hasData = slots.length > 0;
  const coverage = summary.expectedSlots > 0 ? summary.measuredSlots / summary.expectedSlots : 0;
  const optionLabel = contract.option === 'hphc' ? 'Heures creuses' : 'Base';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BoltIcon size={20} />
          </span>
          <div>
            <h1>Ma conso</h1>
            <p>Suivi de la consommation électrique</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button type="button" className="button" onClick={() => setPanelOpen(true)}>
            <SlidersIcon />
            <span className="wide-only">
              {optionLabel} · {contract.subscribedPowerKva} kVA
            </span>
            <span className="narrow-only">Contrat</span>
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <SwipePanels
        label="Choix des jours"
        active={panel}
        onActive={setPanel}
        panels={[
          {
            id: 'period',
            label: 'Période',
            content: (
              <PeriodBar
                days={selectedDays}
                activePreset={customDays ? null : preset}
                onPreset={selectPreset}
                onDays={(next) => {
                  selectDays(next);
                }}
              />
            )
          },
          {
            id: 'calendar',
            label: 'Calendrier',
            content: (
              <CalendarCard days={selectedDays} availability={availability} onDays={selectDays} />
            )
          }
        ]}
      />

      <div className="progress" data-active={loading} role="status">
        {loading && <span className="visually-hidden">Chargement des données…</span>}
      </div>

      {error && !loading && (
        <div className="notice notice-error" role="alert">
          <AlertIcon />
          <p>{error}</p>
          <button type="button" className="button" onClick={retry}>
            Réessayer
          </button>
        </div>
      )}

      {!error && !hasData && loading && (
        <div className="empty">
          <p>Chargement des données…</p>
          <small>
            Les jours absents du cache sont récupérés auprès d’Enedis, cela peut prendre
            quelques secondes.
          </small>
        </div>
      )}

      {!error && !hasData && !loading && (
        <div className="empty">
          <p>Aucune mesure sur cette période</p>
          <small>
            Enedis n’a rien publié pour ces dates. Les données de la veille arrivent en
            général dans la matinée.
          </small>
        </div>
      )}

      {hasData && (
        <main className="content" data-loading={loading}>
          {coverage < 0.98 && (
            <div className="notice">
              <AlertIcon />
              <p>
                Données partielles : {formatPercent(summary.measuredSlots, summary.expectedSlots)}{' '}
                des mesures de la période sont disponibles. Les totaux et les coûts ne
                portent que sur ces mesures.
              </p>
            </div>
          )}

          <KpiCards
            summary={summary}
            contract={contract}
            showSplit={showSplit}
            baseloadWatts={baseload}
            bill={bill}
            billPeriod={
              isContiguous(selectedDays)
                ? { start: addDays(start, 1), end: addDays(end, 1) }
                : null
            }
            onAlignToInvoice={() => selectDays(selectedDays.map((day) => addDays(day, -1)))}
          />

          <ConsumptionChart
            buckets={buckets}
            showSplit={showSplit}
            granularity={granularity}
            allowedGranularities={allowed}
            onGranularity={setGranularityChoice}
          />

          {dayCount > 1 && (
            <DailyProfile profile={profile} showSplit={showSplit} days={dayCount} />
          )}
        </main>
      )}

      <footer className="footer">
        Données Enedis via consoAPI. Les coûts sont des estimations calculées à partir
        des tarifs que vous avez saisis.
      </footer>

      <ContractPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        contract={contract}
        onChange={setContract}
        onReset={() => setContract(DEFAULT_CONTRACT)}
      />
    </div>
  );
}

export default App;
