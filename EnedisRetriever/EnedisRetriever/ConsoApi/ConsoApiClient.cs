using EnedisRetriever.ConsoApi.Json;
using EnedisRetriever.ConsoApi.Models;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text.Json;

namespace EnedisRetriever.ConsoApi;

public class ConsoApiClient
{
    // consoAPI data type for the consumption load curve
    // (Enedis "Mesure synchrone V2"; replaces "consumption_load_curve").
    private const string LoadCurveType = "courbe_de_charge_consommation";

    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    private readonly HttpClient _httpClient;
    private readonly ConsoApiOptions _options;

    public ConsoApiClient(
        HttpClient httpClient,
        IOptions<ConsoApiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<ConsumptionLoadCurve> GetLoadCurveAsync(
        DateOnly start,
        DateOnly end,
        CancellationToken cancellationToken = default)
    {
        var url =
            $"{LoadCurveType}" +
            $"?pointId={Uri.EscapeDataString(_options.Prm)}" +
            $"&dateDebut={start:yyyy-MM-dd}" +
            $"&dateFin={end:yyyy-MM-dd}";

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.Token);

        request.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        request.Headers.UserAgent.ParseAdd("EnedisRetriever");

        using var response = await _httpClient.SendAsync(
            request,
            cancellationToken);

        var content = await response.Content.ReadAsStringAsync(
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ConsoApiException(response.StatusCode, content);
        }

        return Deserialize(content);
    }

    public static ConsumptionLoadCurve Deserialize(string content) =>
        JsonSerializer.Deserialize<ConsumptionLoadCurve>(content, JsonOptions)
        ?? throw new InvalidOperationException(
            "Conso API returned an empty response.");

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        options.Converters.Add(new ConsoApiDateTimeConverter());

        return options;
    }
}
