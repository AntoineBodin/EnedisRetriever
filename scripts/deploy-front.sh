#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/../EnedisRetriever.Web" && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="/var/www/conso.antoinebodin.fr"

echo "==> Building frontend"

cd "$PROJECT_DIR"

npm ci
npm run build

echo "==> Deploying frontend"

sudo rm -rf "$WEB_DIR"/*
sudo cp -r "$DIST_DIR"/* "$WEB_DIR"/

sudo chown -R root:root "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"

echo "==> Reloading Nginx"

sudo nginx -t
sudo systemctl reload nginx

echo "==> Frontend deployment completed"