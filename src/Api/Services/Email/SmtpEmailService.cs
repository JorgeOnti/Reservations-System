using System.Net;
using System.Net.Mail;
using System.Text;
using Bookings.Api.Domain;
using Bookings.Api.Options;
using Microsoft.Extensions.Options;

namespace Bookings.Api.Services.Email;

/// <summary>Modo SMTP: envía correos reales usando la configuración de la sección <c>Smtp</c>.</summary>
public sealed class SmtpEmailService(
    IOptions<SmtpOptions> options,
    EmailTemplateBuilder templates,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    private readonly SmtpOptions _options = options.Value;

    public Task SendBookingConfirmationAsync(Booking booking, CancellationToken cancellationToken = default) =>
        SendAsync(templates.BuildConfirmation(booking), cancellationToken);

    public Task SendBookingCancellationAsync(Booking booking, CancellationToken cancellationToken = default) =>
        SendAsync(templates.BuildCancellation(booking), cancellationToken);

    private async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        try
        {
            using var mail = new MailMessage
            {
                From = new MailAddress(_options.From!, _options.FromName),
                Subject = message.Subject,
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                Body = message.TextBody,
                IsBodyHtml = false,
            };
            mail.To.Add(message.To);
            mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(message.HtmlBody, Encoding.UTF8, "text/html"));

            using var client = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
            };

            if (_options.HasCredentials)
            {
                client.Credentials = new NetworkCredential(_options.User, _options.Password);
            }

            await client.SendMailAsync(mail, cancellationToken);
            logger.LogInformation("Correo '{Subject}' enviado a {To} vía SMTP.", message.Subject, message.To);
        }
        catch (Exception ex) when (ex is SmtpException or InvalidOperationException or FormatException or IOException)
        {
            // Un fallo de correo nunca debe invalidar la reserva: registramos el error y el enlace para no perderlo.
            logger.LogError(
                ex,
                "No se pudo enviar el correo '{Subject}' a {To}. Enlace de cancelación: {CancelUrl}",
                message.Subject,
                message.To,
                message.CancelUrl ?? "(no aplica)");
        }
    }
}
