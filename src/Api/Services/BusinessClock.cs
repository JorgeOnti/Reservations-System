using Bookings.Api.Options;
using Microsoft.Extensions.Options;

namespace Bookings.Api.Services;

/// <summary>Conversión entre la hora local del negocio y UTC.</summary>
public interface IBusinessClock
{
    TimeZoneInfo TimeZone { get; }

    DateTime UtcNow { get; }

    DateOnly Today { get; }

    bool IsValidLocalTime(DateOnly date, TimeOnly time);

    DateTime ToUtc(DateOnly date, TimeOnly time);

    DateTime ToLocal(DateTime utc);

    /// <summary>Rango [inicio, fin) en UTC que cubre el día local indicado.</summary>
    (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly date);
}

public sealed class BusinessClock : IBusinessClock
{
    private readonly TimeProvider _timeProvider;

    public BusinessClock(IOptions<BusinessOptions> options, TimeProvider timeProvider, ILogger<BusinessClock> logger)
    {
        _timeProvider = timeProvider;
        TimeZone = ResolveTimeZone(options.Value.TimeZone, logger);
        logger.LogInformation("Zona horaria del negocio: {TimeZone}", TimeZone.Id);
    }

    public TimeZoneInfo TimeZone { get; }

    public DateTime UtcNow => _timeProvider.GetUtcNow().UtcDateTime;

    public DateOnly Today => DateOnly.FromDateTime(ToLocal(UtcNow));

    public bool IsValidLocalTime(DateOnly date, TimeOnly time) =>
        !TimeZone.IsInvalidTime(date.ToDateTime(time, DateTimeKind.Unspecified));

    public DateTime ToUtc(DateOnly date, TimeOnly time) =>
        TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(time, DateTimeKind.Unspecified), TimeZone);

    public DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), TimeZone);

    public (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly date) =>
        (StartOfDayUtc(date), StartOfDayUtc(date.AddDays(1)));

    private DateTime StartOfDayUtc(DateOnly date)
    {
        // En zonas con cambio de horario a medianoche, 00:00 puede no existir.
        var time = TimeOnly.MinValue;
        while (!IsValidLocalTime(date, time))
        {
            time = time.AddMinutes(30);
        }

        return ToUtc(date, time);
    }

    private static TimeZoneInfo ResolveTimeZone(string? id, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return TimeZoneInfo.Local;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            logger.LogWarning("Zona horaria '{TimeZone}' no encontrada; se usará la zona local del servidor.", id);
            return TimeZoneInfo.Local;
        }
    }
}
