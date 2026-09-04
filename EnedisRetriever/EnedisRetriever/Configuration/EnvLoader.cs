using DotNetEnv;

namespace EnedisRetriever.Configuration;

public static class EnvLoader
{
    public static void Load()
    {
        var environment =
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";

        var environmentFile = $".env.{environment.ToLowerInvariant()}";

        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            // First look for the environment-specific file.
            var environmentPath = Path.Combine(
                directory.FullName,
                environmentFile);

            if (File.Exists(environmentPath))
            {
                Env.Load(environmentPath);
                return;
            }

            // Fallback to a generic .env file.
            var defaultPath = Path.Combine(
                directory.FullName,
                ".env");

            if (File.Exists(defaultPath))
            {
                Env.Load(defaultPath);
                return;
            }

            directory = directory.Parent;
        }

        // Environment variables may already be provided by Docker,
        // the operating system, or another hosting environment.
    }
}