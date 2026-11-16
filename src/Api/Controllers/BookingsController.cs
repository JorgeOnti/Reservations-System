using Bookings.Api.Dtos;
using Bookings.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookings.Api.Controllers;

[Route("api/bookings")]
public sealed class BookingsController(BookingService bookings) : ApiControllerBase
{
    /// <summary>Reservas del día (hora local del negocio) ordenadas cronológicamente.</summary>
    [HttpGet]
    [ProducesResponseType<IEnumerable<BookingDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiError>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetByDate([FromQuery] string? date, CancellationToken ct)
    {
        if (!TryParseDate(date, out var day))
        {
            return InvalidDate();
        }

        return Ok(await bookings.GetByDateAsync(day, ct));
    }

    /// <summary>Crea una reserva validando horario laboral y ausencia de solapamientos.</summary>
    [HttpPost]
    [Consumes("application/json")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiError>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiError>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiError>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        var result = await bookings.CreateAsync(request, ct);
        if (result.Status != OperationStatus.Success)
        {
            return FromFailure(result);
        }

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    /// <summary>Cancela una reserva. El token puede enviarse en el body (<c>{ "token": "..." }</c>) o en la query.</summary>
    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiError>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiError>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiError>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ApiError>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingDto>> Cancel(
        Guid id,
        [FromBody] CancelBookingRequest? body,
        [FromQuery] string? token,
        CancellationToken ct)
    {
        var result = await bookings.CancelAsync(id, body?.Token ?? token, ct);
        if (result.Status != OperationStatus.Success)
        {
            return FromFailure(result);
        }

        return Ok(result.Value);
    }
}
