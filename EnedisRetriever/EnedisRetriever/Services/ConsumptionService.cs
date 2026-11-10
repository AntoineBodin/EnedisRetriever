using EnedisRetriever.ConsoApi;
using EnedisRetriever.Domain;
using EnedisRetriever.Persistence;

namespace EnedisRetriever.Services;

public class ConsumptionService(
    ConsoApiClient consoApiClient,
    ConsumptionRepository consumptionRepository,
    ILogger<ConsumptionService> logger)
{
    private const int MaxLoadCurveDays = 7;
    private const int IntervalMinutes = 30;

    private readonly ConsoApiClient _consoApiClient = consoApiClient;
    private readonly ConsumptionRepository _consumptionRepository = consumptionRepository;
    private readonly ILogger<ConsumptionService> _logger = logger;

    public async Task<List<ConsumptionPoint>> GetConsumptionAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken = default)
    {
        var startDateTime = start.ToDateTime(TimeOnly.MinValue);
        var endDateTime = end.ToDateTime(TimeOnly.MinValue);

        var existingPoints = await _consumptionRepository.GetAsync(
            startDateTime,
            endDateTime,
            cancellationToken);

        _logger.LogInformation(
            "Cache: {Count} points found for {Start} -> {End}",
            existingPoints.Count,
            start,
            end);

        var missingApiDays = FindMissingApiDays(
            startDateTime,
            endDateTime,
            existingPoints);

        _logger.LogInformation(
            "Cache: {Count} missing API day(s) detected",
            missingApiDays.Count);

        var missingRanges = GroupApiDaysIntoRanges(missingApiDays);

        foreach (var range in missingRanges)
        {
            cancellationToken.ThrowIfCancellationRequested();

            _logger.LogInformation(
                "ConsoAPI: fetching {Start} -> {End}",
                range.Start,
                range.End);

            var points = await GetLoadCurvePointsAsync(
                range.Start,
                range.End,
                cancellationToken);

            _logger.LogInformation(
                "ConsoAPI: received {Count} points",
                points.Count);

            await _consumptionRepository.UpsertAsync(
                points,
                cancellationToken);

            _logger.LogInformation(
                "Cache: {Count} points upserted",
                points.Count);
        }

        var finalPoints = await _consumptionRepository.GetAsync(
            startDateTime,
            endDateTime,
            cancellationToken);

        _logger.LogInformation(
            "Cache: returning {Count} points for {Start} -> {End}",
            finalPoints.Count,
            start,
            end);

        return finalPoints;
    }

    private async Task<List<ConsumptionPoint>> GetLoadCurvePointsAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken)
    {
        var points = new List<ConsumptionPoint>();
        var currentStart = start;

        while (currentStart < end)
        {
            var currentEnd = currentStart.AddDays(MaxLoadCurveDays);

            if (currentEnd > end)
            {
                currentEnd = end;
            }

            _logger.LogInformation(
                "ConsoAPI: requesting {Start} -> {End}",
                currentStart,
                currentEnd);

            var loadCurve = await _consoApiClient.GetLoadCurveAsync(
                currentStart,
                currentEnd,
                cancellationToken);

            var result = LoadCurveMapper.ToConsumptionPoints(loadCurve);

            if (result.SkippedPoints > 0)
            {
                _logger.LogWarning(
                    "ConsoAPI: {Count} point(s) without a valid value skipped for {Start} -> {End}",
                    result.SkippedPoints,
                    currentStart,
                    currentEnd);
            }

            if (result.Points.Count == 0)
            {
                _logger.LogWarning(
                    "ConsoAPI: no consumption (CONS / PA / W) point found for {Start} -> {End}",
                    currentStart,
                    currentEnd);
            }

            points.AddRange(result.Points);

            currentStart = currentEnd;
        }

        return points;
    }

    private static List<DateOnly> FindMissingApiDays(
        DateTime start,
        DateTime end,
        IReadOnlyCollection<ConsumptionPoint> existingPoints)
    {
        var existingTimestamps = existingPoints
            .Select(point => point.Timestamp)
            .ToHashSet();

        var missingApiDays = new HashSet<DateOnly>();

        var current = start.AddMinutes(IntervalMinutes);

        while (current <= end)
        {
            if (!existingTimestamps.Contains(current))
            {
                var apiDay = GetApiDayForTimestamp(current);

                missingApiDays.Add(apiDay);
            }

            current = current.AddMinutes(IntervalMinutes);
        }

        return missingApiDays
            .OrderBy(day => day)
            .ToList();
    }

    private static DateOnly GetApiDayForTimestamp(DateTime timestamp)
    {
        var date = DateOnly.FromDateTime(timestamp);

        // Midnight belongs to the previous API day because
        // the load curve point represents the interval ending at midnight.
        if (timestamp.TimeOfDay == TimeSpan.Zero)
        {
            return date.AddDays(-1);
        }

        return date;
    }

    private static List<ApiDateRange> GroupApiDaysIntoRanges(
        List<DateOnly> apiDays)
    {
        if (apiDays.Count == 0)
        {
            return [];
        }

        var orderedDays = apiDays
            .OrderBy(day => day)
            .ToList();

        var ranges = new List<ApiDateRange>();

        var rangeStart = orderedDays[0];
        var previousDay = orderedDays[0];

        for (var i = 1; i < orderedDays.Count; i++)
        {
            var currentDay = orderedDays[i];

            var isConsecutive =
                currentDay == previousDay.AddDays(1);

            var rangeLength =
                currentDay.DayNumber - rangeStart.DayNumber + 1;

            if (!isConsecutive || rangeLength > MaxLoadCurveDays)
            {
                ranges.Add(
                    new ApiDateRange(
                        rangeStart,
                        previousDay.AddDays(1)));

                rangeStart = currentDay;
            }

            previousDay = currentDay;
        }

        ranges.Add(
            new ApiDateRange(
                rangeStart,
                previousDay.AddDays(1)));

        return ranges;
    }

    private sealed record ApiDateRange(
        DateOnly Start,
        DateOnly End);
}