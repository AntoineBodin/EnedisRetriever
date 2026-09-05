using EnedisRetriever.ConsoApi;
using EnedisRetriever.ConsoApi.Models;
using EnedisRetriever.Domain;
using System.Collections.Generic;
using System.Globalization;

namespace EnedisRetriever.Services;

public class ConsumptionService
{
    private const int MaxLoadCurveDays = 7;

    private readonly ConsoApiClient _consoApiClient;

    public ConsumptionService(ConsoApiClient consoApiClient)
    {
        _consoApiClient = consoApiClient;
    }

    public async Task<List<ConsumptionPoint>> GetConsumptionAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken = default)
    {
        var readings = await GetLoadCurveReadingsAsync(
            start,
            end,
            cancellationToken);

        return readings
            .Select(reading =>
            {
                var powerWatts = decimal.Parse(
                    reading.Value,
                    CultureInfo.InvariantCulture);

                var intervalDuration = IntervalDurationParser.Parse(
                    reading.IntervalLength);

                var energyKwh =
                    powerWatts *
                    (decimal)intervalDuration.TotalHours /
                    1000m;

                return new ConsumptionPoint
                {
                    Date = reading.Date,
                    PowerWatts = powerWatts,
                    IntervalDuration = intervalDuration,
                    EnergyKwh = energyKwh
                };
            })
            .ToList();
    }

    public async Task<ConsumptionSummary> GetConsumptionSummaryAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken = default)
    {
        var points = await GetConsumptionAsync(
            start,
            end,
            cancellationToken);

        return new ConsumptionSummary
        {
            Start = start,
            End = end,
            TotalKwh = points.Sum(point => point.EnergyKwh),
            Points = points
        };
    }

    private async Task<List<IntervalReading>> GetLoadCurveReadingsAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken)
    {
        var readings = new List<IntervalReading>();
        var currentStart = start;

        while (currentStart < end)
        {
            var currentEnd = currentStart.AddDays(MaxLoadCurveDays);

            if (currentEnd > end)
            {
                currentEnd = end;
            }

            var loadCurve = await _consoApiClient.GetLoadCurveAsync(
                currentStart,
                currentEnd,
                cancellationToken);

            readings.AddRange(loadCurve.IntervalReading);

            currentStart = currentEnd;
        }

        return readings;
    }
}