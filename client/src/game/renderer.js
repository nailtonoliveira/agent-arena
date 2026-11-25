import { BOSS_STATES, HERO_STATES } from './entities.js';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
const HORIZON_Y = 295;

// 12x14 pixel-art Hero (Cyber-Knight)
const HERO_SPRITE = [
  '....pppp....',
  '...pppppp...',
  '...ppccpp...',
  '...pppppp...',
  '....dddd....',
  '..rrbbbbss..',
  '.rrrbbbbsss.',
  '.rr.bbbb.ss.',
  '....bbbb....',
  '...bb..bb...',
  '...bb..bb...',
  '..dd....dd..',
];

const HERO_PALETTE = {
  p: '#6366f1',
  c: '#22d3ee',
  d: '#cbd5e1',
  b: '#3b82f6',
  r: '#1d4ed8',
  s: '#94a3b8',
};

// 14x13 pixel-art Boss (Dungeon Glitch Demon)
const BOSS_SPRITE = [
  '..hh......hh..',
  '..hhh....hhh..',
  '...hhhhhhhh...',
  '..dddddddddd..',
  '.dddeeddeeedd.',
  '.dddddddddddd.',
  '..ddmmmmmmdd..',
  '.aaaaaaaamaaa.',
  'aa.aaaaaaaa.aa',
  'a..aaammaaa..a',
  '...aaa..aaa...',
  '..ddd....ddd..',
];

const BOSS_PALETTE = {
  h: '#f59e0b',
  d: '#991b1b',
  e: '#fef08a',
  m: '#ef4444',
  a: '#7f1d1d',
};

/**
 * Renders a string-grid pixel sprite centered horizontally and anchored near center-bottom.
 */
function drawPixelSprite(ctx, grid, palette, centerX, centerY, pixelSize, flashWhite = false) {
  const rows = grid.length;
  const cols = grid[0].length;
  const startX = Math.round(centerX - (cols * pixelSize) / 2);
  const startY = Math.round(centerY - rows * pixelSize + pixelSize * 2);

  for (let r = 0; r < rows; r += 1) {
    const row = grid[r];
    for (let c = 0; c < cols; c += 1) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = flashWhite ? '#ffffff' : palette[ch] || '#ffffff';
      ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
    }
  }
}

/**
 * Shared retro pixel progress bar renderer.
 */
function drawBar(ctx, x, y, width, height, ratio, fillColor, label) {
  const clamped = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = '#090d1c';
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, y, width, height);

  if (clamped > 0) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, Math.round(width * clamped), height);
  }

  if (label) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 5);
  }
}

function drawBubble(ctx, x, y, text, borderColor = '#38bdf8') {
  if (!text) return;
  ctx.save();
  ctx.font = 'bold 12px monospace';
  const truncated = text.length > 28 ? `${text.slice(0, 27)}…` : text;
  const paddingX = 10;
  const boxW = Math.max(76, ctx.measureText(truncated).width + paddingX * 2);
  const boxH = 26;
  const boxX = Math.round(x - boxW / 2);
  const boxY = Math.round(y);

  ctx.fillStyle = 'rgba(10, 15, 32, 0.92)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncated, x, boxY + boxH / 2 + 1);
  ctx.restore();
}

function drawBackground(ctx, time) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  skyGrad.addColorStop(0, '#070916');
  skyGrad.addColorStop(0.6, '#13112c');
  skyGrad.addColorStop(1, '#22153d');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

  // Subtle dungeon pillars
  ctx.fillStyle = '#120f29';
  for (let i = 0; i < 6; i += 1) {
    const px = 60 + i * 165;
    ctx.fillRect(px, 60, 28, HORIZON_Y - 60);
    const flicker = 0.55 + Math.sin(time * 8 + i * 2) * 0.2;
    ctx.fillStyle = `rgba(251, 146, 60, ${flicker})`;
    ctx.fillRect(px + 10, 118, 8, 10);
    ctx.fillStyle = '#120f29';
  }

  // Floor base
  const floorGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
  floorGrad.addColorStop(0, '#111834');
  floorGrad.addColorStop(1, '#060814');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

  // Cyberpunk perspective grid
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1;
  const vanishX = CANVAS_WIDTH / 2;
  const vanishY = HORIZON_Y - 40;

  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(vanishX + i * 50, HORIZON_Y);
    ctx.lineTo(vanishX + i * 135, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let r = 0; r < 8; r += 1) {
    const t = r / 7;
    const y = HORIZON_Y + Math.pow(t, 1.45) * (CANVAS_HEIGHT - HORIZON_Y);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y);
  ctx.lineTo(CANVAS_WIDTH, HORIZON_Y);
  ctx.stroke();
  ctx.restore();
}

