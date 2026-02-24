#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/sim/backend"
FRONTEND="$ROOT/sim/frontend"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Find a free port starting from the given number
find_free_port() {
  local port=$1
  while lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

# Install backend deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "Installing backend dependencies..."
  pip3 install -r "$BACKEND/requirements.txt"
fi

# Install frontend deps if needed
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND" && npm install)
fi

# Find free ports
BE_PORT=$(find_free_port 8000)
FE_PORT=$(find_free_port 3000)

# Start backend
echo "Starting backend on :$BE_PORT..."
(cd "$BACKEND" && uvicorn main:app --host 0.0.0.0 --port "$BE_PORT" --reload) &
BACKEND_PID=$!

# Update next.config rewrites if backend isn't on 8000
if [ "$BE_PORT" != "8000" ]; then
  echo "Backend on non-default port, updating proxy to :$BE_PORT..."
  cat > "$FRONTEND/next.config.ts" <<NEXTCFG
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:${BE_PORT}/api/:path*',
      },
    ];
  },
};

export default nextConfig;
NEXTCFG
fi

# Start frontend
echo "Starting frontend on :$FE_PORT..."
(cd "$FRONTEND" && npm run dev -- --port "$FE_PORT") &
FRONTEND_PID=$!

echo ""
echo "============================="
echo "  Backend:  http://localhost:$BE_PORT"
echo "  Frontend: http://localhost:$FE_PORT"
echo "============================="
echo ""

wait
