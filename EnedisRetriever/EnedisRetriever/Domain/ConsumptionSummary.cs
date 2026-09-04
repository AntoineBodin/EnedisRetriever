namespace EnedisRetriever.Domain;

public class ConsumptionSummary
{
    public DateOnly Start { get; set; }

    public DateOnly End { get; set; }

    public decimal TotalKwh { get; set; }

    public List<ConsumptionPoint> Points { get; set; } = [];
}