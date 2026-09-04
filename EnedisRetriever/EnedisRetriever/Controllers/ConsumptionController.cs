using EnedisRetriever.ConsoApi;
using Microsoft.AspNetCore.Mvc;

namespace EnedisRetriever.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumptionController : ControllerBase
{
    private readonly ConsoApiClient _consoApiClient;

    public ConsumptionController(ConsoApiClient consoApiClient)
    {
        _consoApiClient = consoApiClient;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end,
        CancellationToken cancellationToken)
    {
        var result = await _consoApiClient.GetLoadCurveAsync(
            start,
            end,
            cancellationToken);

        return Ok(result);
    }
}