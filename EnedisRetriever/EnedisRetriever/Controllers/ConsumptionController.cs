using EnedisRetriever.Domain;
using EnedisRetriever.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnedisRetriever.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumptionController(ConsumptionService consumptionService) : ControllerBase
{
    private readonly ConsumptionService _consumptionService = consumptionService;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end,
        CancellationToken cancellationToken)
    {
        if (start >= end)
        {
            return BadRequest("The start date must be before the end date.");
        }
        var result = await _consumptionService.GetConsumptionAsync(
            start,
            end,
            cancellationToken);

        return Ok(result);
    }
}