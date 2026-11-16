using Bookings.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Bookings.Api.Data;

public class BookingsDbContext(DbContextOptions<BookingsDbContext> options) : DbContext(options)
{
    public DbSet<Service> Services => Set<Service>();

    public DbSet<BusinessHours> BusinessHours => Set<BusinessHours>();

    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQLite no guarda el "Kind" de DateTime: forzamos UTC al escribir y al leer.
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>(entity =>
        {
            entity.Property(s => s.Name).IsRequired().HasMaxLength(120);
            entity.Property(s => s.Price).HasPrecision(10, 2);
            entity.ToTable(t => t.HasCheckConstraint("CK_Services_DurationMinutes", "\"DurationMinutes\" > 0"));
        });

        modelBuilder.Entity<BusinessHours>(entity =>
        {
            entity.HasIndex(h => h.DayOfWeek).IsUnique();
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.Property(b => b.CustomerName).IsRequired().HasMaxLength(100);
            entity.Property(b => b.CustomerEmail).IsRequired().HasMaxLength(254);
            entity.Property(b => b.CustomerPhone).IsRequired().HasMaxLength(20);
            entity.Property(b => b.CancelToken).IsRequired().HasMaxLength(64);
            entity.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasIndex(b => b.CancelToken).IsUnique();
            entity.HasIndex(b => new { b.StartAt, b.EndAt });
            entity.HasIndex(b => new { b.ServiceId, b.StartAt });

            entity.HasOne(b => b.Service)
                .WithMany(s => s.Bookings)
                .HasForeignKey(b => b.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
