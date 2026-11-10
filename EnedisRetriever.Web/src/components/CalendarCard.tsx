import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from 'react';

import {
  addDays,
  earliestAvailableDay,
  latestAvailableDay,
  parseIsoDay,
  toIsoDay
} from '../lib/dates';
import { formatLongDay } from '../lib/format';
import { isSelectable, normalize, type DaySelection } from '../lib/selection';
import type { Availability } from '../types/consumption';

type Props = {
  days: DaySelection;
  availability: Availability | null;
  /** Returns an error message when the new selection is refused. */
  onDays: (days: DaySelection) => string | null;
};

type Month = {
  key: string;
  label: string;
  /** 0-11, drives the month colour. */
  index: number;
  /** Empty cells before the 1st, so it lands on its weekday row. */
  offset: number;
  days: string[];
};

type Drag = {
  mode: 'add' | 'remove';
  draft: Set<string>;
};

const MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** 46 half-hours is a full day when the clocks go forward. */
const FULL_DAY_POINTS = 46;
/** A finger has to rest this long on a day before dragging selects instead of scrolling. */
const LONG_PRESS_MS = 300;
const MOVE_TOLERANCE_PX = 8;
const ERROR_DURATION_MS = 4000;

function buildMonths(): Month[] {
  const first = parseIsoDay(earliestAvailableDay());
  const last = parseIsoDay(latestAvailableDay());
  const months: Month[] = [];

  for (
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    cursor <= last;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const start = toIsoDay(cursor);
    const end = toIsoDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const days: string[] = [];

    for (let day = start; day <= end; day = addDays(day, 1)) {
      days.push(day);
    }

    months.push({
      key: start.slice(0, 7),
      label: `${MONTH_NAMES[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`,
      index: cursor.getMonth(),
      offset: (cursor.getDay() || 7) - 1,
      days
    });
  }

  return months;
}

function dayAt(x: number, y: number): string | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-day]');

  return element && element.dataset.selectable === 'true' ? element.dataset.day ?? null : null;
}

