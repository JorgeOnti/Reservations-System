using Bookings.Api.Domain;

namespace Bookings.Api.Data;

/// <summary>Datos iniciales para que el flujo funcione sin tocar la base de datos manualmente.</summary>
public static class DbSeeder
{
    public static void Seed(BookingsDbContext db, ILogger logger)
    {
        var changed = false;

        if (!db.Services.Any())
        {
            db.Services.AddRange(
                new Service { Name = "Corte de cabello", DurationMinutes = 30, Price = 250.00m },
                new Service { Name = "Arreglo de barba", DurationMinutes = 30, Price = 180.00m },
                new Service { Name = "Corte + barba", DurationMinutes = 60, Price = 400.00m },
                new Service { Name = "Tratamiento facial", DurationMinutes = 45, Price = 350.00m });
            changed = true;
        }

        if (!db.BusinessHours.Any())
        {
            var open = new TimeOnly(9, 0);
            db.BusinessHours.AddRange(
                new BusinessHours { DayOfWeek = DayOfWeek.Sunday, OpenTime = open, CloseTime = open, IsClosed = true },
                new BusinessHours { DayOfWeek = DayOfWeek.Monday, OpenTime = open, CloseTime = new TimeOnly(18, 0) },
                new BusinessHours { DayOfWeek = DayOfWeek.Tuesday, OpenTime = open, CloseTime = new TimeOnly(18, 0) },
                new BusinessHours { DayOfWeek = DayOfWeek.Wednesday, OpenTime = open, CloseTime = new TimeOnly(18, 0) },
                new BusinessHours { DayOfWeek = DayOfWeek.Thursday, OpenTime = open, CloseTime = new TimeOnly(18, 0) },
                new BusinessHours { DayOfWeek = DayOfWeek.Friday, OpenTime = open, CloseTime = new TimeOnly(18, 0) },
                new BusinessHours { DayOfWeek = DayOfWeek.Saturday, OpenTime = open, CloseTime = new TimeOnly(14, 0) });
            changed = true;
        }

        if (changed)
        {
            db.SaveChanges();
            logger.LogInformation("Base de datos inicializada con servicios y horarios de ejemplo.");
        }
    }
}
