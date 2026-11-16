using Bookings.Api.Domain;
using Bookings.Api.Dtos;
using Bookings.Api.Options;
using Microsoft.Extensions.Options;

namespace Bookings.Api.Services;

/// <summary>Construye enlaces y DTOs de reserva con horas locales del negocio.</summary>
public sealed class BookingMapper(IBusinessClock clock, IOptions<FrontendOptions> frontend)
{
    private readonly string _frontendBaseUrl = frontend.Value.BaseUrl.TrimEnd('/');

    public string BuildCancelUrl(Booking booking) =>
        $"{_frontendBaseUrl}/cancel/{booking.Id}?token={Uri.EscapeDataString(booking.CancelToken)}";

    public BookingDto ToDto(Booking booking)
    {
        var service = booking.Service
            ?? throw new InvalidOperationException("La reserva debe cargarse con su servicio asociado.");
        var localStart = clock.ToLocal(booking.StartAt);
        var localEnd = clock.ToLocal(booking.EndAt);

        return new BookingDto(
            booking.Id,
            service.Id,
            service.Name,
            service.DurationMinutes,
            service.Price,
            booking.CustomerName,
            booking.CustomerEmail,
            booking.CustomerPhone,
            booking.StartAt,
            booking.EndAt,
            localStart.ToString("yyyy-MM-dd"),
            localStart.ToString("HH:mm"),
            localEnd.ToString("HH:mm"),
            booking.Status,
            booking.CancelToken,
            BuildCancelUrl(booking));
    }

    public static ServiceDto ToDto(Service service) =>
        new(service.Id, service.Name, service.DurationMinutes, service.Price);
}
