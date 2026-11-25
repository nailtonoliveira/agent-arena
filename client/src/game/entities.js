export const HERO_STATES = Object.freeze({
  IDLE: 'IDLE',
  ATTACK: 'ATTACK',
  HURT: 'HURT',
  CAST: 'CAST',
  VICTORY: 'VICTORY',
});

export const BOSS_STATES = Object.freeze({
  IDLE: 'IDLE',
  HURT: 'HURT',
  ATTACK: 'ATTACK',
  DEAD: 'DEAD',
});

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Shared timed-state mixin helper for Hero and Boss.
 */
function advanceTimedState(entity, dt, fallbackState) {
  entity.time += dt;
  if (entity.flashTimer > 0) {
    entity.flashTimer = Math.max(0, entity.flashTimer - dt);
  }
  if (entity.bubbleTimer > 0) {
    entity.bubbleTimer = Math.max(0, entity.bubbleTimer - dt);
    if (entity.bubbleTimer === 0) entity.bubbleText = '';
  }

  if (entity.stateDuration > 0) {
    entity.stateTime += dt;
    if (entity.stateTime >= entity.stateDuration) {
      entity.state = fallbackState;
      entity.stateTime = 0;
      entity.stateDuration = 0;
    }
  }
}

export class Hero {
  constructor() {
    this.baseX = 200;
    this.baseY = 350;
    this.x = this.baseX;
    this.y = this.baseY;
    this.maxHp = 100;
    this.hp = 100;
    this.displayHp = 100;
    this.maxMp = 100;
    this.mp = 100;
    this.displayMp = 100;
    this.state = HERO_STATES.IDLE;
    this.time = 0;
    this.stateTime = 0;
    this.stateDuration = 0;
    this.flashTimer = 0;
    this.auraColor = null;
    this.auraTimer = 0;
    this.bubbleText = '';
    this.bubbleTimer = 0;
  }

  reset() {
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.mp = this.maxMp;
    this.displayMp = this.maxMp;
    this.setState(HERO_STATES.IDLE, 0);
    this.auraTimer = 0;
    this.auraColor = null;
    this.flashTimer = 0;
  }

  setState(state, duration = 0) {
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration;
  }

  showBubble(text, duration = 2.2) {
    this.bubbleText = text;
    this.bubbleTimer = duration;
  }

  triggerAura(color = '#38bdf8', duration = 1.4) {
    this.auraColor = color;
    this.auraTimer = duration;
  }

  takeDamage(amount) {
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.flashTimer = 0.35;
    this.setState(HERO_STATES.HURT, 0.45);
  }

  update(dt) {
    advanceTimedState(this, dt, HERO_STATES.IDLE);

    if (this.auraTimer > 0) {
      this.auraTimer = Math.max(0, this.auraTimer - dt);
      if (this.auraTimer === 0) this.auraColor = null;
    }

    const lerpRate = Math.min(1, dt * 8);
    this.displayHp += (this.hp - this.displayHp) * lerpRate;
    this.displayMp += (this.mp - this.displayMp) * lerpRate;

    const progress = this.stateDuration > 0 ? clamp(this.stateTime / this.stateDuration, 0, 1) : 0;

    switch (this.state) {
      case HERO_STATES.ATTACK: {
        const lunge = Math.sin(progress * Math.PI);
        this.x = this.baseX + lunge * 165;
        this.y = this.baseY - lunge * 14;
        break;
      }
      case HERO_STATES.HURT: {
        const knockback = Math.sin(progress * Math.PI);
        this.x = this.baseX - knockback * 32;
        this.y = this.baseY + knockback * 6;
        break;
      }
      case HERO_STATES.CAST: {
        this.x = this.baseX;
        this.y = this.baseY - 14 + Math.sin(this.time * 6) * 5;
        break;
      }
      case HERO_STATES.VICTORY: {
        this.x = this.baseX;
        this.y = this.baseY - Math.abs(Math.sin(this.time * 5)) * 16;
        break;
      }
      default: {
        this.x = this.baseX;
        this.y = this.baseY + Math.sin(this.time * 3.2) * 3;
        break;
      }
    }
  }
}

