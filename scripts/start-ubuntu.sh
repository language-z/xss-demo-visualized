#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PORT_VALUE="${PORT:-${1:-3000}}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 20 LTS first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Reinstall Node.js 20 LTS with npm enabled." >&2
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20 LTS or newer is required. Current version: v$NODE_VERSION" >&2
  exit 1
fi

if [ "${INSTALL_DEPS:-0}" = "1" ] || [ ! -d "node_modules" ]; then
  if [ -f "package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
fi

mkdir -p logs

export PORT="$PORT_VALUE"
echo "Starting XSS defense system at http://localhost:$PORT"
echo "Admin login: http://localhost:$PORT/admin/login"
echo "Default admin account: admin / admin123"
exec node app.js
