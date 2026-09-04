using EnedisRetriever.ConsoApi.Json;
using EnedisRetriever.ConsoApi.Models;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text.Json;

namespace EnedisRetriever.ConsoApi;

public class ConsoApiClient
{
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
            $"consumption_load_curve" +
            $"?prm={Uri.EscapeDataString(_options.Prm)}" +
            $"&start={start:yyyy-MM-dd}" +
            $"&end={end:yyyy-MM-dd}";

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            url);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.Token);

        request.Headers.UserAgent.ParseAdd("EnedisRetriever");

        using var response = await _httpClient.SendAsync(
            request,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync(
            cancellationToken);

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        jsonOptions.Converters.Add(new ConsoApiDateTimeConverter());

        return JsonSerializer.Deserialize<ConsumptionLoadCurve>(
            content,
            jsonOptions)
            ?? throw new InvalidOperationException(
                "Conso API returned an empty response.");
    }
}