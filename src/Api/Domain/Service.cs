namespace Bookings.Api.Domain;

/// <summary>Servicio ofrecido por el negocio (p. ej. "Corte de cabello").</summary>
public class Service
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Duración del servicio en minutos (siempre &gt; 0).</summary>
    public int DurationMinutes { get; set; }

    /// <summary>Precio con precisión decimal(10,2) (siempre &gt;= 0).</summary>
    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
