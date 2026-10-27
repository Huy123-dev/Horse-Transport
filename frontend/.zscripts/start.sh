#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

pids=""

cleanup() {
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    wait
}

trap cleanup EXIT INT TERM

if [ ! -f "./frontend-dist/index.html" ]; then
    echo "Vite frontend build not found: ./frontend-dist/index.html"
    exit 1
fi

if [ -d "/app/python-runtime/site-packages" ]; then
    export PYTHONPATH="/app/python-runtime/site-packages:/app/python-service${PYTHONPATH:+:$PYTHONPATH}"
    export PATH="/app/python-runtime/site-packages/bin:$PATH"
    export PYTHONDONTWRITEBYTECODE=1
    export PYTHONUNBUFFERED=1
fi

if [ -f "./mini-services-start.sh" ]; then
    sh ./mini-services-start.sh &
    pids="$!"
fi

caddy run --config Caddyfile --adapter caddyfile
