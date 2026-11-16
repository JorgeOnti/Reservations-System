using Bookings.Api.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Bookings.Api.Controllers;

[Route("api/health")]
public sealed class HealthController(TimeProvider timeProvider) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthDto>(StatusCodes.Status200OK)]
    public ActionResult<HealthDto> Get() =>
        Ok(new HealthDto("Healthy", timeProvider.GetUtcNow().UtcDateTime));
}
