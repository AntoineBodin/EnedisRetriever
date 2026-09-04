using EnedisRetriever.Domain;

namespace EnedisRetriever.Services;

public class ConsumptionAggregationService
{
    public List<ConsumptionPeriod> Aggregate(
        IEnumerable<ConsumptionPoint> points,
        ConsumptionGranularity granularity)
    {
        return points
            .GroupBy(point => GetPeriodStart(point, granularity))
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var start = group.Key;
                var end = GetPeriodEnd(start, granularity);

                return new ConsumptionPeriod
                {
                    Start = start,
                    End = end,
                    EnergyKwh = group.Sum(point => point.EnergyKwh)
                };
            })
            .ToList();
    }

    private static DateTime GetPeriodStart(
        ConsumptionPoint point,
        ConsumptionGranularity granularity)
    {
        var intervalStart = point.Date - point.IntervalDuration;

        return granularity switch
        {
            ConsumptionGranularity.HalfHour =>
                intervalStart,

            ConsumptionGranularity.Hour =>
                new DateTime(
                    intervalStart.Year,
                    intervalStart.Month,
                    intervalStart.Day,
                    intervalStart.Hour,
                    0,
                    0),

            ConsumptionGranularity.Day =>
                intervalStart.Date,

            ConsumptionGranularity.Week =>
                StartOfWeek(intervalStart),

            ConsumptionGranularity.Month =>
                new DateTime(
                    intervalStart.Year,
                    intervalStart.Month,
                    1),

            ConsumptionGranularity.Year =>
                new DateTime(
                    intervalStart.Year,
                    1,
                    1),

            _ => throw new ArgumentOutOfRangeException(
                nameof(granularity),
                granularity,
                null)
        };
    }

    private static DateTime GetPeriodEnd(
        DateTime start,
        ConsumptionGranularity granularity)
    {
        return granularity switch
        {
            ConsumptionGranularity.HalfHour =>
                start.AddMinutes(30),

            ConsumptionGranularity.Hour =>
                start.AddHours(1),

            ConsumptionGranularity.Day =>
                start.AddDays(1),

            ConsumptionGranularity.Week =>
                start.AddDays(7),

            ConsumptionGranularity.Month =>
                start.AddMonths(1),

            ConsumptionGranularity.Year =>
                start.AddYears(1),

            _ => throw new ArgumentOutOfRangeException(
                nameof(granularity),
                granularity,
                null)
        };
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var daysSinceMonday =
            ((int)date.DayOfWeek + 6) % 7;

        return date.Date.AddDays(-daysSinceMonday);
    }
}