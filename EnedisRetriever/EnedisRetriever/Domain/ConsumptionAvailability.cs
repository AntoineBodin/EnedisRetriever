namespace EnedisRetriever.Domain;

/// <summary>
/// Overview of the load-curve data currently stored in the cache.
/// Built from the database only: it never calls consoAPI.
/// </summary>
public class ConsumptionAvailability
{
    public const int ExpectedPointsPerDay = 48;

    public DateOnly? FirstDay { get; set; }

    public DateOnly? LastDay { get; set; }

    public int TotalPoints { get; set; }

    public int ExpectedPointsPerFullDay { get; set; } = ExpectedPointsPerDay;

    public List<DayAvailability> Days { get; set; } = [];
}

/// <summary>
/// Number of cached points for one consumption day. A point belongs to the day
/// its interval starts in, so the midnight point counts for the previous day.
/// </summary>
public class DayAvailability
{
    public DateOnly Date { get; set; }

    public int Points { get; set; }
}
