using System.Globalization;
using Bookings.Api.Dtos;
using Bookings.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookings.Api.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected static bool TryParseDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    protected ObjectResult Error(int statusCode, string message) =>
        StatusCode(statusCode, new ApiError(message));

    protected ObjectResult InvalidDate() =>
        Error(StatusCodes.Status400BadRequest, "El parámetro 'date' es obligatorio y debe tener el formato YYYY-MM-DD.");

    protected ActionResult FromFailure<T>(OperationResult<T> result) => result.Status switch
    {
        OperationStatus.NotFound => Error(StatusCodes.Status404NotFound, result.Error!),
        OperationStatus.Forbidden => Error(StatusCodes.Status403Forbidden, result.Error!),
        OperationStatus.Conflict => Error(StatusCodes.Status409Conflict, result.Error!),
        _ => Error(StatusCodes.Status400BadRequest, result.Error ?? "Solicitud inválida."),
    };
}
