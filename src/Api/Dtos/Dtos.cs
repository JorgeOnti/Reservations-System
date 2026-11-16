using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Bookings.Api.Domain;

namespace Bookings.Api.Dtos;

public sealed record ServiceDto(int Id, string Name, int DurationMinutes, decimal Price);

/// <summary>Hueco disponible. <c>StartAt</c>/<c>EndAt</c> en UTC; las horas formateadas en hora local del negocio.</summary>
public sealed record TimeSlotDto(DateTime StartAt, DateTime EndAt, string StartTime, string EndTime, string Label);

[JsonConverter(typeof(JsonStringEnumConverter<DayStatus>))]
public enum DayStatus
{
    Open,
    Closed,
    Past,
}

public sealed record BookingDto(
    Guid Id,
    int ServiceId,
    string ServiceName,
    int ServiceDurationMinutes,
    decimal ServicePrice,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    DateTime StartAt,
    DateTime EndAt,
    string LocalDate,
    string LocalStartTime,
    string LocalEndTime,
    BookingStatus Status,
    string CancelToken,
    string CancelUrl);

public sealed class CreateBookingRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Selecciona un servicio válido.")]
    public int ServiceId { get; set; }

    /// <summary>Inicio de la cita en formato ISO 8601 (idealmente en UTC, p. ej. "2026-11-17T15:00:00Z").</summary>
    [Required(ErrorMessage = "La fecha y hora de inicio es obligatoria.")]
    public DateTimeOffset? StartAt { get; set; }

    [Required(ErrorMessage = "El nombre completo es obligatorio.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
    public string? CustomerName { get; set; }

    [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
    [StringLength(254, ErrorMessage = "El correo electrónico es demasiado largo.")]
    [RegularExpression(@"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$", ErrorMessage = "El correo electrónico no tiene un formato válido.")]
    public string? CustomerEmail { get; set; }

    [Required(ErrorMessage = "El teléfono es obligatorio.")]
    [RegularExpression(@"^\+?[0-9\s\-().]{7,20}$", ErrorMessage = "El teléfono debe contener entre 7 y 20 dígitos (se permiten +, espacios, guiones y paréntesis).")]
    public string? CustomerPhone { get; set; }
}

public sealed class CancelBookingRequest
{
    public string? Token { get; set; }
}

public sealed record ApiError(string Message, IDictionary<string, string[]>? Errors = null);

public sealed record HealthDto(string Status, DateTime Timestamp);
