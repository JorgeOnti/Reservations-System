using System.Security.Cryptography;
using System.Text;
using Bookings.Api.Data;
using Bookings.Api.Domain;
using Bookings.Api.Dtos;
using Bookings.Api.Services.Email;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace Bookings.Api.Services;

public enum OperationStatus
{
    Success,
    NotFound,
    Invalid,
    Forbidden,
    Conflict,
}

public sealed record OperationResult<T>(OperationStatus Status, T? Value, string? Error)
{
    public static OperationResult<T> Ok(T value) => new(OperationStatus.Success, value, null);

    public static OperationResult<T> Fail(OperationStatus status, string error) => new(status, default, error);
}

public sealed class BookingService(
    BookingsDbContext db,
    AvailabilityService availability,
    IBusinessClock clock,
    BookingMapper mapper,
    IEmailService emailService,
    ILogger<BookingService> logger)
{
    /// <summary>
    /// Serializa la sección crítica "verificar disponibilidad + insertar" dentro del proceso.
    /// Junto con la transacción (BEGIN IMMEDIATE en SQLite) garantiza que dos solicitudes
    /// simultáneas no puedan reservar el mismo hueco.
    /// </summary>
    private static readonly SemaphoreSlim BookingGate = new(1, 1);

    public async Task<IReadOnlyList<BookingDto>> GetByDateAsync(DateOnly date, CancellationToken ct)
    {
        var (fromUtc, toUtc) = clock.GetUtcRange(date);
        var bookings = await db.Bookings.AsNoTracking()
            .Include(b => b.Service)
            .Where(b => b.StartAt >= fromUtc && b.StartAt < toUtc)
            .OrderBy(b => b.StartAt)
            .ToListAsync(ct);

        return bookings.Select(mapper.ToDto).ToList();
    }

    public async Task<OperationResult<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct)
    {
        var name = request.CustomerName!.Trim();
        var email = request.CustomerEmail!.Trim();
        var phone = request.CustomerPhone!.Trim();

        if (phone.Count(char.IsAsciiDigit) < 7)
        {
            return Fail(OperationStatus.Invalid, "El teléfono debe contener al menos 7 dígitos.");
        }

        var service = await db.Services.FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.IsActive, ct);
        if (service is null)
        {
            return Fail(OperationStatus.NotFound, "El servicio seleccionado no existe o no está disponible.");
        }

        // Normalizamos a UTC y al minuto exacto.
        var requested = request.StartAt!.Value.UtcDateTime;
        var startUtc = new DateTime(requested.Ticks - (requested.Ticks % TimeSpan.TicksPerMinute), DateTimeKind.Utc);
        var endUtc = startUtc.AddMinutes(service.DurationMinutes);

        if (startUtc <= clock.UtcNow)
        {
            return Fail(OperationStatus.Invalid, "No es posible reservar un horario que ya pasó.");
        }

        var localStart = clock.ToLocal(startUtc);
        var localEnd = clock.ToLocal(endUtc);
        var localDate = DateOnly.FromDateTime(localStart);

        var hours = await db.BusinessHours.AsNoTracking()
            .FirstOrDefaultAsync(h => h.DayOfWeek == localDate.DayOfWeek, ct);
        if (hours is null || hours.IsClosed)
        {
            return Fail(OperationStatus.Invalid, "El negocio está cerrado el día seleccionado.");
        }

        var withinHours = DateOnly.FromDateTime(localEnd) == localDate
            && TimeOnly.FromDateTime(localStart) >= hours.OpenTime
            && TimeOnly.FromDateTime(localEnd) <= hours.CloseTime;
        if (!withinHours)
        {
            return Fail(
                OperationStatus.Invalid,
                $"El horario solicitado está fuera del horario de atención ({hours.OpenTime:HH\\:mm} - {hours.CloseTime:HH\\:mm}).");
        }

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            Service = service,
            CustomerName = name,
            CustomerEmail = email,
            CustomerPhone = phone,
            StartAt = startUtc,
            EndAt = endUtc,
            Status = BookingStatus.Confirmed,
            CancelToken = GenerateCancelToken(),
            CreatedAt = clock.UtcNow,
        };

        await BookingGate.WaitAsync(ct);
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            if (await availability.HasConflictAsync(service.Id, startUtc, endUtc, ct))
            {
                return Fail(
                    OperationStatus.Conflict,
                    $"El horario de las {localStart:HH:mm} para \"{service.Name}\" ya fue reservado por otra persona. Por favor elige otro horario.");
            }

            db.Bookings.Add(booking);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        finally
        {
            BookingGate.Release();
        }

        logger.LogInformation(
            "Reserva {BookingId} creada: {Service} {Start:u} para {Customer}.",
            booking.Id, service.Name, booking.StartAt, booking.CustomerName);

        await NotifyAsync(() => emailService.SendBookingConfirmationAsync(booking, ct), booking.Id);

        return OperationResult<BookingDto>.Ok(mapper.ToDto(booking));
    }

    public async Task<OperationResult<BookingDto>> CancelAsync(Guid id, string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Fail(OperationStatus.Invalid, "Se requiere el token de cancelación.");
        }

        var booking = await db.Bookings.Include(b => b.Service).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null)
        {
            return Fail(OperationStatus.NotFound, "La reserva no existe.");
        }

        if (!TokensMatch(booking.CancelToken, token))
        {
            return Fail(OperationStatus.Forbidden, "El token de cancelación no es válido para esta reserva.");
        }

        if (booking.Status == BookingStatus.Cancelled)
        {
            return Fail(OperationStatus.Conflict, "Esta reserva ya había sido cancelada.");
        }

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Reserva {BookingId} cancelada; el horario vuelve a estar disponible.", booking.Id);

        await NotifyAsync(() => emailService.SendBookingCancellationAsync(booking, ct), booking.Id);

        return OperationResult<BookingDto>.Ok(mapper.ToDto(booking));
    }

    private async Task NotifyAsync(Func<Task> send, Guid bookingId)
    {
        try
        {
            await send();
        }
        catch (Exception ex)
        {
            // El correo es "best effort": la reserva ya está persistida.
            logger.LogError(ex, "Error al notificar por correo la reserva {BookingId}.", bookingId);
        }
    }

    private static string GenerateCancelToken() =>
        WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static bool TokensMatch(string expected, string provided) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(provided));

    private static OperationResult<BookingDto> Fail(OperationStatus status, string message) =>
        OperationResult<BookingDto>.Fail(status, message);
}
