#!/bin/sh

if [ -z "$NAKAMA_DATABASE_ADDRESS" ]; then
  echo "ERROR: NAKAMA_DATABASE_ADDRESS environment variable is not set."
  echo "Please set it in the Render dashboard (e.g., postgresql://user:pass@host:5432/dbname)"
  exit 1
fi

echo "Starting Nakama migrations..."
/nakama/nakama migrate up --database.address "$NAKAMA_DATABASE_ADDRESS"

echo "Starting Nakama server on port $PORT..."
exec /nakama/nakama \
  --name nakama1 \
  --database.address "$NAKAMA_DATABASE_ADDRESS" \
  --socket.port "$PORT" \
  --session.encryption_key "defaultkey" \
  --socket.server_key "defaultkey" \
  --logger.level INFO \
  --runtime.path /nakama/data/modules \
  --runtime.js_entrypoint main.js
