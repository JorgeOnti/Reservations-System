namespace Bookings.Api.Domain;

/// <summary>
/// Horario laboral para un día de la semana. Las horas están expresadas en la hora local
/// del negocio (ver <c>Business:TimeZone</c> en la configuración).
/// </summary>
public class BusinessHours
{
    public int Id { get; set; }

    /// <summary>0 = Domingo ... 6 = Sábado.</summary>
    public DayOfWeek DayOfWeek { get; set; }

    public TimeOnly OpenTime { get; set; }

    public TimeOnly CloseTime { get; set; }

    public bool IsClosed { get; set; }
}
