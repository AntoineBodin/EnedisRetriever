using EnedisRetriever.Configuration;
using EnedisRetriever.ConsoApi;
using EnedisRetriever.Domain;
using EnedisRetriever.Persistence;
using EnedisRetriever.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EnedisRetriever
{
    public class Program
    {
        public static void Main(string[] args)
        {
            EnvLoader.Load();

            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddScoped<ConsumptionService>();
            builder.Services.AddScoped<ConsumptionAggregationService>();
            builder.Services
                .Configure<ConsoApiOptions>(options =>
                {
                    options.BaseUrl =
                        builder.Configuration["ConsoApi:BaseUrl"]
                        ?? throw new InvalidOperationException(
                            "ConsoApi:BaseUrl is not configured.");

                    options.Token =
                        Environment.GetEnvironmentVariable("CONSO_API_TOKEN")
                        ?? throw new InvalidOperationException(
                            "CONSO_API_TOKEN is not configured.");

                    options.Prm =
                        Environment.GetEnvironmentVariable("CONSO_API_PRM")
                        ?? throw new InvalidOperationException(
                            "CONSO_API_PRM is not configured.");
                });
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    policy
                        .WithOrigins("http://localhost:5173")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });
            builder.Services.AddHttpClient<ConsoApiClient>((serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<ConsoApiOptions>>()
                    .Value;

                client.BaseAddress = new Uri(options.BaseUrl);
            });

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(
                    builder.Configuration.GetConnectionString("DefaultConnection")));
            builder.Services.AddScoped<ConsumptionRepository>();

            var app = builder.Build();

            //app.UseHttpsRedirection();

            app.UseCors("Frontend");

            app.MapControllers();

            app.Run();
        }
    }
}
