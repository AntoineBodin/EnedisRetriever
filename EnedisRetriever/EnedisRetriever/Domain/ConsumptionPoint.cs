namespace EnedisRetriever.Domain;

public class ConsumptionPoint
{
    public DateTime Date { get; set; }
    public decimal PowerWatts { get; set; }
    public TimeSpan IntervalDuration { get; set; }
    public decimal EnergyKwh { get; set; }
}