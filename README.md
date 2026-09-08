# EnedisRetriever

EnedisRetriever is a personal electricity consumption dashboard.

The application retrieves electricity load-curve data from consoAPI, caches the raw data in PostgreSQL, and exposes it through a REST API consumed by a React frontend.

The backend deliberately returns **raw half-hour consumption data**. Aggregation, peak/off-peak calculations, pricing, and visualization are handled by the frontend.

## Architecture

```text
                         Internet
                            │
                            ▼
                    ┌─────────────────┐
                    │      Nginx      │
                    │ HTTPS / Reverse │
                    │      Proxy      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                   /                 /api/*
                    │                 │
                    ▼                 ▼
             React static files   .NET Backend
                                      │
                                      ▼
                                 PostgreSQL
                                      │
                                      ▼
                                Persistent cache

Backend
   │
   ▼
 consoAPI
```

Production URL:

```text
https://conso.antoinebodin.fr
```

The `/api` path is proxied by Nginx to the backend.

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
* Detect missing data and request only missing periods.
* Apply Entity Framework Core migrations.
* Expose consumption data through a REST API.

The main endpoint is:

```text
GET /api/consumption?start=YYYY-MM-DD&end=YYYY-MM-DD
```

The date range follows the `[start, end)` convention.

The returned timestamps represent the **end of each consumption interval**.

The backend only exposes raw consumption data. It does not perform frontend-specific aggregation or pricing calculations.

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

### Database

PostgreSQL is used as a persistent cache for load-curve data.

Each consumption point contains:

* Timestamp
* Power in watts
* Interval duration
* Energy in kWh

The PostgreSQL data directory is stored in a Docker named volume.

The volume survives container recreation and normal deployments.

Entity Framework Core migrations are used to manage database schema changes.

Pending migrations are automatically applied when the backend starts.

## Environment Configuration

The backend uses different environment files depending on how it is executed:

```text
.env.development
.env.docker.development
.env.docker.production
```

The application automatically selects the appropriate file based on:

* `ASPNETCORE_ENVIRONMENT`
* whether the application is running inside a Docker container

Environment files are not committed to Git.

For the frontend, Vite uses environment files such as:

```text
.env.development
.env.production
```

The production frontend uses:

```env
VITE_API_BASE_URL=/api
```

This makes the frontend call the API through the same domain:

```text
https://conso.antoinebodin.fr/api/consumption
```

Nginx then forwards the request to the backend container.

## Local Development

### Requirements

Install:

* .NET 8 SDK
* Node.js
* npm
* Docker Desktop

PostgreSQL is optional when using the Docker development setup.

### Backend without Docker

Start PostgreSQL locally or provide a PostgreSQL connection string through `.env.development`.

Then:

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
npm ci
```

Start the Vite development server:

```bash
npm run dev
```

The frontend API URL is configured through:

```text
VITE_API_BASE_URL
```

For local development, it can point directly to the local backend, for example:

```env
VITE_API_BASE_URL=http://localhost:5100/api
```

## Local Docker Development

Docker Compose can run the backend and PostgreSQL together.

```bash
docker compose up --build
```

The development Docker setup uses:

* `Dockerfile.dev`
* `dotnet watch`
* PostgreSQL
* `.env.docker.development`

The backend source directory is mounted into the container so that code changes are detected automatically.

PostgreSQL data is stored in a Docker named volume:

```text
enedis-retriever-postgres-data
```

### Important

Normal shutdown:

```bash
docker compose down
```

This removes the containers but keeps the PostgreSQL volume.

Do not use:

```bash
docker compose down -v
```

unless you intentionally want to delete the PostgreSQL database and all cached data.

## Production Deployment

Production runs on a Linux VPS using:

* Docker
* Docker Compose
* PostgreSQL
* Nginx
* Let's Encrypt / Certbot

The production architecture is:

```text
Internet
    │
    ▼
