#!/bin/bash

exec 2>&1
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="/home/z/my-project"
BUILD_DIR="/tmp/build_fullstack_${BUILD_ID:-local}"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Project directory does not exist: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
mkdir -p "$BUILD_DIR"

echo "Installing frontend dependencies..."
npm ci

echo "Building Vite frontend..."
npm run build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Vite build did not produce dist/index.html"
    exit 1
fi

echo "Building mini-services..."
if [ -d "$PROJECT_DIR/mini-services" ]; then
    sh "$SCRIPT_DIR/mini-services-install.sh"
    sh "$SCRIPT_DIR/mini-services-build.sh"
    if [ -f "$SCRIPT_DIR/mini-services-start.sh" ]; then
        cp "$SCRIPT_DIR/mini-services-start.sh" "$BUILD_DIR/mini-services-start.sh"
        chmod +x "$BUILD_DIR/mini-services-start.sh"
    fi
fi

echo "Collecting deployment files..."
cp -r dist "$BUILD_DIR/frontend-dist"

PROJECT_DIR="$PROJECT_DIR" BUILD_DIR="$BUILD_DIR" \
    bash "$SCRIPT_DIR/python-runtime-build.sh"

if [ -f "Caddyfile" ]; then
    cp "Caddyfile" "$BUILD_DIR/"
else
    echo "Caddyfile is required for the deployment package"
    exit 1
fi

cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

PACKAGE_FILE="${BUILD_DIR}.tar.gz"
cd "$BUILD_DIR"
tar -czf "$PACKAGE_FILE" .
echo "Deployment package created: $PACKAGE_FILE"
