using System.Text.Json.Serialization;

namespace EnedisRetriever.ConsoApi.Models;

public class LoadCurvePoint
{
    /// <summary>Measured value, as a string. Null when Enedis has no measure.</summary>
    [JsonPropertyName("v")]
    public string? Value { get; set; }

    /// <summary>End of the measured interval (local time).</summary>
    [JsonPropertyName("d")]
    public DateTime Date { get; set; }

    /// <summary>Interval length as an ISO 8601 duration, e.g. "PT30M".</summary>
    [JsonPropertyName("p")]
    public string? IntervalLength { get; set; }

    /// <summary>Measure nature/quality flag (e.g. "B" for raw).</summary>
    [JsonPropertyName("n")]
    public string? Nature { get; set; }
}
