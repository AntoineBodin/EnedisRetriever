using System.Globalization;
using EnedisRetriever.ConsoApi;
using EnedisRetriever.Domain;

namespace EnedisRetriever.Services;

public class ConsumptionService
{
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
        var loadCurve = await _consoApiClient.GetLoadCurveAsync(
            start,
            end,
            cancellationToken);

        return loadCurve.IntervalReading
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
}