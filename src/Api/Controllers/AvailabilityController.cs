using Bookings.Api.Dtos;
using Bookings.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookings.Api.Controllers;

[Route("api/availability")]
public sealed class AvailabilityController(AvailabilityService availability) : ApiControllerBase
{
    /// <summary>Cabecera con el estado del día: Open, Closed o Past.</summary>
    public const string DayStatusHeader = "X-Day-Status";

    /// <summary>
    /// Devuelve los huecos libres de un servicio para una fecha (hora local del negocio).
    /// La cabecera <c>X-Day-Status</c> indica si el día está abierto, cerrado o ya pasó.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<IEnumerable<TimeSlotDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiError>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiError>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<TimeSlotDto>>> Get(
        [FromQuery] int serviceId,
        [FromQuery] string? date,
        CancellationToken ct)
    {
        if (!TryParseDate(date, out var day))
        {
            return InvalidDate();
        }

        var result = await availability.GetAvailabilityAsync(serviceId, day, ct);
        if (result is null)
        {
            return Error(StatusCodes.Status404NotFound, "El servicio no existe o no está disponible.");
        }

        Response.Headers[DayStatusHeader] = result.DayStatus.ToString();
        return Ok(result.Slots);
    }
}
