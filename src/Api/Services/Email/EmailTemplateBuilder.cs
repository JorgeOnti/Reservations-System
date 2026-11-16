using System.Globalization;
using System.Net;
using System.Text;
using Bookings.Api.Domain;
using Bookings.Api.Options;
using Microsoft.Extensions.Options;

namespace Bookings.Api.Services.Email;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(Booking booking, CancellationToken cancellationToken = default);

    Task SendBookingCancellationAsync(Booking booking, CancellationToken cancellationToken = default);
}

public sealed record EmailMessage(string To, string Subject, string TextBody, string HtmlBody, string? CancelUrl);

/// <summary>Genera el contenido (texto plano + HTML) de los correos transaccionales.</summary>
public sealed class EmailTemplateBuilder(IBusinessClock clock, BookingMapper mapper, IOptions<BusinessOptions> business)
{
    private static readonly CultureInfo Culture = CultureInfo.GetCultureInfo("es-MX");

    private readonly string _businessName = business.Value.Name;

    public EmailMessage BuildConfirmation(Booking booking)
    {
        var details = GetDetails(booking);
        var cancelUrl = mapper.BuildCancelUrl(booking);
        var subject = $"Reserva confirmada: {details.Service} el {details.Date} a las {details.Start}";

        var text = new StringBuilder()
            .AppendLine($"Hola {booking.CustomerName},")
            .AppendLine()
            .AppendLine($"Tu reserva en {_businessName} está confirmada.")
            .AppendLine()
            .AppendLine($"  Servicio: {details.Service}")
            .AppendLine($"  Fecha:    {details.Date}")
            .AppendLine($"  Horario:  {details.Start} - {details.End}")
            .AppendLine($"  Precio:   {details.Price}")
            .AppendLine($"  Folio:    {booking.Id}")
            .AppendLine()
            .AppendLine("Si necesitas cancelar, usa este enlace:")
            .AppendLine(cancelUrl)
            .AppendLine()
            .AppendLine("¡Te esperamos!")
            .ToString();

        var html = $"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#0f172a">
              <h2 style="color:#4f46e5">¡Reserva confirmada!</h2>
              <p>Hola <strong>{Encode(booking.CustomerName)}</strong>, tu reserva en {Encode(_businessName)} está confirmada.</p>
              <table style="border-collapse:collapse;width:100%">
                <tr><td style="padding:6px 0;color:#64748b">Servicio</td><td><strong>{Encode(details.Service)}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Fecha</td><td>{Encode(details.Date)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Horario</td><td>{details.Start} - {details.End}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Precio</td><td>{Encode(details.Price)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Folio</td><td style="font-family:monospace">{booking.Id}</td></tr>
              </table>
              <p style="margin-top:24px">¿No puedes asistir?</p>
              <p><a href="{Encode(cancelUrl)}" style="background:#e11d48;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Cancelar mi reserva</a></p>
              <p style="font-size:12px;color:#64748b">O copia este enlace en tu navegador: {Encode(cancelUrl)}</p>
            </div>
            """;

        return new EmailMessage(booking.CustomerEmail, subject, text, html, cancelUrl);
    }

    public EmailMessage BuildCancellation(Booking booking)
    {
        var details = GetDetails(booking);
        var subject = $"Reserva cancelada: {details.Service} el {details.Date}";

        var text = new StringBuilder()
            .AppendLine($"Hola {booking.CustomerName},")
            .AppendLine()
            .AppendLine($"Tu reserva de {details.Service} del {details.Date} a las {details.Start} ha sido cancelada.")
            .AppendLine($"Folio: {booking.Id}")
            .ToString();

        var html = $"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#0f172a">
              <h2 style="color:#e11d48">Reserva cancelada</h2>
              <p>Hola <strong>{Encode(booking.CustomerName)}</strong>, tu reserva de <strong>{Encode(details.Service)}</strong>
              del {Encode(details.Date)} a las {details.Start} ha sido cancelada.</p>
              <p style="font-size:12px;color:#64748b">Folio: {booking.Id}</p>
            </div>
            """;

        return new EmailMessage(booking.CustomerEmail, subject, text, html, null);
    }

    private (string Service, string Date, string Start, string End, string Price) GetDetails(Booking booking)
    {
        var service = booking.Service
            ?? throw new InvalidOperationException("La reserva debe cargarse con su servicio asociado.");
        var start = clock.ToLocal(booking.StartAt);
        var end = clock.ToLocal(booking.EndAt);

        return (
            service.Name,
            start.ToString("dddd d 'de' MMMM 'de' yyyy", Culture),
            start.ToString("HH:mm", Culture),
            end.ToString("HH:mm", Culture),
            service.Price.ToString("C", Culture));
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);
}
