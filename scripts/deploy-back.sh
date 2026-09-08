#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/../EnedisRetriever" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/compose.prod.yaml"

echo "==> Stopping backend"

cd "$PROJECT_DIR"

docker compose -f "$COMPOSE_FILE" down

echo "==> Starting backend"

docker compose -f "$COMPOSE_FILE" up --build -d

echo "==> Backend deployment completed"

docker compose -f "$COMPOSE_FILE" ps