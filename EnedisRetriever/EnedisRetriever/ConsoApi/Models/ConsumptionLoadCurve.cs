namespace EnedisRetriever.ConsoApi.Models;

/// <summary>
/// Response of the consoAPI "courbe_de_charge_consommation" endpoint
/// (Enedis "Mesure synchrone V2" format).
/// </summary>
public class ConsumptionLoadCurve
{
    public string IdPrm { get; set; } = string.Empty;

    public string EtapeMetier { get; set; } = string.Empty;

    public LoadCurvePeriod Periode { get; set; } = new();

    public string ModeCalcul { get; set; } = string.Empty;

    public List<LoadCurveSeries> Grandeur { get; set; } = [];
}

public class LoadCurvePeriod
{
    public DateOnly DateDebut { get; set; }

    public DateOnly DateFin { get; set; }
}
