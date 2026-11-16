namespace Bookings.Api.Domain;

public enum BookingStatus
{
    Confirmed,
    Cancelled,
}

/// <summary>Reserva de un cliente. <see cref="StartAt"/> y <see cref="EndAt"/> se almacenan en UTC.</summary>
public class Booking
{
    public Guid Id { get; set; }

    public int ServiceId { get; set; }

    public Service? Service { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    public DateTime EndAt { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;

    /// <summary>Token criptográficamente seguro requerido para cancelar la reserva.</summary>
    public string CancelToken { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? CancelledAt { get; set; }
}
