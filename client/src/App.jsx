import { useCallback, useEffect, useRef, useState } from 'react';
import { Arena } from './game/Arena.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/renderer.js';
import { useGameSocket } from './hooks/useGameSocket.js';

function formatPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return (
    payload.title ||
    payload.file ||
    payload.command ||
    payload.error ||
    payload.summary ||
    payload.detail ||
    (payload.percent !== undefined ? `${payload.percent}% context used` : '') ||
    JSON.stringify(payload)
  );
}

function formatTime(iso) {
  if (!iso) return '--:--:--';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString();
}

export default function App() {
  const canvasRef = useRef(null);
  const arenaRef = useRef(null);

  const [hud, setHud] = useState({
    hero: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, state: 'IDLE' },
    boss: { active: false, title: 'Awaiting Quest...', hp: 100, maxHp: 100, state: 'IDLE' },
  });

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const arena = new Arena(canvasRef.current, setHud);
    arenaRef.current = arena;
    arena.start();

    return () => {
      arena.stop();
      arenaRef.current = null;
    };
  }, []);

  const handleEvent = useCallback((event) => {
    arenaRef.current?.handleEvent(event);
  }, []);

  const { status, events } = useGameSocket(handleEvent);

  const heroHpPct = Math.round((hud.hero.hp / hud.hero.maxHp) * 100);
  const heroMpPct = Math.round((hud.hero.mp / hud.hero.maxMp) * 100);
  const bossHpPct = hud.boss.active ? Math.round((hud.boss.hp / hud.boss.maxHp) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="hud-bar">
        <div className="brand-status">
          <div className="brand-title">AGENT ARENA</div>
          <div className={`status-pill ${status}`}>
            <span className="status-dot" />
            <span>{status}</span>
          </div>
        </div>

        <div className="hud-card">
          <div className="hud-header">
            <span>HERO (CLI AGENT)</span>
            <span className="hud-sub">{hud.hero.state}</span>
          </div>
          <div className="bar-row">
            <span>HP</span>
            <div className="bar-track">
              <div className="bar-fill hp" style={{ width: `${heroHpPct}%` }} />
            </div>
            <span>{hud.hero.hp}/{hud.hero.maxHp}</span>
          </div>
          <div className="bar-row">
            <span>MP</span>
            <div className="bar-track">
              <div className="bar-fill mp" style={{ width: `${heroMpPct}%` }} />
            </div>
            <span>{hud.hero.mp}/{hud.hero.maxMp}</span>
          </div>
        </div>

        <div className="hud-card">
          <div className="hud-header">
            <span>BOSS ({hud.boss.active ? hud.boss.state : 'WAITING'})</span>
            <span className="hud-sub">{hud.boss.title}</span>
          </div>
          <div className="bar-row">
            <span>HP</span>
            <div className="bar-track">
              <div className="bar-fill boss" style={{ width: `${bossHpPct}%` }} />
            </div>
            <span>{hud.boss.active ? `${hud.boss.hp}/${hud.boss.maxHp}` : '--/--'}</span>
          </div>
        </div>
      </header>

      <main className="arena-stage">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="arena-canvas"
        />
      </main>

      <section className="telemetry-panel">
        <div className="telemetry-header">
          <span>Live Telemetry Log</span>
          <span>{events.length} events</span>
        </div>
        <ul className="telemetry-list">
          {events.length === 0 ? (
            <li className="telemetry-item">
              <span className="telemetry-time">--:--:--</span>
              <span className="telemetry-type">IDLE</span>
              <span className="telemetry-detail">Run bash integrations/mock-battle.sh to simulate a battle</span>
            </li>
          ) : (
            events.map((ev, index) => (
              <li key={ev.id || `${ev.type}-${index}`} className="telemetry-item">
                <span className="telemetry-time">{formatTime(ev.timestamp)}</span>
                <span className={`telemetry-type ${ev.type}`}>{ev.type}</span>
                <span className="telemetry-detail">{formatPayload(ev.payload)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
