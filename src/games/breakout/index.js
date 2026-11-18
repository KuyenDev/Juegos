/**
 * 4. PRISM BREAKER (Breakout — Rompe Ladrillos, Crystal Synth-Arcade)
 * Niveles generados proceduralmente con patrones variados, bloques de distinta resistencia,
 * bloques explosivos y bonificaciones (Multibola, Paleta Ancha, Cañón Láser y Escudo Extra).
 */
import {
  createCachedBackdrop,
  drawBeveledBlock,
  drawCachedBackdrop,
  drawGlowCircle,
  spawnFXParticles,
  spawnShockwave,
  updateAndDrawFXParticles,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

export default class BreakoutGame {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.paddle = { x: 320, y: 520, w: 112, baseW: 112, h: 14, speed: 540, laserTimer: 0, wideTimer: 0 };
    this.balls = [];
    this.bricks = [];
    this.powerUps = [];
    this.lasers = [];
    this.particles = [];
    this.shockwaves = [];
    this.particles = [];
    this.shockwaves = [];
    this.laserCooldown = 0;
    this.animTime = 0;
    this.backdrop = null;
  }

  init() {
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#070514');
      grad.addColorStop(0.6, '#120a2e');
      grad.addColorStop(1, '#1a0b28');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Rejilla prismática sutil
      bctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      bctx.lineWidth = 1;
      for (let gx = 0; gx <= w; gx += 38) {
        bctx.beginPath();
        bctx.moveTo(gx, 0);
        bctx.lineTo(gx, h);
        bctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += 38) {
        bctx.beginPath();
        bctx.moveTo(0, gy);
        bctx.lineTo(w, gy);
        bctx.stroke();
      }
      // Marco energético del campo de juego
      bctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      bctx.lineWidth = 3;
      bctx.strokeRect(4, 4, w - 8, h - 8);
    });
    this.restart();
  }

  start() {}

  restart() {
    this.lives = 3;
    this.powerUps = [];
    this.lasers = [];
    this.particles = [];
    this.shockwaves = [];
    this._buildLevel(1);
  }

  _buildLevel(level) {
    const diff = this.api.getDifficulty();
    this.paddle.baseW = Math.max(76, 116 - level * 2);
    this.paddle.w = this.paddle.baseW;
    this.paddle.x = this.api.width / 2 - this.paddle.w / 2;
    this.paddle.y = this.api.height - 34;
    this.paddle.laserTimer = 0;
    this.paddle.wideTimer = 0;
    this.powerUps = [];
    this.lasers = [];
    this.particles = [];
    this.shockwaves = [];

    this._spawnAttachedBall();
    this._generateBricks(level, diff);
    this._syncHud();
  }

  _spawnAttachedBall() {
    const diff = this.api.getDifficulty();
    const baseSpd = Math.min(620, 360 * diff.speedMultiplier);
    this.balls = [
      {
        x: this.paddle.x + this.paddle.w / 2,
        y: this.paddle.y - 10,
        r: 8,
        vx: baseSpd * 0.6,
        vy: -baseSpd * 0.8,
        speed: baseSpd,
        attached: true
      }
    ];
  }

  _generateBricks(level, diff) {
    this.bricks = [];
    const cols = 10;
    const rows = Math.min(8, 4 + Math.floor(level / 2));
    const padX = 36;
    const padY = 52;
    const gap = 6;
    const bw = Math.floor((this.api.width - padX * 2 - gap * (cols - 1)) / cols);
    const bh = 22;
    const pattern = (level - 1) % 5;
    const palette = ['#00f5d4', '#00bbf9', '#ffbe0b', '#ff9e00', '#ff2a85', '#9b5de5'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Aplicar patrón geométrico según el nivel
        if (pattern === 1 && (r + c) % 2 !== 0 && r > 0) continue;
        if (pattern === 2 && (c === 4 || c === 5) && r > 1) continue;
        if (pattern === 3 && Math.abs(c - 4.5) + r < 2.5) continue;

        const maxHp = Math.min(4, 1 + Math.floor((rows - r + level - 1) / 3));
        const isExplosive = Math.random() < Math.min(0.14, 0.05 + diff.level * 0.01);

        this.bricks.push({
          x: padX + c * (bw + gap),
          y: padY + r * (bh + gap),
          w: bw,
          h: bh,
          hp: isExplosive ? 1 : maxHp,
          maxHp: isExplosive ? 1 : maxHp,
          type: isExplosive ? 'bomb' : 'normal',
          color: isExplosive ? '#ff2a85' : palette[(r + level) % palette.length]
        });
      }
    }
  }

  _syncHud() {
    this.api.updateStatusText(`♥ ${this.lives}`);
  }

  handleInput(evt) {
    if (evt.type === 'pointermove' || evt.type === 'pointerdown') {
      this.paddle.x = Math.max(
        10,
        Math.min(this.api.width - this.paddle.w - 10, evt.x * this.api.width - this.paddle.w / 2)
      );
      if (evt.type === 'pointerdown') {
        this._launchOrFire();
      }
    } else if (
      (evt.type === 'keydown' || evt.type === 'virtualdown') &&
      (evt.action === 'action' || evt.action === 'up')
    ) {
      this._launchOrFire();
    }
  }

  _launchOrFire() {
    let launched = false;
    for (const b of this.balls) {
      if (b.attached) {
        b.attached = false;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        b.vx = Math.cos(angle) * b.speed;
        b.vy = Math.sin(angle) * b.speed;
        launched = true;
      }
    }
    if (launched) {
      this.api.audio.play('bounce');
      return;
    }
    if (this.paddle.laserTimer > 0 && this.laserCooldown <= 0) {
      this.lasers.push(
        { x: this.paddle.x + 12, y: this.paddle.y - 6, w: 4, h: 14 },
        { x: this.paddle.x + this.paddle.w - 16, y: this.paddle.y - 6, w: 4, h: 14 }
      );
      this.laserCooldown = 0.25;
      this.api.audio.play('laser');
    }
  }

  update(dt) {
    const w = this.api.width;
    const h = this.api.height;

    this.animTime += dt;
    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.paddle.laserTimer > 0) this.paddle.laserTimer = Math.max(0, this.paddle.laserTimer - dt);
    if (this.paddle.wideTimer > 0) {
      this.paddle.wideTimer = Math.max(0, this.paddle.wideTimer - dt);
      if (this.paddle.wideTimer === 0) {
        this.paddle.w = this.paddle.baseW;
      }
    }

    if (this.api.input.isPressed('left')) {
      this.paddle.x -= this.paddle.speed * dt;
    }
    if (this.api.input.isPressed('right')) {
      this.paddle.x += this.paddle.speed * dt;
    }
    this.paddle.x = Math.max(10, Math.min(w - this.paddle.w - 10, this.paddle.x));

    // Disparo automático ocasional si tiene láser activo
    if (this.paddle.laserTimer > 0 && this.api.input.isPressed('action') && this.laserCooldown <= 0) {
      this._launchOrFire();
    }

    // Actualizar láseres
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y -= 560 * dt;
      if (l.y < 0) {
        this.lasers.splice(i, 1);
        continue;
      }
      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const br = this.bricks[j];
        if (l.x < br.x + br.w && l.x + l.w > br.x && l.y < br.y + br.h && l.y + l.h > br.y) {
          this._damageBrick(j);
          this.lasers.splice(i, 1);
          break;
        }
      }
    }

    // Actualizar bonificaciones que caen
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += 175 * dt;
      if (
        p.y + p.r >= this.paddle.y &&
        p.y - p.r <= this.paddle.y + this.paddle.h &&
        p.x >= this.paddle.x &&
        p.x <= this.paddle.x + this.paddle.w
      ) {
        this._applyPowerUp(p.kind);
        this.powerUps.splice(i, 1);
      } else if (p.y - p.r > h) {
        this.powerUps.splice(i, 1);
      }
    }

    // Actualizar pelotas
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      if (b.attached) {
        b.x = this.paddle.x + this.paddle.w / 2;
        b.y = this.paddle.y - b.r - 2;
        continue;
      }

      // Sub-stepping si la pelota viaja rápido para no atravesar bloques
      const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 10));
      const subDt = dt / steps;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        if (b.x - b.r < 8) {
          b.x = 8 + b.r;
          b.vx = Math.abs(b.vx);
          this.api.audio.play('bounce');
        } else if (b.x + b.r > w - 8) {
          b.x = w - 8 - b.r;
          b.vx = -Math.abs(b.vx);
          this.api.audio.play('bounce');
        }

        if (b.y - b.r < 8) {
          b.y = 8 + b.r;
          b.vy = Math.abs(b.vy);
          this.api.audio.play('bounce');
        }

        // Rebote con la plataforma
        if (
          b.vy > 0 &&
          b.y + b.r >= this.paddle.y &&
          b.y - b.r <= this.paddle.y + this.paddle.h &&
          b.x >= this.paddle.x - 4 &&
          b.x <= this.paddle.x + this.paddle.w + 4
        ) {
          const hitOffset = (b.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
          const clampedOffset = Math.max(-0.95, Math.min(0.95, hitOffset));
          const angle = clampedOffset * 1.1; // -63° a +63°
          b.speed = Math.min(680, b.speed * 1.015);
          b.vx = Math.sin(angle) * b.speed;
          b.vy = -Math.cos(angle) * b.speed;
          b.y = this.paddle.y - b.r - 1;
          this.api.audio.play('bounce');
        }

        // Colisión con ladrillos
        for (let j = this.bricks.length - 1; j >= 0; j--) {
          const br = this.bricks[j];
          if (
            b.x + b.r > br.x &&
            b.x - b.r < br.x + br.w &&
            b.y + b.r > br.y &&
            b.y - b.r < br.y + br.h
          ) {
            const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
            const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
            if (overlapX < overlapY) {
              b.vx *= -1;
            } else {
              b.vy *= -1;
            }
            // Garantizar componente vertical mínima para evitar bucles horizontales infinitos
            const minVy = b.speed * 0.22;
            if (Math.abs(b.vy) < minVy) {
              b.vy = (b.vy >= 0 ? 1 : -1) * minVy;
            }
            this._damageBrick(j);
            break;
          }
        }
      }

      // Pelota cae fuera
      if (b.y - b.r > h) {
        this.balls.splice(i, 1);
      }
    }

    if (this.balls.length === 0) {
      this.lives--;
      this._syncHud();
      this.api.audio.play('explosion');
      if (this.lives <= 0) {
        this.api.triggerGameOver({ reason: 'Todas las esferas de energía se perdieron' });
        return;
      }
      this._spawnAttachedBall();
    }

    // Nivel superado si no quedan bloques
    if (this.bricks.length === 0) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(120);
      this.api.audio.play('levelUp');
      this._buildLevel(nextLvl);
    }
  }

  _damageBrick(index) {
    const br = this.bricks[index];
    if (!br) return;
    br.hp -= 1;
    if (br.hp > 0) {
      this.api.audio.play('hit');
      this.api.addScore(5);
      return;
    }

    this.bricks.splice(index, 1);
    this.api.audio.play('brick');
    this.api.addScore(15);
    const cx = br.x + br.w / 2;
    const cy = br.y + br.h / 2;
    spawnFXParticles(this.particles, cx, cy, 10, {
      colors: [br.color, '#ffffff', '#e0f2fe'],
      speedMax: 165,
      gravity: 240
    });

    // Si era un bloque explosivo, daña bloques vecinos
    if (br.type === 'bomb') {
      this.api.audio.play('explosion');
      spawnShockwave(this.shockwaves, cx, cy, { color: '#fb923c', maxRadius: 96, life: 0.35, lineWidth: 4 });
      for (let k = this.bricks.length - 1; k >= 0; k--) {
        const nb = this.bricks[k];
        if (Math.hypot(nb.x + nb.w / 2 - cx, nb.y + nb.h / 2 - cy) < 95) {
          spawnFXParticles(this.particles, nb.x + nb.w / 2, nb.y + nb.h / 2, 7, { colors: [nb.color, '#fde047'], speedMax: 140 });
          this.bricks.splice(k, 1);
          this.api.addScore(15);
        }
      }
    }

    // Probabilidad de soltar bonificación
    if (Math.random() < 0.22) {
      const kinds = ['multiball', 'wide', 'laser', 'life'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.powerUps.push({
        x: br.x + br.w / 2,
        y: br.y + br.h / 2,
        r: 11,
        kind
      });
    }
  }

  _applyPowerUp(kind) {
    this.api.audio.play('pickup');
    this.api.addScore(30);
    if (kind === 'wide') {
      this.paddle.w = Math.min(200, this.paddle.baseW * 1.45);
      this.paddle.x = Math.min(this.paddle.x, this.api.width - this.paddle.w - 10);
      this.paddle.wideTimer = 12;
    } else if (kind === 'laser') {
      this.paddle.laserTimer = 10;
    } else if (kind === 'life') {
      this.lives = Math.min(6, this.lives + 1);
      this._syncHud();
    } else if (kind === 'multiball') {
      const ref = this.balls[0];
      if (ref && this.balls.length < 6) {
        ref.attached = false;
        this.balls.push(
          {
            ...ref,
            vx: -Math.abs(ref.speed * 0.65),
            vy: -Math.abs(ref.speed * 0.75),
            attached: false
          },
          {
            ...ref,
            vx: Math.abs(ref.speed * 0.65),
            vy: -Math.abs(ref.speed * 0.75),
            attached: false
          }
        );
      }
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#0a0717';
      ctx.fillRect(0, 0, w, h);
    }

    // Ladrillos de cristal biselados con grietas de daño y núcleos explosivos
    for (const br of this.bricks) {
      drawBeveledBlock(
        ctx,
        br.x,
        br.y,
        br.w,
        br.h,
        br.color,
        'rgba(255,255,255,0.4)',
        'rgba(0,0,0,0.42)',
        { radius: 4, bevel: 3, gloss: true, border: 'rgba(15, 23, 42, 0.7)' }
      );

      if (br.hp > 1) {
        // Marco metálico reforzado en bloques multi-impacto
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(br.x + 3, br.y + 3, br.w - 6, br.h - 6);
        ctx.fillStyle = '#090d1a';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(br.hp), br.x + br.w / 2, br.y + 15);
      } else if (br.type === 'bomb') {
        const pulse = 3 + Math.sin(this.animTime * 10) * 1.2;
        drawGlowCircle(ctx, br.x + br.w / 2, br.y + br.h / 2, 11, 'rgba(253, 224, 71, 0.65)');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(br.x + br.w / 2, br.y + br.h / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Nave magnética Vaus (Plataforma con propulsores, cabina central y cañones láser)
    const p = this.paddle;
    const pColor = p.laserTimer > 0 ? '#ff2a85' : p.wideTimer > 0 ? '#facc15' : '#00f5d4';
    drawGlowCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, p.w * 0.48, `${pColor}22`);

    // Cañones laterales cuando el láser está activo
    if (p.laserTimer > 0) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(p.x + 8, p.y - 7, 5, 8);
      ctx.fillRect(p.x + p.w - 13, p.y - 7, 5, 8);
    }

    // Cuerpo principal metálico con cápsulas laterales y núcleo brillante
    drawBeveledBlock(
      ctx,
      p.x + 6,
      p.y,
      p.w - 12,
      p.h,
      '#1e293b',
      'rgba(255,255,255,0.35)',
      'rgba(0,0,0,0.55)',
      { radius: 5, bevel: 3, gloss: true, border: pColor }
    );
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y - 1, 14, p.h + 2, 6);
    ctx.roundRect(p.x + p.w - 14, p.y - 1, 14, p.h + 2, 6);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(p.x + p.w * 0.35, p.y + 4, p.w * 0.3, p.h - 8);

    // Proyectiles láser con aura
    for (const l of this.lasers) {
      drawGlowCircle(ctx, l.x + l.w / 2, l.y + l.h / 2, 8, 'rgba(250, 204, 21, 0.5)');
      ctx.fillStyle = '#fde047';
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(l.x + 1, l.y + 1, l.w - 2, l.h - 2);
    }

    // Cápsulas de bonificación giratorias ('M', 'W', 'L', '♥')
    for (const pu of this.powerUps) {
      const col =
        pu.kind === 'multiball'
          ? '#00f5d4'
          : pu.kind === 'wide'
          ? '#facc15'
          : pu.kind === 'laser'
          ? '#ff2a85'
          : '#34d399';
      drawGlowCircle(ctx, pu.x, pu.y, 17, `${col}44`);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(pu.x - 14, pu.y - 9, 28, 18, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pu.kind === 'life' ? '♥' : pu.kind[0].toUpperCase(), pu.x, pu.y + 4);
    }

    // Esferas de energía con núcleo luminoso
    for (const b of this.balls) {
      drawGlowCircle(ctx, b.x, b.y, b.r * 2.2, 'rgba(56, 189, 248, 0.45)');
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x - 2, b.y - 2, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);
  }

  destroy() {}
}
