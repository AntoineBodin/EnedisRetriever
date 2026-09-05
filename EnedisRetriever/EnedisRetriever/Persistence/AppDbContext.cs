using EnedisRetriever.Domain;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace EnedisRetriever.Persistence;

public class AppDbContext : DbContext
{
    public DbSet<ConsumptionPoint> ConsumptionPoints => Set<ConsumptionPoint>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConsumptionPoint>(entity =>
        {
            entity.HasKey(point => point.Id);

            entity.Property(point => point.Timestamp)
                .HasColumnType("timestamp without time zone")
                .IsRequired();

            entity.Property(point => point.PowerWatts)
                .HasPrecision(12, 3);

            entity.Property(point => point.EnergyKwh)
                .HasPrecision(12, 6);

            entity.HasIndex(point => point.Timestamp)
                .IsUnique();
        });
    }
}