namespace EnedisRetriever.ConsoApi.Models;

public class IntervalReading
{
    public string Value { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    public string IntervalLength { get; set; } = string.Empty;

    public string MeasureType { get; set; } = string.Empty;
}