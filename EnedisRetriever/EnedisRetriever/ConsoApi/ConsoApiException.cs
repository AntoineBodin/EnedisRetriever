using System.Net;

namespace EnedisRetriever.ConsoApi;

/// <summary>
/// Raised when consoAPI answers with a non-success status code.
/// 400: invalid request (do not retry), 401: invalid token or PRM not allowed,
/// 5xx: Enedis or consoAPI error (retry later).
/// </summary>
public class ConsoApiException(HttpStatusCode statusCode, string responseBody)
    : Exception($"Conso API returned {(int)statusCode} ({statusCode}): {responseBody}")
{
    public HttpStatusCode StatusCode { get; } = statusCode;

    public string ResponseBody { get; } = responseBody;
}
