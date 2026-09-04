namespace EnedisRetriever.Domain;

public class ConsumptionPeriod
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public decimal EnergyKwh { get; set; }
    public decimal AveragePowerWatts { get; set; }
}