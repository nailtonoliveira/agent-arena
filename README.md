# AgentArena

Real-time 2D pixel-art RPG battle visualizer for coding CLI telemetry and issue tracking events.

## Prerequisites

- Node.js 20+
- `curl` (for mock battle and CLI hook scripts)

## Setup

```bash
npm install
```

## Usage

Start both the event hub server (`:4848`) and the Vite frontend (`:5173`):

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

To build the frontend bundle:

```bash
npm run build
```

Open `http://localhost:5173` in your browser, then run the simulated battle in another terminal:

```bash
bash integrations/mock-battle.sh
```

## API & Telemetry

- `GET http://localhost:4848/api/status` — server status, port, connected WebSocket clients, and uptime.
- `POST http://localhost:4848/api/event` — accepts `{ "type": "<EVENT_TYPE>", "payload": { ... } }`.

Supported event types:
`TASK_START`, `TOOL_READ`, `TOOL_WRITE`, `TOOL_EXEC`, `TOOL_FAIL`, `CONTEXT_UPDATE`, `TASK_COMPLETE`.

### CLI Hook Examples

#### Claude Code / Generic Shell Hook

```bash
./integrations/claude-hook.sh TOOL_WRITE "src/index.js"
```

#### Antigravity CLI (`agy`) Native Lifecycle Hooks

AgentArena includes a native Antigravity CLI hook adapter ([`integrations/agy-hook.mjs`](integrations/agy-hook.mjs)) that maps Antigravity lifecycle events (`SessionStart`, `PreInvocation`, `PostToolUse`, `Stop`) directly to Arena battle animations without blocking the agent if the server is offline.

Install globally (`~/.gemini/config/hooks.json`):

```bash
./integrations/install-agy-hook.sh --global
```

Or install for a specific workspace (`.agents/hooks.json`):

```bash
./integrations/install-agy-hook.sh --project /path/to/your/repo
```

You can also copy and customize [`integrations/agy-hooks.json`](integrations/agy-hooks.json) manually.
