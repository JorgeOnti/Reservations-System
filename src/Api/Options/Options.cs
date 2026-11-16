namespace Bookings.Api.Options;

public sealed class BusinessOptions
{
    public const string SectionName = "Business";

    /// <summary>Nombre comercial mostrado en los correos.</summary>
    public string Name { get; set; } = "Mi Negocio";

    /// <summary>
    /// Zona horaria del negocio (IANA o Windows, p. ej. "America/Mexico_City").
    /// Vacío = zona horaria local del servidor.
    /// </summary>
    public string? TimeZone { get; set; }

    /// <summary>Intervalo entre bloques candidatos. 0 = usar la duración del servicio.</summary>
    public int SlotIntervalMinutes { get; set; } = 30;

    /// <summary>
    /// false (por defecto): los solapamientos se evalúan por servicio.
    /// true: el negocio tiene un único recurso y cualquier reserva bloquea el horario para todos los servicios.
    /// </summary>
    public bool SharedSchedule { get; set; }
}

public sealed class FrontendOptions
{
    public const string SectionName = "Frontend";

    public string BaseUrl { get; set; } = "http://localhost:5173";
}

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string? Host { get; set; }

    public int Port { get; set; } = 587;

    public string? User { get; set; }

    public string? Password { get; set; }

    public string? From { get; set; }

    public string? FromName { get; set; }

    public bool EnableSsl { get; set; } = true;

    /// <summary>El modo SMTP se activa si hay Host y remitente configurados.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(From);

    public bool HasCredentials => !string.IsNullOrWhiteSpace(User) && !string.IsNullOrWhiteSpace(Password);
}
