#!/bin/sh
/nakama/nakama --name nakama1 --database.address $DATABASE_URL --socket.port $PORT --session.encryption_key "defaultkey" --socket.server_key "defaultkey" --logger.level INFO --runtime.path /nakama/data/modules --runtime.js_entrypoint main.js