https://conso.antoinebodin.fr
    │
    ▼
  Nginx
    │
    ├── /api/* ──────────► 127.0.0.1:5100
    │                           │
    │                           ▼
    │                      Backend :8080
    │                           │
    │                           ▼
    │                      PostgreSQL
    │
    └── /* ──────────────► React static files
```

The backend is exposed only on:

```text
127.0.0.1:5100
```

The backend listens on port `8080` inside its container.

PostgreSQL is not exposed publicly.

Nginx handles:

* HTTPS
* TLS certificates
* HTTP → HTTPS redirection
* Serving the React application
* Reverse proxying `/api/*` requests to the backend

## Production Docker Compose

Production is started with:

```bash
docker compose -f compose.prod.yaml up --build -d
```

The production Compose stack contains:

* `enedis-retriever`
* `enedis-retriever-postgres`

PostgreSQL uses a persistent named volume.

To stop the production stack:

```bash
docker compose -f compose.prod.yaml down
```

The PostgreSQL volume is intentionally preserved.

Never use `-v` during a normal deployment:

```bash
docker compose -f compose.prod.yaml down -v
```

The `-v` option deletes the PostgreSQL volume and therefore the cached data.

## Production Database Migrations

Database migrations are created during development:

```bash
dotnet ef migrations add MigrationName
```

The generated migration files are committed to Git.

The backend automatically applies pending migrations during startup.

For example, if the database contains:

```text
InitialCreate
ChangeTimestampToLocal
```

and the new application version contains:

```text
InitialCreate
ChangeTimestampToLocal
AddNewFeature
```

the application will automatically apply:

```text
AddNewFeature
```

during startup.

This means database migrations do not have to be applied manually on the VPS.

## Production Deployment Scripts

Deployment scripts are stored in:

```text
scripts/
├── deploy-front.sh
└── deploy-back.sh
```

### Backend

After pulling the latest code:

```bash
git pull
./scripts/deploy-back.sh
```

The script:

1. Stops the current Compose stack.
2. Keeps the PostgreSQL volume.
3. Rebuilds the backend image.
4. Starts the production stack.
5. Displays the resulting container status.

The script uses:

```bash
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up --build -d
```

### Frontend

After pulling the latest code:

```bash
git pull
./scripts/deploy-front.sh
```

The script:

1. Installs dependencies with `npm ci`.
2. Builds the React application.
3. Copies `dist` to the Nginx web directory.
4. Validates the Nginx configuration.
5. Reloads Nginx.

The production frontend files are served from:

```text
/var/www/conso.antoinebodin.fr
```

Nginx does not need to be restarted when only the backend container is rebuilt.

## Typical Development Workflow

When implementing a feature that changes the database model:

```bash
# Modify the model

# Create a migration
dotnet ef migrations add AddNewFeature

# Test locally

# Commit everything
git add .
git commit -m "Add new feature"
git push
```

Then deploy on the VPS:

```bash
git pull

./scripts/deploy-back.sh
./scripts/deploy-front.sh
```

The backend migration is automatically applied during startup.

The frontend is rebuilt and copied to the Nginx web directory.

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

## Useful Nginx Commands

Test the configuration:

```bash
sudo nginx -t
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

Check Nginx status:

```bash
sudo systemctl status nginx
```

Check Let's Encrypt certificates:

```bash
sudo certbot certificates
```

Test certificate renewal:

```bash
sudo certbot renew --dry-run
```

## Project Structure

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
├── scripts/
│   ├── deploy-front.sh
│   └── deploy-back.sh
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
Nginx
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
        │
        ├── Aggregation
        ├── HP / HC
        ├── Cost calculation
        └── Visualization
```

The caching mechanism prevents repeatedly requesting data that is already available locally.

## Data Persistence

PostgreSQL uses a Docker named volume.

Recreating the PostgreSQL container does not delete the database:

```bash
docker compose -f compose.prod.yaml down
docker compose -f compose.prod.yaml up -d
```

The database remains available.

The volume is only removed when explicitly requested:

```bash
docker compose -f compose.prod.yaml down -v
```

This should only be used when intentionally resetting the database.
