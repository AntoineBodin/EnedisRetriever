using EnedisRetriever.ConsoApi.Models;
using EnedisRetriever.Domain;
using System.Globalization;

namespace EnedisRetriever.Services;

public static class LoadCurveMapper
{
    private const string WattUnit = "W";
    private static readonly TimeSpan DefaultIntervalDuration = TimeSpan.FromMinutes(30);

    public sealed record MappingResult(
        List<ConsumptionPoint> Points,
        int SkippedPoints);

    /// <summary>
    /// Extracts the consumption average-power series (CONS / PA, in watts)
    /// and converts each point to a <see cref="ConsumptionPoint"/>.
    /// Points without a numeric value are skipped.
    /// </summary>
    public static MappingResult ToConsumptionPoints(ConsumptionLoadCurve loadCurve)
    {
        var points = new List<ConsumptionPoint>();
        var skipped = 0;

        var series = loadCurve.Grandeur.Where(grandeur =>
            string.Equals(grandeur.GrandeurMetier, LoadCurveSeries.ConsumptionBusinessQuantity, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(grandeur.GrandeurPhysique, LoadCurveSeries.ActivePowerPhysicalQuantity, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(grandeur.Unite, WattUnit, StringComparison.OrdinalIgnoreCase));

        foreach (var point in series.SelectMany(grandeur => grandeur.Points))
        {
            if (!decimal.TryParse(
                    point.Value,
                    NumberStyles.Number,
                    CultureInfo.InvariantCulture,
                    out var powerWatts))
            {
                skipped++;
                continue;
            }

            var intervalDuration = string.IsNullOrWhiteSpace(point.IntervalLength)
                ? DefaultIntervalDuration
                : IntervalDurationParser.Parse(point.IntervalLength);

            points.Add(new ConsumptionPoint
            {
                Timestamp = point.Date,
                PowerWatts = powerWatts,
                IntervalDuration = intervalDuration,
                EnergyKwh = powerWatts * (decimal)intervalDuration.TotalHours / 1000m
            });
        }

        return new MappingResult(MergeRepeatedTimestamps(points), skipped);
    }

    /// <summary>
    /// When clocks go back in autumn, the 02:00-03:00 hour happens twice and Enedis
    /// sends two measures with the same local timestamp. Timestamps are unique in
    /// the cache, so the two are merged into one point that keeps the full energy:
    /// durations and energies are added, power becomes the average over the merged
    /// interval.
    /// </summary>
    private static List<ConsumptionPoint> MergeRepeatedTimestamps(List<ConsumptionPoint> points)
    {
        return points
            .GroupBy(point => point.Timestamp)
            .Select(group =>
            {
                if (group.Count() == 1)
                {
                    return group.First();
                }

                var duration = TimeSpan.FromTicks(group.Sum(point => point.IntervalDuration.Ticks));
                var energyKwh = group.Sum(point => point.EnergyKwh);

                return new ConsumptionPoint
                {
                    Timestamp = group.Key,
                    IntervalDuration = duration,
                    EnergyKwh = energyKwh,
                    PowerWatts = energyKwh * 1000m / (decimal)duration.TotalHours
                };
            })
            .OrderBy(point => point.Timestamp)
            .ToList();
    }
}
