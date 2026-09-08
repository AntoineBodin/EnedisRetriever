# EnedisRetriever

EnedisRetriever is a personal electricity consumption dashboard.

The application retrieves electricity load-curve data from [consoAPI](https://conso.boris.sh/), caches the raw data in PostgreSQL, and exposes it through a REST API consumed by a React frontend.

The backend deliberately returns **raw half-hour consumption data**. Aggregation, peak/off-peak calculations, pricing, and visualization are handled by the frontend.

## Architecture

```text
                    ┌─────────────────┐
                    │     consoAPI     │
                    │ Load curve data  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ .NET Backend    │
                    │ EnedisRetriever  │
                    └────────┬────────┘
                             │
                       Cache / Query
                             │
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │ Consumption     │
                    │     cache       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ React Frontend  │
                    │                 │
                    │ Aggregation      │
                    │ HP / HC          │
                    │ Costs            │
                    │ Charts           │
                    └─────────────────┘
```

## Components

### Backend

The backend is built with:

* .NET 8
* ASP.NET Core
* Entity Framework Core
* PostgreSQL
* Npgsql
* consoAPI

Main responsibilities:

* Retrieve load-curve data from consoAPI.
* Cache consumption points in PostgreSQL.
* Detect missing data and request only the missing periods.
* Apply Entity Framework Core migrations.
* Expose consumption data through a REST API.

The main endpoint is:

```text
GET /api/consumption?start=YYYY-MM-DD&end=YYYY-MM-DD
```

The date range follows the `[start, end)` convention.

The returned timestamps represent the **end of each consumption interval**.

### Frontend

The frontend is built with:

* React
* TypeScript
* Vite
* Recharts

The frontend is responsible for:

* Fetching raw consumption data.
* Aggregating data according to the selected granularity.
* Calculating peak/off-peak consumption.
* Calculating electricity costs.
* Displaying charts and statistics.

The backend does not perform these presentation-specific calculations.

### Database

PostgreSQL is used as a persistent cache for the load-curve data.

Each consumption point contains:

* Timestamp
* Power in watts
* Interval duration
* Energy in kWh

The database is persisted using a Docker volume.

Entity Framework Core migrations are used to manage schema changes.

At application startup, pending migrations are applied automatically.

## Environment Configuration

Different environment files are used depending on how the application is executed:

```text
.env.development
.env.docker.development
.env.docker.production
```

The application automatically selects the appropriate file based on:

* `ASPNETCORE_ENVIRONMENT`
* whether the application is running inside a Docker container

Environment files are not committed to Git.

Example backend configuration:

```env
ConnectionStrings__DefaultConnection=Host=localhost;Port=5433;Database=enedis_retriever;Username=postgres;Password=postgres
CONSO_API_TOKEN=your_token
```

The exact variables may evolve as the application grows.

## Local Development

### Requirements

Install:

* .NET 8 SDK
* Node.js
* npm
* Docker Desktop
* PostgreSQL is optional when using Docker

### Backend without Docker

Start PostgreSQL locally or provide a PostgreSQL connection string through `.env.development`.

Then run:

```bash
cd EnedisRetriever
dotnet run
```

The application loads `.env.development`.

Entity Framework migrations can be created with:

```bash
dotnet ef migrations add MigrationName
```

To inspect migrations:

```bash
dotnet ef migrations list
```

The application automatically applies pending migrations when it starts.

### Frontend without Docker

Install dependencies:

```bash
cd EnedisRetriever.Web
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend uses the API URL configured through:

```text
VITE_API_BASE_URL
```

For example:

```env
VITE_API_BASE_URL=http://localhost:5100/api
```

## Local Docker Development

Docker Compose can run both the backend and PostgreSQL.

```bash
docker compose up --build
```

The development Docker setup uses:

* `Dockerfile.dev`
* Docker Watch / `dotnet watch`
* PostgreSQL
* `.env.docker.development`

The backend source directory is mounted into the container so that code changes are detected automatically.

The PostgreSQL data is stored in a Docker volume:

```text
enedis-retriever-postgres-data
```

The volume survives container recreation.

### Important

Do not use:

```bash
docker compose down -v
```

unless you intentionally want to delete the PostgreSQL data.

Normal shutdown:

```bash
docker compose down
```

This removes the containers but keeps the database volume.

## Production Deployment

Production runs on a Linux VPS using Docker Compose and Nginx.

The production stack consists of:

```text
Internet
   │
   ▼
 Nginx
   │
   ├── /       → React static files
   │
   └── /api/*  → Backend container
                       │
                       ▼
                  PostgreSQL
```

The backend and PostgreSQL run as Docker containers.

The backend is exposed locally on:

```text
127.0.0.1:5100
```

The application itself listens on port `8080` inside the container.

PostgreSQL is not exposed publicly.

Nginx handles:

* HTTPS
* TLS certificates
* Serving the React application
* Reverse proxying `/api` requests to the backend

## Production Docker Compose

Production is started with:

```bash
docker compose -f compose.prod.yaml up --build -d
```

To stop the application:

```bash
docker compose -f compose.prod.yaml down
```

The PostgreSQL volume is intentionally preserved between deployments.

Never use `-v` during a normal deployment:

```bash
docker compose -f compose.prod.yaml down -v
```

The `-v` option deletes the PostgreSQL volume and therefore the cached data.

## Production Database Migrations

Migrations are created during development:

```bash
dotnet ef migrations add MigrationName
```

The migration files are committed to Git.

After deployment, the backend automatically applies pending migrations during startup.

Therefore, a typical deployment is:

```bash
git pull

docker compose -f compose.prod.yaml up --build -d
```

The startup process is:

```text
New backend container
        │
        ▼
Application startup
        │
        ▼
EF Core checks __EFMigrationsHistory
        │
        ▼
Pending migrations applied
        │
        ▼
Application starts
```

Existing PostgreSQL data remains untouched.

## Typical Development Workflow

When implementing a feature that changes the database model:

```bash
# 1. Modify the model

# 2. Create a migration
dotnet ef migrations add AddNewFeature

# 3. Test locally

# 4. Commit the migration
git add .
git commit -m "Add new feature"
git push
```

Then deploy:

```bash
git pull
docker compose -f compose.prod.yaml up --build -d
```

The production database is automatically updated by EF Core.

## Useful Docker Commands

Check running containers:

```bash
docker compose -f compose.prod.yaml ps
```

View backend logs:

```bash
docker compose -f compose.prod.yaml logs -f enedis-retriever
```

View PostgreSQL logs:

```bash
docker compose -f compose.prod.yaml logs -f postgres
```

Restart the stack:

```bash
docker compose -f compose.prod.yaml up -d
```

Rebuild the backend:

```bash
docker compose -f compose.prod.yaml up --build -d
```

List Docker volumes:

```bash
docker volume ls
```

## Project Structure

The repository is organized approximately as follows:

```text
EnedisRetriever/
│
├── EnedisRetriever/
│   ├── Configuration/
│   ├── Controllers/
│   ├── ConsoApi/
│   ├── Domain/
│   ├── Persistence/
│   ├── Services/
│   ├── Migrations/
│   ├── Program.cs
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── EnedisRetriever.Web/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── compose.yaml
├── compose.prod.yaml
└── README.md
```

## Data Flow

When the frontend requests consumption data:

```text
GET /api/consumption
        │
        ▼
ConsumptionController
        │
        ▼
ConsumptionService
        │
        ├── Check PostgreSQL cache
        │
        ├── Detect missing periods
        │
        ├── Fetch missing data from consoAPI
        │
        ├── Store data in PostgreSQL
        │
        └── Return raw consumption points
        │
        ▼
React frontend
```

This caching mechanism prevents repeatedly requesting data that is already available locally.

## Production Data Persistence

The PostgreSQL data directory is backed by a Docker named volume.

Recreating the PostgreSQL container does **not** delete the database.

For example:

```bash
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up -d
```

The database remains available.

The database is only removed when the volume itself is explicitly deleted, for example:

```bash
docker compose -f compose.prod.yaml down -v
```

Use this only when intentionally resetting the database.
