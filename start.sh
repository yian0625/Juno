#!/bin/bash

# Juno Frontend Start Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-3000}"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8080}"

echo "======================================"
echo "  Juno Frontend"
echo "======================================"
echo "Port: $PORT"
echo "API:  $API_URL"
echo "======================================"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

export NEXT_PUBLIC_API_URL="$API_URL"
export PORT="$PORT"

if [ "$1" = "-prod" ]; then
    echo "Building for production..."
    npm run build
    echo "Starting production server..."
    npm start
else
    echo "Starting dev server..."
    npm run dev
fi
