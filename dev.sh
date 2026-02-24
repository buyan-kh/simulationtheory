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

# Start backend
echo "Starting backend on :8000..."
(cd "$BACKEND" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on :3000..."
(cd "$FRONTEND" && npm run dev -- --port 3000) &
FRONTEND_PID=$!

echo ""
echo "============================="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "============================="
echo ""

wait