function CalendarCard({ days, availability, onDays }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const press = useRef<{ timer: number; x: number; y: number; day: string } | null>(null);
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => buildMonths(), []);
  const selected = useMemo(() => draft ?? new Set(days), [draft, days]);

  const cached = useMemo(
    () => new Map(availability?.days.map((entry) => [entry.date, entry.points]) ?? []),
    [availability]
  );

  // Starts on the month holding the end of the selection, at the right edge.
  const lastDay = days[days.length - 1];

  useEffect(() => {
    const element = scroller.current;
    const month = element?.querySelector<HTMLElement>(`[data-month="${lastDay.slice(0, 7)}"]`);

    if (element && month) {
      element.scrollLeft = month.offsetLeft + month.offsetWidth - element.clientWidth + 16;
    }
    // Only on mount: scrolling while the user browses the strip would be jarring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = window.setTimeout(() => setError(null), ERROR_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [error]);

  function commit(next: Iterable<string>) {
    setError(onDays(normalize(next)));
  }

  function startDrag(day: string) {
    // The first day decides: adding to the selection, or removing from it.
    const mode = selected.has(day) ? 'remove' : 'add';
    const next = new Set(selected);

    if (mode === 'add') {
      next.add(day);
    } else {
      next.delete(day);
    }

    drag.current = { mode, draft: next };
    setDraft(new Set(next));
  }

  function extendDrag(day: string | null) {
    const current = drag.current;

    if (!current || !day) {
      return;
    }

    const has = current.draft.has(day);

    // In "add" mode, already selected days are left alone, and vice versa.
    if (current.mode === 'add' && !has) {
      current.draft.add(day);
      setDraft(new Set(current.draft));
    } else if (current.mode === 'remove' && has) {
      current.draft.delete(day);
      setDraft(new Set(current.draft));
    }
  }

  function endDrag() {
    const current = drag.current;

    drag.current = null;
    setDraft(null);

    if (current) {
      commit(current.draft);
    }
  }

  function cancelPress() {
    if (press.current) {
      window.clearTimeout(press.current.timer);
      press.current = null;
    }
  }

  // Window-level listeners: the pointer may leave the strip while dragging.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (drag.current) {
        extendDrag(dayAt(event.clientX, event.clientY));
        return;
      }

      const pending = press.current;

      if (
        pending &&
        Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > MOVE_TOLERANCE_PX
      ) {
        // The finger moved before the long press: the user is scrolling.
        cancelPress();
      }
    }

    function onUp() {
      const pending = press.current;

      if (pending) {
        // A short tap toggles a single day.
        cancelPress();
        startDrag(pending.day);
        endDrag();
        return;
      }

      if (drag.current) {
        endDrag();
      }
    }

    function onCancel() {
      cancelPress();

      if (drag.current) {
        endDrag();
      }
    }

    // Once a touch drag has started, the strip must not scroll under the finger.
    function onTouchMove(event: TouchEvent) {
      if (drag.current) {
        event.preventDefault();
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchmove', onTouchMove);
    };
  });

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const day = dayAt(event.clientX, event.clientY);

    if (!day) {
      return;
    }

    if (event.pointerType === 'touch') {
      cancelPress();
      press.current = {
        x: event.clientX,
        y: event.clientY,
        day,
        timer: window.setTimeout(() => {
          press.current = null;
          navigator.vibrate?.(10);
          startDrag(day);
        }, LONG_PRESS_MS)
      };
      return;
    }

    // Mouse and pen: dragging starts at once (and doesn't select text).
    event.preventDefault();
    startDrag(day);
  }

  const selectedCount = selected.size;

  return (
    <section className="card calendar" aria-label="Calendrier">
      <header className="calendar-header">
        <div>
          <h2>Calendrier</h2>
          <p className="chart-subtitle">
            {selectedCount === 1 ? '1 jour sélectionné' : `${selectedCount} jours sélectionnés`}
          </p>
        </div>
        <ul className="legend calendar-legend">
          <li>
            <span className="calendar-swatch" data-selected="true" />
            Sélectionné
          </li>
          <li>
            <span className="calendar-swatch" />
            Non sélectionné
          </li>
          <li>
            <span className="calendar-swatch" data-cached="true" />
            Déjà en cache
          </li>
        </ul>
      </header>

      <div className="calendar-scroll" ref={scroller}>
        <div className="calendar-months" onPointerDown={handlePointerDown} onContextMenu={(event) => event.preventDefault()}>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday, index) => (
              <span key={index}>{weekday}</span>
            ))}
          </div>

          {months.map((month) => (
            <div
              key={month.key}
              className="calendar-month"
              data-month={month.key}
              // 150° between consecutive months: neighbours never share a colour family.
              style={{ '--month-hue': `${(month.index * 150 + 250) % 360}` } as CSSProperties}
            >
              <button
                type="button"
                className="calendar-month-label"
                title={`Sélectionner tout le mois de ${month.label}`}
                onClick={() => commit(month.days.filter(isSelectable))}
              >
                {month.label}
              </button>

              <div className="calendar-grid">
                {Array.from({ length: month.offset }, (_, index) => (
                  <span key={`empty-${index}`} className="calendar-cell calendar-empty" />
                ))}

                {month.days.map((day) => {
                  const selectable = isSelectable(day);
                  const points = cached.get(day) ?? 0;

                  return (
                    <span
                      key={day}
                      className="calendar-cell"
                      data-day={day}
                      data-selectable={selectable}
                      data-selected={selected.has(day)}
                      data-cached={points >= FULL_DAY_POINTS}
                      title={`${formatLongDay(parseIsoDay(day))}${
                        points >= FULL_DAY_POINTS ? ' · en cache' : points > 0 ? ' · en cache, incomplet' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="card-hint" role={error ? 'alert' : undefined}>
        {error ?? (
          <>
            <span className="hint-mouse">Cliquez-glissez</span>
            <span className="hint-touch">Appuyez longuement puis glissez</span> pour ajouter des
            jours, ou pour en retirer en partant d’un jour déjà sélectionné. Le nom d’un mois le
            sélectionne en entier.
          </>
        )}
      </p>
    </section>
  );
}

export default CalendarCard;
