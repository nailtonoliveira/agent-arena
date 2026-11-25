#!/usr/bin/env bash
set -euo pipefail

# Installs or updates the AgentArena lifecycle hook in Antigravity CLI hooks.json.
# Usage:
#   ./integrations/install-agy-hook.sh            # installs globally in ~/.gemini/config/hooks.json
#   ./integrations/install-agy-hook.sh --project /path/to/repo  # installs in <repo>/.agents/hooks.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/agy-hook.mjs"

TARGET_FILE="$HOME/.gemini/config/hooks.json"
if [[ "${1:-}" == "--project" ]]; then
  PROJECT_DIR="${2:-$(pwd)}"
  TARGET_FILE="$PROJECT_DIR/.agents/hooks.json"
elif [[ "${1:-}" == "--global" || -z "${1:-}" ]]; then
  TARGET_FILE="$HOME/.gemini/config/hooks.json"
else
  echo "Usage: $0 [--global | --project <dir>]" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET_FILE")"

node -e '
const fs = require("node:fs");
const target = process.argv[1];
const hookScript = process.argv[2];

let existing = {};
if (fs.existsSync(target)) {
  const raw = fs.readFileSync(target, "utf8").trim();
  if (raw) {
    existing = JSON.parse(raw);
  }
}

const cmd = `node "${hookScript}"`;
existing["agent-arena"] = {
  enabled: true,
  SessionStart: [{ type: "command", command: cmd, timeout: 5 }],
  PreInvocation: [{ type: "command", command: cmd, timeout: 5 }],
  PostToolUse: [
    {
      matcher: "*",
      hooks: [{ type: "command", command: cmd, timeout: 5 }],
    },
  ],
  Stop: [{ type: "command", command: cmd, timeout: 5 }],
};

fs.writeFileSync(target, JSON.stringify(existing, null, 2) + "\n", "utf8");
console.log(`AgentArena hook installed in: ${target}`);
' "$TARGET_FILE" "$HOOK_SCRIPT"
