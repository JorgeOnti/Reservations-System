using Bookings.Api.Domain;

namespace Bookings.Api.Services.Email;

/// <summary>
/// Modo fallback: cuando no hay SMTP configurado, el correo completo (incluido el enlace de cancelación)
/// se escribe en el log de la consola para poder probar el flujo de punta a punta.
/// </summary>
public sealed class LoggingEmailService(EmailTemplateBuilder templates, ILogger<LoggingEmailService> logger) : IEmailService
{
    public Task SendBookingConfirmationAsync(Booking booking, CancellationToken cancellationToken = default)
    {
        Log(templates.BuildConfirmation(booking));
        return Task.CompletedTask;
    }

    public Task SendBookingCancellationAsync(Booking booking, CancellationToken cancellationToken = default)
    {
        Log(templates.BuildCancellation(booking));
        return Task.CompletedTask;
    }

    private void Log(EmailMessage message)
    {
        logger.LogInformation(
            """
            [EMAIL - modo consola] SMTP no configurado; el correo no se envió.
            ------------------------------------------------------------
            Para:    {To}
            Asunto:  {Subject}
            ------------------------------------------------------------
            {Body}
            ------------------------------------------------------------
            Enlace de cancelación: {CancelUrl}
            """,
            message.To,
            message.Subject,
            message.TextBody.TrimEnd(),
            message.CancelUrl ?? "(no aplica)");
    }
}
