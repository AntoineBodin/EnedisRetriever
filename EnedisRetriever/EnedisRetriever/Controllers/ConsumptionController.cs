using EnedisRetriever.ConsoApi;
using EnedisRetriever.Domain;
using EnedisRetriever.Persistence;
using EnedisRetriever.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnedisRetriever.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumptionController(
    ConsumptionService consumptionService,
    ConsumptionRepository consumptionRepository) : ControllerBase
{
    private const int MaxRangeDays = 366;

    private readonly ConsumptionService _consumptionService = consumptionService;

    /// <summary>
    /// Describes what is already cached (per-day point counts), without calling consoAPI.
    /// </summary>
    [HttpGet("availability")]
    public async Task<ActionResult<ConsumptionAvailability>> GetAvailability(
        CancellationToken cancellationToken)
    {
        var days = await consumptionRepository.GetDailyAvailabilityAsync(
            cancellationToken);

        return Ok(new ConsumptionAvailability
        {
            FirstDay = days.Count > 0 ? days[0].Date : null,
            LastDay = days.Count > 0 ? days[^1].Date : null,
            TotalPoints = days.Sum(day => day.Points),
            Days = days
        });
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

        // Each missing week costs one consoAPI call: a mistyped year must not
        // turn into hundreds of requests to Enedis.
        if (end.DayNumber - start.DayNumber > MaxRangeDays)
        {
            return BadRequest($"The period cannot exceed {MaxRangeDays} days.");
        }

        try
        {
            var result = await _consumptionService.GetConsumptionAsync(
                start,
                end,
                cancellationToken);

            return Ok(result);
        }
        catch (ConsoApiException exception)
        {
            return Problem(
                title: "Conso API request failed.",
                detail: $"Conso API returned {(int)exception.StatusCode} ({exception.StatusCode}).",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }
}