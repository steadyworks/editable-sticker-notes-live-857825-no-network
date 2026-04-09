#!/bin/bash
set -e

export NG_CLI_ANALYTICS="false"

# ── Backend (Node.js + SQLite + WebSocket) ────────────────────────────────────
cd /app/backend
npm install
node server.js &

# ── Frontend (Angular — build then serve static) ──────────────────────────────
cd /app/frontend
npm install

# Build Angular with development config (esbuild — typically ~5-15 s)
npm run build

# Serve the built static files on port 3000
node server-static.js &
