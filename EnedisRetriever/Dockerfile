FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY EnedisRetriever/EnedisRetriever.csproj EnedisRetriever/

RUN dotnet restore EnedisRetriever/EnedisRetriever.csproj

COPY EnedisRetriever/ EnedisRetriever/

WORKDIR /src/EnedisRetriever

RUN dotnet publish EnedisRetriever.csproj \
    -c Release \
    -o /app/publish \
    --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "EnedisRetriever.dll"]