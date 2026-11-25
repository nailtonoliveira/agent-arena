#!/usr/bin/env bash
set -euo pipefail

API="${AGENT_ARENA_API:-http://localhost:4848/api/event}"

send() {
  curl -sS -X POST "$API" -H "Content-Type: application/json" -d "$1" > /dev/null
}

echo "Iniciando simulacao de batalha no AgentArena ($API)..."

# 1. Spawna o Boss
send '{"type":"TASK_START","payload":{"title":"Bug: Memory Leak in Queue Worker","points":100}}'
sleep 2

# 2. Hero inspeciona arquivos e consome contexto
send '{"type":"TOOL_READ","payload":{"file":"worker.ts"}}'
sleep 1.2
send '{"type":"CONTEXT_UPDATE","payload":{"percent":18}}'
sleep 1

# 3. Hero ataca (edicao de codigo)
send '{"type":"TOOL_WRITE","payload":{"file":"worker.ts","lines":45}}'
sleep 2

# 4. Erro de teste (Boss contra-ataca)
send '{"type":"TOOL_FAIL","payload":{"error":"TimeoutExceeded in queue.spec.ts"}}'
sleep 2

# 5. Hero se recupera e ataca novamente
send '{"type":"TOOL_WRITE","payload":{"file":"queue.spec.ts","lines":22}}'
sleep 1.5

# 6. Testes executados com sucesso e atualizacao de contexto
send '{"type":"TOOL_EXEC","payload":{"command":"npm test"}}'
sleep 1.5
send '{"type":"CONTEXT_UPDATE","payload":{"percent":42}}'
sleep 1.2

# 7. Boss derrotado
send '{"type":"TASK_COMPLETE","payload":{"summary":"Fix deployed successfully"}}'

echo "Simulacao finalizada com sucesso."
