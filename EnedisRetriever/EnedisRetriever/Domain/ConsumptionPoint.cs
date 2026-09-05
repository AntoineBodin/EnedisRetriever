namespace EnedisRetriever.Domain;

public class ConsumptionPoint
{
    public long Id { get; set; }

    public DateTime Timestamp { get; set; }

    public decimal PowerWatts { get; set; }

    public TimeSpan IntervalDuration { get; set; }

    public decimal EnergyKwh { get; set; }
}