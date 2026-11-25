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

### CLI Hook Example

```bash
./integrations/claude-hook.sh TOOL_WRITE "src/index.js"
```
