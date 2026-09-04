using EnedisRetriever.Configuration;
using EnedisRetriever.ConsoApi;
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

            builder.Services.AddHttpClient<ConsoApiClient>((serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<ConsoApiOptions>>()
                    .Value;

                client.BaseAddress = new Uri(options.BaseUrl);
            });

            var app = builder.Build();

            app.UseHttpsRedirection();

            app.MapControllers();

            app.Run();
        }
    }
}
