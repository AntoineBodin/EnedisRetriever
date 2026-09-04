namespace EnedisRetriever.ConsoApi.Models;

public class ConsumptionLoadCurve
{
    public string UsagePointId { get; set; } = string.Empty;

    public DateOnly Start { get; set; }

    public DateOnly End { get; set; }

    public string Quality { get; set; } = string.Empty;

    public ReadingType ReadingType { get; set; } = new();

    public List<IntervalReading> IntervalReading { get; set; } = [];
}