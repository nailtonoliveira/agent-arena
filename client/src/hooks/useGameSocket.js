import { useEffect, useRef, useState } from 'react';

const DEFAULT_WS_URL = 'ws://localhost:4848';
const RECONNECT_DELAY_MS = 1500;
const MAX_LOG_EVENTS = 30;

/**
 * Connects to the AgentArena WebSocket hub with automatic reconnection.
 * @param {(event: { id?: string, type: string, payload?: Record<string, unknown>, timestamp?: string }) => void} [onEvent]
 * @param {string} [url]
 */
export function useGameSocket(onEvent, url = DEFAULT_WS_URL) {
  const [status, setStatus] = useState('connecting');
  const [events, setEvents] = useState([]);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let socket = null;
    let reconnectTimer = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      setStatus('connecting');

      socket = new WebSocket(url);

      socket.onopen = () => {
        if (!unmounted) setStatus('connected');
      };

      socket.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (!parsed || typeof parsed.type !== 'string') return;

          setEvents((prev) => [parsed, ...prev].slice(0, MAX_LOG_EVENTS));
          onEventRef.current?.(parsed);
        } catch {
          // Ignore malformed non-JSON messages
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (unmounted) return;
        setStatus('disconnected');
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [url]);

  return { status, events };
}
