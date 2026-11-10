import type { Availability, ConsumptionPoint } from '../types/consumption';

// In dev, Vite proxies /api to the local backend (see vite.config.ts);
// in production Nginx does the same, so the default works everywhere.
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function describeFailure(status: number): string {
  switch (status) {
    case 400:
      return 'La période demandée est invalide.';
    case 502:
      return 'Enedis (consoAPI) n’a pas répondu correctement. Réessayez dans quelques minutes.';
    default:
      return `Le serveur a répondu avec une erreur (${status}).`;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(0, 'Impossible de joindre le serveur.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, describeFailure(response.status));
  }

  return response.json() as Promise<T>;
}

/** Raw half-hour points for the days in [start, endExclusive), as YYYY-MM-DD. */
export function getConsumption(
  start: string,
  endExclusive: string,
  signal?: AbortSignal
): Promise<ConsumptionPoint[]> {
  const params = new URLSearchParams({ start, end: endExclusive });

  return getJson(`/consumption?${params}`, signal);
}

/** What the backend already has in cache; never triggers an Enedis call. */
export function getAvailability(signal?: AbortSignal): Promise<Availability> {
  return getJson('/consumption/availability', signal);
}
