using Bookings.Api.Data;
using Bookings.Api.Dtos;
using Bookings.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookings.Api.Controllers;

[Route("api/services")]
public sealed class ServicesController(BookingsDbContext db) : ApiControllerBase
{
    /// <summary>Lista los servicios activos.</summary>
    [HttpGet]
    [ProducesResponseType<IEnumerable<ServiceDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetActive(CancellationToken ct)
    {
        var services = await db.Services.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Id)
            .ToListAsync(ct);

        return Ok(services.Select(BookingMapper.ToDto));
    }
}
