using EnedisRetriever.Domain;
using Microsoft.EntityFrameworkCore;

namespace EnedisRetriever.Persistence;

public class ConsumptionRepository
{
    private readonly AppDbContext _dbContext;

    public ConsumptionRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<ConsumptionPoint>> GetAsync(
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ConsumptionPoints
            .AsNoTracking()
            .Where(point =>
                point.Timestamp > start &&
                point.Timestamp <= end)
            .OrderBy(point => point.Timestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertAsync(
        IEnumerable<ConsumptionPoint> points,
        CancellationToken cancellationToken = default)
    {
        var pointsList = points.ToList();

        if (pointsList.Count == 0)
        {
            return;
        }

        var timestamps = pointsList
            .Select(point => point.Timestamp)
            .ToList();

        var existingPoints = await _dbContext.ConsumptionPoints
            .Where(point => timestamps.Contains(point.Timestamp))
            .ToListAsync(cancellationToken);

        var existingByTimestamp = existingPoints
            .ToDictionary(point => point.Timestamp);

        foreach (var point in pointsList)
        {
            if (existingByTimestamp.TryGetValue(
                point.Timestamp,
                out var existing))
            {
                existing.PowerWatts = point.PowerWatts;
                existing.IntervalDuration = point.IntervalDuration;
                existing.EnergyKwh = point.EnergyKwh;
            }
            else
            {
                _dbContext.ConsumptionPoints.Add(point);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}