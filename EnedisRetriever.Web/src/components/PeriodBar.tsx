import { useState, type FocusEvent } from 'react';

import {
  addDays,
  countDays,
  earliestAvailableDay,
  latestAvailableDay,
  PRESETS,
  shiftPeriod,
  validatePeriod,
  type Period,
  type PresetId
} from '../lib/dates';
import { formatPeriod } from '../lib/format';
import { daysOf, isContiguous, rangeOf, type DaySelection } from '../lib/selection';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

type Props = {
  days: DaySelection;
  activePreset: PresetId | null;
  onPreset: (preset: PresetId) => void;
  onDays: (days: DaySelection) => void;
};

/**
 * Date inputs that only commit on intent (leaving the fields, Enter, or the
 * "Appliquer" button). Committing on every change would reload the data, and
 * re-render the fields, each time the native picker moves to another month.
 */
function CustomDates({ period, onPeriod }: { period: Period; onPeriod: (period: Period) => void }) {
  const [draft, setDraft] = useState(period);

  const changed = draft.start !== period.start || draft.end !== period.end;
  const error = changed ? validatePeriod(draft) : null;

  function commit() {
    if (changed && !error) {
      onPeriod(draft);
    }
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    // Moving from one date field to the other is not leaving the form.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      commit();
    }
  }

  const min = earliestAvailableDay();
  const max = latestAvailableDay();

  return (
    <form
      className="period-dates"
      onBlur={handleBlur}
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <label className="field field-inline">
        <span>Du</span>
        <input
          type="date"
          value={draft.start}
          min={min}
          max={max}
          onChange={(event) => setDraft({ ...draft, start: event.target.value })}
        />
      </label>

      <label className="field field-inline">
        <span>au</span>
        <input
          type="date"
          value={draft.end}
          min={min}
          max={max}
          onChange={(event) => setDraft({ ...draft, end: event.target.value })}
        />
      </label>

      {changed && !error && (
        <button type="submit" className="button button-primary period-apply">
          Appliquer
        </button>
      )}

      {error && (
        <p className="period-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function PeriodBar({ days, activePreset, onPreset, onDays }: Props) {
  const period = rangeOf(days);
  const span = countDays(period.start, period.end);
  const contiguous = isContiguous(days);
  const latest = latestAvailableDay();
  const earliest = earliestAvailableDay();

  function move(direction: -1 | 1) {
    if (!contiguous) {
      // Keeps the pattern of a hand-picked selection, one span further.
      const shifted = days.map((day) => addDays(day, direction * span));

      if (shifted[shifted.length - 1] <= latest && shifted[0] >= earliest) {
        onDays(shifted);
      }

      return;
    }

    let next = shiftPeriod(period, direction);

    // Going forward never runs past yesterday: keep the length and stick to the end.
    if (next.end > latest) {
      next = { start: addDays(latest, -(span - 1)), end: latest };
    }

    onDays(daysOf(next));
  }

  return (
    <section className="period card" aria-label="Période">
      <div className="period-nav">
        <button
          type="button"
          className="icon-button"
          onClick={() => move(-1)}
          disabled={addDays(period.start, -span) < earliest}
          aria-label="Période précédente"
        >
          <ChevronLeftIcon />
        </button>

        <div className="period-title">
          <strong>{formatPeriod(period.start, period.end)}</strong>
          <span>
            {contiguous
              ? span === 1
                ? '1 jour'
                : `${span} jours`
              : `${days.length} jours choisis sur ${span}`}
          </span>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={() => move(1)}
          disabled={period.end >= latest}
          aria-label="Période suivante"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="chips" role="group" aria-label="Périodes rapides">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="chip"
            aria-pressed={activePreset === preset.id}
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Remounted when the selection changes elsewhere, so the fields follow it.
          It only changes after a commit, never while the picker is open. */}
      <CustomDates
        key={`${period.start}|${period.end}`}
        period={period}
        onPeriod={(next) => onDays(daysOf(next))}
      />
    </section>
  );
}

export default PeriodBar;
