/**
 * 3. HYPER PONG (Tenis de Mesa Arcade — Holo-Arena / Cyber Air-Hockey)
 * Permite alternar entre Modo Duelo Progresivo y Modo Supervivencia.
 * Incluye ángulos variables, IA progresiva y obstáculos centrales en niveles avanzados.
 */
import {
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  spawnFXParticles,
  spawnShockwave,
  updateAndDrawFXParticles,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

export default class PongGame {
  constructor(api) {
    this.api = api;
    this.mode = 'duel'; // 'duel' | 'survival'
    this.player = { x: 28, y: 200, w: 14, h: 92, speed: 460 };
    this.ai = { x: 758, y: 200, w: 14, h: 92, speed: 340 };
    this.ball = { x: 400, y: 250, r: 9, vx: 340, vy: 180, speed: 380 };
    this.lives = 3;
    this.rallyCount = 0;
    this.obstacles = [];
    this.trail = [];
    this.particles = [];
    this.shockwaves = [];
    this.animTime = 0;
    this.backdrop = null;
  }

  init() {
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#040918');
      grad.addColorStop(0.5, '#091229');
      grad.addColorStop(1, '#0c0922');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Pista de Aero-Hockey holográfica
      bctx.strokeStyle = 'rgba(0, 245, 212, 0.22)';
      bctx.lineWidth = 2;
      bctx.strokeRect(10, 10, w - 20, h - 20);

      // Círculo central y arcos de portería
      bctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      bctx.beginPath();
      bctx.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
      bctx.stroke();
      bctx.beginPath();
      bctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
      bctx.stroke();

      bctx.strokeStyle = 'rgba(0, 245, 212, 0.28)';
      bctx.beginPath();
      bctx.arc(10, h / 2, 85, -Math.PI / 2, Math.PI / 2);
      bctx.stroke();
      bctx.strokeStyle = 'rgba(244, 63, 94, 0.28)';
      bctx.beginPath();
      bctx.arc(w - 10, h / 2, 85, Math.PI / 2, Math.PI * 1.5);
      bctx.stroke();

      // Rejilla sutil
      bctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      bctx.lineWidth = 1;
      for (let gx = 40; gx < w - 20; gx += 40) {
        bctx.beginPath();
        bctx.moveTo(gx, 12);
        bctx.lineTo(gx, h - 12);
        bctx.stroke();
      }
      for (let gy = 40; gy < h - 20; gy += 40) {
        bctx.beginPath();
        bctx.moveTo(12, gy);
        bctx.lineTo(w - 12, gy);
        bctx.stroke();
      }
    });
    this.restart();
  }

  start() {}

  restart() {
    this.lives = 3;
    this.rallyCount = 0;
    this._keyboardLock = false;
    this.player.y = this.api.height / 2 - this.player.h / 2;
    this.ai.y = this.api.height / 2 - this.ai.h / 2;
    this._setupLevelObstacles(1);
    this._resetBall(1);
    this._syncHud();
  }

  onLevelUp(newLevel) {
    this._setupLevelObstacles(newLevel);
    this._syncHud();
  }

  _syncHud() {
    const modeLabel = this.mode === 'survival' ? 'SUPERVIVENCIA' : 'DUELO';
    this.api.updateStatusText(`${modeLabel} · ♥${this.lives}`);
  }

  _setupLevelObstacles(level) {
    this.obstacles = [];
    if (level < 2) return;
    const midX = this.api.width / 2 - 8;
    const count = Math.min(3, Math.floor(level / 2));
    for (let i = 0; i < count; i++) {
      this.obstacles.push({
        x: midX + (i % 2 === 0 ? -40 : 40),
        y: 90 + i * 140,
        w: 14,
        h: 58,
        vy: (i % 2 === 0 ? 1 : -1) * Math.min(240, 70 + level * 10)
      });
    }
  }

  _resetBall(dirX = 1) {
    const diff = this.api.getDifficulty();
    this.ball.x = this.api.width / 2;
    this.ball.y = this.api.height / 2;
    this.ball.speed = 350 * diff.speedMultiplier;
    const angle = (Math.random() - 0.5) * 0.8;
    this.ball.vx = Math.cos(angle) * this.ball.speed * dirX;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
    this.rallyCount = 0;
    this.trail = [];
  }

  handleInput(evt) {
    if (
      (evt.type === 'keydown' || evt.type === 'virtualdown') &&
      (evt.action === 'mode' || evt.code === 'KeyM' || evt.action === 'secondary')
    ) {
      this.mode = this.mode === 'duel' ? 'survival' : 'duel';
      this.api.audio.play('click');
      this._syncHud();
      return;
    }

    if ((evt.type === 'keydown' || evt.type === 'virtualdown') && (evt.action === 'up' || evt.action === 'down')) {
      this._keyboardLock = true;
      return;
    }

    if (evt.type === 'paddletrack') {
      this._keyboardLock = false;
      const targetY = evt.y * (this.api.height - this.player.h - 24) + 12;
      this.player.y = Math.max(12, Math.min(this.api.height - this.player.h - 12, targetY));
      return;
    }

    if (evt.type === 'pointerdown') {
      this._keyboardLock = false;
      if (evt.pointerType === 'touch' && typeof evt.y === 'number') {
        const targetY = evt.y * this.api.height - this.player.h / 2;
        this.player.y = Math.max(12, Math.min(this.api.height - this.player.h - 12, targetY));
      } else if (evt.pointerType === 'mouse' && evt.insideTarget !== false) {
        const targetY = evt.y * this.api.height - this.player.h / 2;
        this.player.y = Math.max(12, Math.min(this.api.height - this.player.h - 12, targetY));
      }
      return;
    }

    if (evt.type === 'pointermove') {
      if (evt.isDown) {
        this._keyboardLock = false;
        const targetY = evt.y * this.api.height - this.player.h / 2;
        this.player.y = Math.max(12, Math.min(this.api.height - this.player.h - 12, targetY));
      } else if (
        evt.pointerType === 'mouse' &&
        evt.insideTarget &&
        !this._keyboardLock &&
        !this.api.input.isPressed('up') &&
        !this.api.input.isPressed('down')
      ) {
        const targetY = evt.y * this.api.height - this.player.h / 2;
        this.player.y = Math.max(12, Math.min(this.api.height - this.player.h - 12, targetY));
      }
    }
  }

  update(dt) {
    const h = this.api.height;
    const w = this.api.width;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);

    // Movimiento por teclado/botones
    if (this.api.input.isPressed('up')) {
      this.player.y -= this.player.speed * dt;
    }
    if (this.api.input.isPressed('down')) {
      this.player.y += this.player.speed * dt;
    }
    this.player.y = Math.max(12, Math.min(h - this.player.h - 12, this.player.y));

    // IA Rival (en modo supervivencia es un muro elástico rápido; en duelo escala según aiPrecision)
    const aiMaxSpeed = this.mode === 'survival'
      ? 680
      : Math.min(540, 270 + diff.aiPrecision * 260);
    const aiTargetY = this.ball.y - this.ai.h / 2;
    const dy = aiTargetY - this.ai.y;
    if (Math.abs(dy) > 6) {
      this.ai.y += Math.sign(dy) * Math.min(Math.abs(dy), aiMaxSpeed * dt);
    }
    this.ai.y = Math.max(12, Math.min(h - this.ai.h - 12, this.ai.y));

    // Mover obstáculos de niveles avanzados
    for (const obs of this.obstacles) {
      obs.y += obs.vy * dt;
      if (obs.y < 24 || obs.y + obs.h > h - 24) {
        obs.vy *= -1;
      }
    }

    // Mover pelota y guardar estela luminosa
    this.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.trail.length > 10) this.trail.shift();
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Rebote superior/inferior
    if (this.ball.y - this.ball.r < 10) {
      this.ball.y = 10 + this.ball.r;
      this.ball.vy = Math.abs(this.ball.vy);
      this.api.audio.play('bounce');
    } else if (this.ball.y + this.ball.r > h - 10) {
      this.ball.y = h - 10 - this.ball.r;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.api.audio.play('bounce');
    }

    // Colisión con paleta del jugador
    if (
      this.ball.vx < 0 &&
      this.ball.x - this.ball.r <= this.player.x + this.player.w &&
      this.ball.x + this.ball.r >= this.player.x &&
      this.ball.y >= this.player.y - 4 &&
      this.ball.y <= this.player.y + this.player.h + 4
    ) {
      const rel = (this.ball.y - (this.player.y + this.player.h / 2)) / (this.player.h / 2);
      const bounceAngle = rel * 1.05;
      this.ball.speed = Math.min(760, this.ball.speed * 1.045);
      this.ball.vx = Math.cos(bounceAngle) * this.ball.speed;
      this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;
      this.ball.x = this.player.x + this.player.w + this.ball.r;
      this.rallyCount++;
      spawnShockwave(this.shockwaves, this.ball.x, this.ball.y, { color: '#00f5d4', maxRadius: 34, life: 0.25 });
      spawnFXParticles(this.particles, this.ball.x, this.ball.y, 7, { colors: ['#00f5d4', '#ffffff'], angle: 0, spread: 1.4, speedMax: 160 });
      this.api.audio.play('bounce');
      this.api.addScore(10 + this.rallyCount * 2);
      this.api.advanceProgress(10);
    }

    // Colisión con paleta IA
    if (
      this.ball.vx > 0 &&
      this.ball.x + this.ball.r >= this.ai.x &&
      this.ball.x - this.ball.r <= this.ai.x + this.ai.w &&
      this.ball.y >= this.ai.y - 4 &&
      this.ball.y <= this.ai.y + this.ai.h + 4
    ) {
      const rel = (this.ball.y - (this.ai.y + this.ai.h / 2)) / (this.ai.h / 2);
      const bounceAngle = rel * 0.95;
      this.ball.speed = Math.min(760, this.ball.speed * 1.03);
      this.ball.vx = -Math.cos(bounceAngle) * this.ball.speed;
      this.ball.vy = Math.sin(bounceAngle) * this.ball.speed;
      this.ball.x = this.ai.x - this.ball.r;
      spawnShockwave(this.shockwaves, this.ball.x, this.ball.y, { color: '#ff2a85', maxRadius: 34, life: 0.25 });
      spawnFXParticles(this.particles, this.ball.x, this.ball.y, 7, { colors: ['#ff2a85', '#ffffff'], angle: Math.PI, spread: 1.4, speedMax: 160 });
      this.api.audio.play('bounce');
    }

    // Colisión con obstáculos centrales (resolución eje de mínima penetración)
    for (const obs of this.obstacles) {
      if (
        this.ball.x + this.ball.r > obs.x &&
        this.ball.x - this.ball.r < obs.x + obs.w &&
        this.ball.y + this.ball.r > obs.y &&
        this.ball.y - this.ball.r < obs.y + obs.h
      ) {
        const ox = Math.min(this.ball.x + this.ball.r - obs.x, obs.x + obs.w - (this.ball.x - this.ball.r));
        const oy = Math.min(this.ball.y + this.ball.r - obs.y, obs.y + obs.h - (this.ball.y - this.ball.r));
        if (ox < oy) {
          this.ball.vx *= -1;
          this.ball.x += Math.sign(this.ball.vx) * (ox + 2);
        } else {
          this.ball.vy *= -1;
          this.ball.y += Math.sign(this.ball.vy) * (oy + 2);
        }
        this.api.audio.play('hit');
      }
    }

    // Punto para el jugador si supera a la IA
    if (this.ball.x - this.ball.r > w) {
      this.api.audio.play('point');
      this.api.addScore(45);
      this.api.advanceProgress(25);
      this._resetBall(-1);
    }

    // Pelota perdida por el jugador
    if (this.ball.x + this.ball.r < 0) {
      this.lives--;
      this._syncHud();
      this.api.audio.play('explosion');
      if (this.lives <= 0) {
        this.api.triggerGameOver({ reason: 'Se agotaron tus escudos defensivos' });
        return;
      }
      this._resetBall(1);
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#070c1a';
      ctx.fillRect(0, 0, w, h);
    }

    // Línea divisoria luminosa
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.26)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2, 14);
    ctx.lineTo(w / 2, h - 14);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pilones deflectores centrales con núcleo energético
    for (const obs of this.obstacles) {
      drawGlowCircle(ctx, obs.x + obs.w / 2, obs.y + obs.h / 2, 32, 'rgba(250, 204, 21, 0.22)');
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(obs.x + 3, obs.y + 8, obs.w - 6, obs.h - 16);
    }

    // Propulsores y paletas mecánicas (Jugador & IA)
    const drawPaddle = (p, color, edgeColor, isLeft) => {
      drawGlowCircle(ctx, p.x + p.w / 2, p.y + p.h / 2, 42, `${color}28`);
      // Propulsores traseros
      const flame = 6 + Math.sin(this.animTime * 36) * 2.5;
      ctx.fillStyle = edgeColor;
      const fx = isLeft ? p.x - flame : p.x + p.w;
      ctx.fillRect(fx, p.y + 12, flame, 8);
      ctx.fillRect(fx, p.y + p.h - 20, flame, 8);
      // Chasis blindado
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 7);
      ctx.fill();
      ctx.stroke();
      // Núcleo frontal de impacto
      ctx.fillStyle = color;
      ctx.fillRect(isLeft ? p.x + p.w - 6 : p.x + 2, p.y + 6, 4, p.h - 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x + p.w / 2 - 1.5, p.y + p.h / 2 - 12, 3, 24);
    };

    drawPaddle(this.player, '#00f5d4', '#38bdf8', true);
    drawPaddle(this.ai, '#ff2a85', '#fb923c', false);

    // Estela y Disco/Esfera de Plasma
    for (let i = 0; i < this.trail.length; i++) {
      const tr = this.trail[i];
      const alpha = ((i + 1) / this.trail.length) * 0.35;
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, this.ball.r * (0.4 + 0.5 * ((i + 1) / this.trail.length)), 0, Math.PI * 2);
      ctx.fill();
    }

    drawGlowCircle(ctx, this.ball.x, this.ball.y, this.ball.r * 2.4, 'rgba(56, 189, 248, 0.5)');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r * 0.42, 0, Math.PI * 2);
    ctx.fill();

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);
  }

  destroy() {}
}
