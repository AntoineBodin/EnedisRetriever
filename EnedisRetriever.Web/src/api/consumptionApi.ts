import type {
  ConsumptionAggregate,
  ConsumptionGranularity
} from '../types/consumption';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type ConsumptionAggregateParams = {
  start: string;
  end: string;
  granularity: ConsumptionGranularity;
};

export async function getConsumptionAggregate(
  params: ConsumptionAggregateParams,
  signal?: AbortSignal
): Promise<ConsumptionAggregate> {
  // params.end is already the exclusive end date, converted from the UI's inclusive date
  const searchParams = new URLSearchParams({
    start: params.start,
    end: params.end,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/consumption?${searchParams}`,
    { signal }
  );

  console.log(`Fetching consumption data with params: ${searchParams}`);
  console.log(`API URL: ${API_BASE_URL}/api/consumption?${searchParams}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch consumption data: ${response.status}`
    );
  }

  return response.json();
}