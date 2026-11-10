import { formatMinutes } from '../lib/format';
import { isOffPeakMinute, offPeakMinutesPerDay } from '../services/analysis';
import type { TimeRange } from '../types/electricityContract';
import { PlusIcon, TrashIcon } from './Icons';

type Props = {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
};

const HALF_HOURS = Array.from({ length: 48 }, (_, index) => index * 30);

function OffPeakEditor({ ranges, onChange }: Props) {
  const total = offPeakMinutesPerDay(ranges);

  function update(index: number, changes: Partial<TimeRange>) {
    onChange(ranges.map((range, i) => (i === index ? { ...range, ...changes } : range)));
  }

  return (
    <div className="off-peak">
      <div
        className="day-strip"
        role="img"
        aria-label={`Heures creuses : ${formatMinutes(total)} par jour`}
      >
        {HALF_HOURS.map((minute) => (
          <span key={minute} data-off-peak={isOffPeakMinute(minute, ranges)} />
        ))}
      </div>
      <div className="day-strip-scale" aria-hidden="true">
        <span>0 h</span>
        <span>6 h</span>
        <span>12 h</span>
        <span>18 h</span>
        <span>24 h</span>
      </div>

      <ul className="range-list">
        {ranges.map((range, index) => (
          <li key={index}>
            <label className="field field-inline">
              <span>De</span>
              <input
                type="time"
                step={1800}
                value={range.start}
                onChange={(event) =>
                  event.target.value && update(index, { start: event.target.value })
                }
              />
            </label>
            <label className="field field-inline">
              <span>à</span>
              <input
                type="time"
                step={1800}
                value={range.end}
                onChange={(event) =>
                  event.target.value && update(index, { end: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="icon-button"
              onClick={() => onChange(ranges.filter((_, i) => i !== index))}
              aria-label={`Supprimer la plage ${index + 1}`}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      <div className="off-peak-footer">
        <button
          type="button"
          className="button button-ghost"
          onClick={() => onChange([...ranges, { start: '22:00', end: '06:00' }])}
        >
          <PlusIcon />
          Ajouter une plage
        </button>

        <p>
          <strong>{formatMinutes(total)}</strong> creuses par jour
        </p>
      </div>

      {total !== 480 && ranges.length > 0 && (
        <small>
          Un contrat heures creuses en compte en général 8 h par jour : vérifiez les plages
          indiquées sur votre facture.
        </small>
      )}
    </div>
  );
}

export default OffPeakEditor;
