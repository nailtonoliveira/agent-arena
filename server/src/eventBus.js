import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';

export const EVENT_TYPES = Object.freeze([
  'TASK_START',
  'TOOL_READ',
  'TOOL_WRITE',
  'TOOL_EXEC',
  'TOOL_FAIL',
  'CONTEXT_UPDATE',
  'TASK_COMPLETE',
]);

const EVENT_TYPE_SET = new Set(EVENT_TYPES);

/**
 * Checks whether an incoming event type is recognized by AgentArena.
 * @param {unknown} type
 * @returns {boolean}
 */
export function isValidEventType(type) {
  return typeof type === 'string' && EVENT_TYPE_SET.has(type);
}

/**
 * Normalizes a raw event into the canonical broadcast structure.
 * @param {{ type: string, payload?: Record<string, unknown> }} input
 * @returns {{ id: string, type: string, payload: Record<string, unknown>, timestamp: string }}
 */
export function normalizeEvent({ type, payload }) {
  const safePayload =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};

  return {
    id: randomUUID(),
    type,
    payload: safePayload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an event bus bound to a WebSocketServer instance.
 * @param {import('ws').WebSocketServer} wss
 */
export function createEventBus(wss) {
  /**
   * Validates, normalizes, and broadcasts an event to all open WebSocket clients.
   * @param {{ type: string, payload?: Record<string, unknown> }} rawEvent
   */
  function publish(rawEvent) {
    if (!rawEvent || !isValidEventType(rawEvent.type)) {
      throw new Error(`Invalid event type: ${String(rawEvent?.type)}`);
    }

    const event = normalizeEvent(rawEvent);
    const message = JSON.stringify(event);
    let delivered = 0;

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        delivered += 1;
      }
    }

    return { event, delivered };
  }

  return {
    publish,
    validTypes: EVENT_TYPES,
  };
}
