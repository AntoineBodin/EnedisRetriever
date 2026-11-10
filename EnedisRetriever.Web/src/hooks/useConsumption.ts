import { useCallback, useEffect, useState } from 'react';

import { getAvailability, getConsumption } from '../api/consumptionApi';
import { addDays, type Period } from '../lib/dates';
import type { Availability, ConsumptionPoint } from '../types/consumption';

type ConsumptionState = {
  /** Period the points belong to; lags behind the requested one while loading. */
  period: Period | null;
  points: ConsumptionPoint[];
  error: string | null;
};

/** Loads the raw points of a period, plus the cache overview after each load. */
export function useConsumption(period: Period) {
  const [state, setState] = useState<ConsumptionState>({
    period: null,
    points: [],
    error: null
  });
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestKey = `${period.start}|${period.end}|${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    // Deferred so React StrictMode's first dev-only pass is cancelled before fetching.
    const timeout = window.setTimeout(async () => {
      try {
        // The UI uses an inclusive end day; the API takes an exclusive one.
        const points = await getConsumption(
          period.start,
          addDays(period.end, 1),
          controller.signal
        );

        setState({ period, points, error: null });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setState({
          period,
          points: [],
          error: error instanceof Error ? error.message : 'Le chargement a échoué.'
        });
      }

      setDoneKey(requestKey);

      try {
        setAvailability(await getAvailability(controller.signal));
      } catch {
        // The overview is a bonus: the dashboard works without it.
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
    // `period` is fully described by requestKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return {
    ...state,
    loading: doneKey !== requestKey,
    availability,
    retry
  };
}