function drawHero(ctx, hero) {
  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(hero.x - 36, hero.baseY + 12, 72, 12);

  // Scanning / cast aura
  if (hero.auraColor || hero.state === HERO_STATES.CAST) {
    const pulse = 36 + Math.sin(hero.time * 10) * 6;
    ctx.strokeStyle = hero.auraColor || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(hero.x - pulse, hero.y - 72, pulse * 2, 86);
  }

  const flashWhite = hero.flashTimer > 0 && Math.floor(hero.time * 24) % 2 === 0;
  drawPixelSprite(ctx, HERO_SPRITE, HERO_PALETTE, hero.x, hero.y, 6, flashWhite);

  // Sword/energy blade on right hand
  const swinging = hero.state === HERO_STATES.ATTACK;
  ctx.fillStyle = swinging ? '#fde047' : '#38bdf8';
  if (swinging) {
    ctx.fillRect(hero.x + 28, hero.y - 42, 42, 8);
  } else {
    ctx.fillRect(hero.x + 34, hero.y - 60, 8, 36);
  }

  // Hero HP & MP bars below sprite
  drawBar(ctx, hero.baseX - 60, hero.baseY + 38, 120, 10, hero.displayHp / hero.maxHp, '#22c55e', 'AGENT HP');
  drawBar(ctx, hero.baseX - 60, hero.baseY + 62, 120, 8, hero.displayMp / hero.maxMp, '#06b6d4', 'VIGOR / MP');

  drawBubble(ctx, hero.x, hero.y - 110, hero.bubbleText, '#38bdf8');
  ctx.restore();
}

function drawBoss(ctx, boss) {
  if (!boss.active || boss.deadAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = boss.deadAlpha;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(boss.x - 56, boss.baseY + 14, 112, 14);

  const flashWhite = boss.flashTimer > 0 && Math.floor(boss.time * 28) % 2 === 0;
  const scale = boss.points >= 150 ? 9 : 8;
  drawPixelSprite(ctx, BOSS_SPRITE, BOSS_PALETTE, boss.x, boss.y, scale, flashWhite);

  // Floating ticket name & smooth HP bar above Boss
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fca5a5';
  const title = boss.title.length > 38 ? `${boss.title.slice(0, 37)}…` : boss.title;
  ctx.fillText(title, boss.baseX, boss.baseY - 126);

  drawBar(ctx, boss.baseX - 95, boss.baseY - 114, 190, 12, boss.displayHp / boss.maxHp, '#ef4444');
  drawBubble(ctx, boss.x, boss.y - 156, boss.bubbleText, '#f87171');
  ctx.restore();
}

function drawSlashes(ctx, slashes) {
  for (const slash of slashes) {
    const progress = 1 - slash.life / slash.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, slash.life / slash.maxLife);
    ctx.strokeStyle = slash.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, 44 + progress * 24, -Math.PI * 0.4, Math.PI * 0.45);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticlesAndDamage(ctx, particles, damageTexts) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    ctx.restore();
  }

  for (const dmg of damageTexts) {
    ctx.save();
    ctx.globalAlpha = dmg.alpha;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(dmg.text, Math.round(dmg.x) + 2, Math.round(dmg.y) + 2);
    ctx.fillStyle = dmg.color;
    ctx.fillText(dmg.text, Math.round(dmg.x), Math.round(dmg.y));
    ctx.restore();
  }
}

function drawOverlays(ctx, state) {
  if (state.hurtFlash > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.45, state.hurtFlash)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  if (!state.boss.active && !state.victoryBanner) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(210, 88, 540, 54);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(210, 88, 540, 54);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText('ARENA READY — AWAITING QUEST EVENTS (:4848)', CANVAS_WIDTH / 2, 120);
    ctx.restore();
  }

  if (state.victoryBanner) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 28, 0.86)';
    ctx.fillRect(180, 74, 600, 96);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(180, 74, 600, 96);

    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#facc15';
    ctx.fillText('★ QUEST VICTORY ★', CANVAS_WIDTH / 2, 112);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#86efac';
    const summary = state.victoryBanner.summary || 'Task completed successfully';
    ctx.fillText(summary.slice(0, 58), CANVAS_WIDTH / 2, 146);
    ctx.restore();
  }
}

/**
 * Renders a complete 960x540 frame of AgentArena.
 */
export function renderArena(ctx, state) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (state.shakeTimer > 0) {
    const magnitude = state.shakeIntensity * (state.shakeTimer / 0.4);
    const sx = (Math.random() * 2 - 1) * magnitude;
    const sy = (Math.random() * 2 - 1) * magnitude;
    ctx.translate(Math.round(sx), Math.round(sy));
  }

  drawBackground(ctx, state.time);
  drawBoss(ctx, state.boss);
  drawHero(ctx, state.hero);
  drawSlashes(ctx, state.slashes);
  drawParticlesAndDamage(ctx, state.particles, state.damageTexts);

  ctx.restore();
  drawOverlays(ctx, state);
}
