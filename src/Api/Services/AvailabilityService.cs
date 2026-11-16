using Bookings.Api.Data;
using Bookings.Api.Domain;
using Bookings.Api.Dtos;
using Bookings.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Bookings.Api.Services;

public sealed record AvailabilityResult(DayStatus DayStatus, IReadOnlyList<TimeSlotDto> Slots);

/// <summary>Cálculo de disponibilidad y detección de solapamientos.</summary>
public sealed class AvailabilityService(BookingsDbContext db, IBusinessClock clock, IOptions<BusinessOptions> options)
{
    private readonly BusinessOptions _options = options.Value;

    /// <returns><c>null</c> si el servicio no existe o está inactivo.</returns>
    public async Task<AvailabilityResult?> GetAvailabilityAsync(int serviceId, DateOnly date, CancellationToken ct)
    {
        var service = await db.Services.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.IsActive, ct);
        if (service is null)
        {
            return null;
        }

        if (date < clock.Today)
        {
            return new AvailabilityResult(DayStatus.Past, []);
        }

        var hours = await db.BusinessHours.AsNoTracking()
            .FirstOrDefaultAsync(h => h.DayOfWeek == date.DayOfWeek, ct);
        if (hours is null || hours.IsClosed)
        {
            return new AvailabilityResult(DayStatus.Closed, []);
        }

        var (dayStartUtc, dayEndUtc) = clock.GetUtcRange(date);
        var existing = await GetConfirmedBookingsAsync(serviceId, dayStartUtc, dayEndUtc, ct);

        var duration = TimeSpan.FromMinutes(service.DurationMinutes);
        var step = TimeSpan.FromMinutes(_options.SlotIntervalMinutes > 0 ? _options.SlotIntervalMinutes : service.DurationMinutes);
        var open = hours.OpenTime.ToTimeSpan();
        var close = hours.CloseTime.ToTimeSpan();
        var nowUtc = clock.UtcNow;
        var slots = new List<TimeSlotDto>();

        // Bloques candidatos: [slotStart, slotStart + duración] mientras quepan antes del cierre.
        for (var offset = open; offset + duration <= close; offset += step)
        {
            var localStart = TimeOnly.FromTimeSpan(offset);
            if (!clock.IsValidLocalTime(date, localStart))
            {
                continue;
            }

            var slotStart = clock.ToUtc(date, localStart);
            var slotEnd = slotStart + duration;

            // Descarta horarios que ya pasaron (relevante si la fecha es hoy).
            if (slotStart <= nowUtc)
            {
                continue;
            }

            if (existing.Any(b => Overlaps(slotStart, slotEnd, b.StartAt, b.EndAt)))
            {
                continue;
            }

            var startLabel = localStart.ToString("HH:mm");
            var endLabel = clock.ToLocal(slotEnd).ToString("HH:mm");
            slots.Add(new TimeSlotDto(slotStart, slotEnd, startLabel, endLabel, $"{startLabel} - {endLabel}"));
        }

        return new AvailabilityResult(DayStatus.Open, slots);
    }

    /// <summary>¿Existe alguna reserva confirmada que se solape con el intervalo [startUtc, endUtc)?</summary>
    public Task<bool> HasConflictAsync(int serviceId, DateTime startUtc, DateTime endUtc, CancellationToken ct) =>
        ConfirmedBookings(serviceId)
            .AnyAsync(b => startUtc < b.EndAt && endUtc > b.StartAt, ct);

    /// <summary>Condición estándar de intersección de intervalos semiabiertos.</summary>
    public static bool Overlaps(DateTime startA, DateTime endA, DateTime startB, DateTime endB) =>
        startA < endB && endA > startB;

    private async Task<List<(DateTime StartAt, DateTime EndAt)>> GetConfirmedBookingsAsync(
        int serviceId, DateTime fromUtc, DateTime toUtc, CancellationToken ct)
    {
        var rows = await ConfirmedBookings(serviceId)
            .Where(b => b.StartAt < toUtc && b.EndAt > fromUtc)
            .Select(b => new { b.StartAt, b.EndAt })
            .ToListAsync(ct);

        return rows.Select(r => (r.StartAt, r.EndAt)).ToList();
    }

    private IQueryable<Booking> ConfirmedBookings(int serviceId)
    {
        var query = db.Bookings.AsNoTracking().Where(b => b.Status == BookingStatus.Confirmed);
        return _options.SharedSchedule ? query : query.Where(b => b.ServiceId == serviceId);
    }
}
