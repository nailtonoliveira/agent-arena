#!/usr/bin/env bash
# Disparo silencioso de evento em background
EVENT_TYPE="$1"
DETAIL="$2"
API="${AGENT_ARENA_API:-http://localhost:4848/api/event}"

curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"$EVENT_TYPE\",\"payload\":{\"detail\":\"$DETAIL\"}}" > /dev/null 2>&1 &
