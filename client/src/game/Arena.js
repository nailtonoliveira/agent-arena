import { Boss, BOSS_STATES, DamageText, Hero, HERO_STATES, Particle } from './entities.js';
import { renderArena } from './renderer.js';

export class Arena {
  constructor(canvas, onSnapshot) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSnapshot = onSnapshot;

    this.hero = new Hero();
    this.boss = new Boss();
    this.particles = [];
    this.damageTexts = [];
    this.slashes = [];

    this.time = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.hurtFlash = 0;
    this.victoryBanner = null;

    this.rafId = null;
    this.lastFrameTime = 0;
  }

  start() {
    if (this.rafId !== null) return;
    this.lastFrameTime = performance.now();
    this.emitSnapshot();

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;
      this.update(dt);
      renderArena(this.ctx, this);
      this.rafId = window.requestAnimationFrame(tick);
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  emitSnapshot() {
    this.onSnapshot?.({
      hero: {
        hp: Math.round(this.hero.hp),
        maxHp: this.hero.maxHp,
        mp: Math.round(this.hero.mp),
        maxMp: this.hero.maxMp,
        state: this.hero.state,
      },
      boss: {
        active: this.boss.active,
        title: this.boss.title,
        hp: Math.round(this.boss.hp),
        maxHp: this.boss.maxHp,
        state: this.boss.state,
      },
    });
  }

  spawnBurst(x, y, count, colors, speed = 170, gravity = 200) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const mag = (0.3 + Math.random() * 0.7) * speed;
      const color = colors[i % colors.length];
      const size = 3 + Math.floor(Math.random() * 4);
      const life = 0.45 + Math.random() * 0.55;
      this.particles.push(
        new Particle(x, y, Math.cos(angle) * mag, Math.sin(angle) * mag - 40, color, size, life, gravity),
      );
    }
  }

  triggerShake(intensity = 10, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  ensureBossActive() {
    if (!this.boss.active) {
      this.boss.spawn('Active Coding Session', 100);
    }
  }

  handleEvent(event) {
    if (!event?.type) return;
    const payload = event.payload || {};

    switch (event.type) {
      case 'TASK_START': {
        this.victoryBanner = null;
        this.hero.reset();
        this.boss.spawn(payload.title || 'New Quest', payload.points || 100);
        this.hero.showBubble('QUEST ACCEPTED!');
        this.spawnBurst(this.boss.baseX, this.boss.baseY - 30, 28, ['#ef4444', '#f59e0b', '#fca5a5'], 200, 120);
        this.damageTexts.push(new DamageText(this.boss.baseX, this.boss.baseY - 95, 'BOSS APPEARS!', '#fca5a5'));
        break;
      }

      case 'TOOL_READ': {
        this.hero.setState(HERO_STATES.CAST, 1.1);
        this.hero.triggerAura('#38bdf8', 1.2);
        this.hero.mp = Math.max(0, this.hero.mp - 3);
        this.hero.showBubble(`SCAN ${payload.file || payload.detail || 'files'}`);
        this.spawnBurst(this.hero.baseX, this.hero.baseY - 30, 14, ['#38bdf8', '#a5f3fc', '#818cf8'], 110, -30);
        break;
      }

      case 'TOOL_WRITE': {
        this.ensureBossActive();
        const lines = Number(payload.lines) || 18;
        const dmg = Math.min(35, Math.max(12, Math.round(lines * 0.6)));
        this.hero.setState(HERO_STATES.ATTACK, 0.42);
        this.hero.showBubble(`EDIT ${payload.file || payload.detail || 'code'}`);

        const dealt = this.boss.takeDamage(dmg, 5);
        this.slashes.push({ x: this.boss.baseX - 24, y: this.boss.baseY - 36, life: 0.25, maxLife: 0.25, color: '#fde047' });
        this.spawnBurst(this.boss.baseX - 20, this.boss.baseY - 36, 20, ['#fde047', '#fb923c', '#ffffff'], 220);
        this.damageTexts.push(new DamageText(this.boss.baseX, this.boss.baseY - 82, `-${dealt || dmg}`, '#facc15'));
        this.triggerShake(7, 0.22);
        break;
      }

      case 'TOOL_EXEC': {
        this.ensureBossActive();
        this.hero.setState(HERO_STATES.CAST, 0.9);
        this.hero.triggerAura('#facc15', 0.9);
        this.hero.showBubble(`RUN ${payload.command || payload.detail || 'cmd'}`);
        this.boss.showBubble('DEFENDING!', 1.2);
        this.spawnBurst(480, 320, 22, ['#facc15', '#38bdf8', '#f8fafc'], 190, 80);
        this.damageTexts.push(new DamageText(480, 260, 'CLASH!', '#38bdf8'));
        break;
      }

      case 'TOOL_FAIL': {
        this.ensureBossActive();
        this.boss.setState(BOSS_STATES.ATTACK, 0.48);
        this.boss.showBubble('COUNTER!', 1.4);

        const dmg = 18;
        this.hero.takeDamage(dmg);
        this.hero.showBubble(`ERR: ${payload.error || payload.detail || 'failed'}`);
        this.hurtFlash = 0.55;
        this.triggerShake(14, 0.38);
        this.spawnBurst(this.hero.baseX, this.hero.baseY - 30, 22, ['#ef4444', '#fca5a5', '#f97316'], 210);
        this.damageTexts.push(new DamageText(this.hero.baseX, this.hero.baseY - 82, `-${dmg}`, '#f87171'));
        break;
      }

      case 'CONTEXT_UPDATE': {
        const consumed = Math.max(0, Math.min(100, Number(payload.percent) || 0));
        this.hero.mp = Math.round(this.hero.maxMp * (1 - consumed / 100));
        this.spawnBurst(this.hero.baseX, this.hero.baseY - 25, 10, ['#06b6d4', '#67e8f9'], 90, -40);
        this.damageTexts.push(new DamageText(this.hero.baseX, this.hero.baseY - 65, `CTX ${consumed}%`, '#22d3ee'));
        break;
      }

      case 'TASK_COMPLETE': {
        this.ensureBossActive();
        this.boss.kill();
        this.hero.setState(HERO_STATES.VICTORY, 0);
        this.hero.showBubble('BUG SLAIN!', 3.0);
        this.victoryBanner = {
          title: this.boss.title,
          summary: payload.summary || payload.detail || 'Fix deployed successfully',
        };
        this.triggerShake(12, 0.35);
        this.spawnBurst(this.boss.baseX, this.boss.baseY - 35, 55, ['#facc15', '#ef4444', '#38bdf8', '#4ade80', '#ffffff'], 290, 140);
        this.damageTexts.push(new DamageText(this.boss.baseX, this.boss.baseY - 95, 'DEFEATED!', '#4ade80'));
        break;
      }

      default:
        break;
    }

    this.emitSnapshot();
  }

  update(dt) {
    this.time += dt;
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.4);

    this.hero.update(dt);
    this.boss.update(dt);

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.alive);

    for (const d of this.damageTexts) d.update(dt);
    this.damageTexts = this.damageTexts.filter((d) => d.alive);

    for (const s of this.slashes) s.life -= dt;
    this.slashes = this.slashes.filter((s) => s.life > 0);
  }
}
