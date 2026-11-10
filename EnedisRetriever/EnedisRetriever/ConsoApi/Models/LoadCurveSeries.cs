namespace EnedisRetriever.ConsoApi.Models;

/// <summary>
/// One measured quantity of the response, e.g. consumption ("CONS")
/// of average active power ("PA") expressed in watts.
/// </summary>
public class LoadCurveSeries
{
    public const string ConsumptionBusinessQuantity = "CONS";
    public const string ActivePowerPhysicalQuantity = "PA";

    public string GrandeurMetier { get; set; } = string.Empty;

    public string GrandeurPhysique { get; set; } = string.Empty;

    public string Unite { get; set; } = string.Empty;

    public List<LoadCurvePoint> Points { get; set; } = [];
}
