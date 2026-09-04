using EnedisRetriever.Domain;
using EnedisRetriever.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnedisRetriever.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumptionController : ControllerBase
{
    private readonly ConsumptionService _consumptionService;
    private readonly ConsumptionAggregationService _aggregationService;

    public ConsumptionController(ConsumptionService consumptionService, ConsumptionAggregationService aggregationService)
    {
        _consumptionService = consumptionService;
        _aggregationService = aggregationService;
    }

    [HttpGet("aggregate")]
    public async Task<IActionResult> GetAggregate(
    [FromQuery] DateOnly start,
    [FromQuery] DateOnly end,
    [FromQuery] ConsumptionGranularity granularity,
    CancellationToken cancellationToken)
    {
        if (start >= end)
        {
            return BadRequest("The start date must be before the end date.");
        }
        var points = await _consumptionService.GetConsumptionAsync(
            start,
            end,
            cancellationToken);

        var result = _aggregationService.Aggregate(
            points,
            granularity);

        return Ok(result);
    }

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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end,
        CancellationToken cancellationToken)
    {
        if (start >= end)
        {
            return BadRequest("The start date must be before the end date.");
        }
        var result = await _consumptionService.GetConsumptionSummaryAsync(
            start,
            end,
            cancellationToken);

        return Ok(result);
    }
}