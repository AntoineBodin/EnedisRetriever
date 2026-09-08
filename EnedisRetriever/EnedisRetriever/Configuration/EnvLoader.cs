using DotNetEnv;

namespace EnedisRetriever.Configuration;

public static class EnvLoader
{
    public static void Load()
    {
        var environment =
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";

        var isDocker =
            Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER")
            == "true";

        var environmentFile = isDocker
            ? $".env.docker.{environment.ToLowerInvariant()}"
            : $".env.{environment.ToLowerInvariant()}";

        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            var environmentPath = Path.Combine(
                directory.FullName,
                environmentFile);

            if (File.Exists(environmentPath))
            {
                Env.NoClobber().Load(environmentPath);
                return;
            }

            directory = directory.Parent;
        }
    }
}