#!/bin/sh
# Run migrations
/nakama/nakama migrate up --database.address $NAKAMA_DATABASE_ADDRESS

# Start Nakama
/nakama/nakama --name nakama1 --database.address $NAKAMA_DATABASE_ADDRESS --socket.port $PORT --session.encryption_key "defaultkey" --socket.server_key "defaultkey" --logger.level INFO --runtime.path /nakama/data/modules --runtime.js_entrypoint main.js
