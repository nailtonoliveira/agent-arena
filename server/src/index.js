import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createEventBus, EVENT_TYPES, isValidEventType } from './eventBus.js';

const PORT = Number(process.env.PORT) || 4848;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const eventBus = createEventBus(wss);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    clients: wss.clients.size,
    uptime: Math.floor(process.uptime()),
  });
});

app.post('/api/event', (req, res) => {
  const { type, payload } = req.body ?? {};

  if (!isValidEventType(type)) {
    res.status(400).json({
      error: 'Invalid or missing event type',
      validTypes: EVENT_TYPES,
    });
    return;
  }

  if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
    res.status(400).json({
      error: 'Payload must be a JSON object when provided',
    });
    return;
  }

  const { event, delivered } = eventBus.publish({ type, payload });
  res.status(200).json({ ok: true, event, clients: delivered });
});

wss.on('connection', (socket) => {
  socket.on('error', (err) => {
    console.error('[ws] Client socket error:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[agent-arena] Event Hub listening on http://localhost:${PORT}`);
});
