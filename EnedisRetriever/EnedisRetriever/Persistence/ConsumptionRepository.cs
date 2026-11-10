using EnedisRetriever.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace EnedisRetriever.Persistence;

public class ConsumptionRepository(AppDbContext dbContext)
{
    private readonly AppDbContext _dbContext = dbContext;

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

    /// <summary>
    /// Counts cached points per consumption day. Timestamps mark the end of
    /// each interval, so the interval start decides which day a point belongs to.
    /// </summary>
    public async Task<List<DayAvailability>> GetDailyAvailabilityAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Database
            .SqlQuery<DayAvailability>($"""
                SELECT ("Timestamp" - "IntervalDuration")::date AS "Date",
                       count(*)::int AS "Points"
                FROM "ConsumptionPoints"
                GROUP BY 1
                ORDER BY 1
                """)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Inserts the points, or updates the ones whose timestamp is already cached.
    /// Done in one atomic statement so that two requests loading the same days
    /// at the same time cannot collide on the unique timestamp index.
    /// </summary>
    public async Task UpsertAsync(
        IEnumerable<ConsumptionPoint> points,
        CancellationToken cancellationToken = default)
    {
        // ON CONFLICT cannot touch the same row twice in one statement:
        // keep a single point per timestamp (the last one wins).
        var pointsList = points
            .GroupBy(point => point.Timestamp)
            .Select(group => group.Last())
            .ToList();

        if (pointsList.Count == 0)
        {
            return;
        }

        var parameters = new NpgsqlParameter[]
        {
            new NpgsqlParameter<DateTime[]>("timestamps", NpgsqlDbType.Array | NpgsqlDbType.Timestamp)
            {
                TypedValue = pointsList.Select(point => point.Timestamp).ToArray()
            },
            new NpgsqlParameter<decimal[]>("powers", NpgsqlDbType.Array | NpgsqlDbType.Numeric)
            {
                TypedValue = pointsList.Select(point => point.PowerWatts).ToArray()
            },
            new NpgsqlParameter<TimeSpan[]>("durations", NpgsqlDbType.Array | NpgsqlDbType.Interval)
            {
                TypedValue = pointsList.Select(point => point.IntervalDuration).ToArray()
            },
            new NpgsqlParameter<decimal[]>("energies", NpgsqlDbType.Array | NpgsqlDbType.Numeric)
            {
                TypedValue = pointsList.Select(point => point.EnergyKwh).ToArray()
            }
        };

        await _dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "ConsumptionPoints" ("Timestamp", "PowerWatts", "IntervalDuration", "EnergyKwh")
            SELECT * FROM unnest(@timestamps, @powers, @durations, @energies)
            ON CONFLICT ("Timestamp") DO UPDATE SET
                "PowerWatts" = EXCLUDED."PowerWatts",
                "IntervalDuration" = EXCLUDED."IntervalDuration",
                "EnergyKwh" = EXCLUDED."EnergyKwh"
            """,
            parameters,
            cancellationToken);
    }
}