export class Boss {
  constructor() {
    this.baseX = 760;
    this.baseY = 350;
    this.x = this.baseX;
    this.y = this.baseY;
    this.title = 'Awaiting Quest...';
    this.points = 100;
    this.maxHp = 100;
    this.hp = 100;
    this.displayHp = 100;
    this.active = false;
    this.state = BOSS_STATES.IDLE;
    this.time = 0;
    this.stateTime = 0;
    this.stateDuration = 0;
    this.flashTimer = 0;
    this.deadAlpha = 1;
    this.bubbleText = '';
    this.bubbleTimer = 0;
  }

  spawn(title = 'Unnamed Ticket', points = 100) {
    this.title = title;
    this.points = Math.max(20, Number(points) || 100);
    this.maxHp = this.points;
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.active = true;
    this.deadAlpha = 1;
    this.flashTimer = 0;
    this.x = this.baseX;
    this.y = this.baseY;
    this.setState(BOSS_STATES.IDLE, 0);
  }

  setState(state, duration = 0) {
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration;
  }

  showBubble(text, duration = 2.0) {
    this.bubbleText = text;
    this.bubbleTimer = duration;
  }

  takeDamage(amount, minFloor = 5) {
    if (!this.active || this.state === BOSS_STATES.DEAD) return 0;
    const nextHp = Math.max(minFloor, this.hp - amount);
    const dealt = Math.max(0, this.hp - nextHp);
    this.hp = nextHp;
    this.flashTimer = 0.28;
    this.setState(BOSS_STATES.HURT, 0.35);
    return dealt;
  }

  kill() {
    this.hp = 0;
    this.flashTimer = 0.4;
    this.setState(BOSS_STATES.DEAD, 0);
  }

  update(dt) {
    const fallback = this.state === BOSS_STATES.DEAD ? BOSS_STATES.DEAD : BOSS_STATES.IDLE;
    advanceTimedState(this, dt, fallback);

    this.displayHp += (this.hp - this.displayHp) * Math.min(1, dt * 7);

    const progress = this.stateDuration > 0 ? clamp(this.stateTime / this.stateDuration, 0, 1) : 0;

    switch (this.state) {
      case BOSS_STATES.HURT: {
        const shake = Math.sin(this.time * 55) * 9 * (1 - progress);
        this.x = this.baseX + shake + 8;
        this.y = this.baseY;
        break;
      }
      case BOSS_STATES.ATTACK: {
        const lunge = Math.sin(progress * Math.PI);
        this.x = this.baseX - lunge * 220;
        this.y = this.baseY - lunge * 10;
        break;
      }
      case BOSS_STATES.DEAD: {
        this.deadAlpha = Math.max(0, this.deadAlpha - dt * 0.9);
        this.x = this.baseX + Math.sin(this.time * 40) * 4 * this.deadAlpha;
        this.y = this.baseY + (1 - this.deadAlpha) * 28;
        break;
      }
      default: {
        this.x = this.baseX;
        this.y = this.baseY + Math.sin(this.time * 2.4) * 5;
        break;
      }
    }
  }
}

export class DamageText {
  constructor(x, y, text, color = '#facc15') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.vy = -52;
    this.life = 1.15;
    this.maxLife = 1.15;
  }

  get alive() {
    return this.life > 0;
  }

  get alpha() {
    return clamp(this.life / this.maxLife, 0, 1);
  }

  update(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.97;
    this.life = Math.max(0, this.life - dt);
  }
}

export class Particle {
  constructor(x, y, vx, vy, color, size = 4, life = 0.7, gravity = 200) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
  }

  get alive() {
    return this.life > 0;
  }

  get alpha() {
    return clamp(this.life / this.maxLife, 0, 1);
  }

  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life = Math.max(0, this.life - dt);
  }
}
