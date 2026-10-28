#!/bin/sh
set -e

TARGET_PORT="${PORT:-3000}"

echo "=========================================================="
echo "⚡ Starting PortaFact DaaS Relayer Daemon in background..."
echo "=========================================================="
(
  cd /app/relayer
  npx ts-node daas-relayer.ts 2>&1 | sed 's/^/[RELAYER] /'
) &
RELAYER_PID=$!

echo "=========================================================="
echo "🌐 Starting Next.js Web Interface on 0.0.0.0:$TARGET_PORT"
echo "=========================================================="
cd /app/frontend

trap "kill -TERM $RELAYER_PID; exit 0" SIGINT SIGTERM

exec npx next start -H 0.0.0.0 -p "$TARGET_PORT"
