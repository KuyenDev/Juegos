/**
 * 1. NEON VIPER (Snake — El Gusano, Cyber-Biomech Illustration)
 * Mecánica clásica con cola de direcciones, obstáculos procedurales por nivel,
 * alimentos especiales temporales y progresión infinita equilibrada.
 */
import {
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

export default class SnakeGame {
  constructor(api) {
    this.api = api;
    this.cols = 20;
    this.rows = 20;
    this.cellSize = 32;
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.food = null;
    this.bonusFood = null;
    this.obstacles = [];
    this.particles = [];
    this.shockwaves = [];
    this.moveAccumulator = 0;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.animTime = 0;
    this.backdrop = null;
  }

  init() {
    this.cellSize = Math.floor(this.api.width / this.cols);
    this._buildVisualAssets();
    this.resetState(1);
  }

  _buildVisualAssets() {
    const cs = this.cellSize;
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#050c1a');
      grad.addColorStop(1, '#0a1628');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      for (let gx = 0; gx < this.cols; gx++) {
        for (let gy = 0; gy < this.rows; gy++) {
          const x = gx * cs;
          const y = gy * cs;
          if ((gx + gy) % 2 === 0) {
            bctx.fillStyle = 'rgba(0, 245, 212, 0.025)';
            bctx.fillRect(x, y, cs, cs);
          }
          bctx.strokeStyle = 'rgba(14, 165, 233, 0.07)';
          bctx.lineWidth = 1;
          bctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
          if ((gx * 3 + gy * 5) % 11 === 0) {
            bctx.fillStyle = 'rgba(0, 245, 212, 0.12)';
            bctx.fillRect(x + cs * 0.45, y + cs * 0.45, 3, 3);
          }
        }
      }
      bctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
      bctx.lineWidth = 2;
      bctx.strokeRect(1, 1, w - 2, h - 2);
    });
  }

  start() {}

  restart() {
    this.resetState(1);
  }

  resetState(level = 1) {
    const midX = Math.floor(this.cols / 2);
    const midY = Math.floor(this.rows / 2);
    this.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
      { x: midX - 3, y: midY }
    ];
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.moveAccumulator = 0;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.particles = [];
    this.shockwaves = [];
    this.bonusFood = null;
    this._generateObstaclesForLevel(level);
    this._spawnFood();
    this._updateHudSpeed();
  }

  onLevelUp(newLevel, metrics) {
    this._generateObstaclesForLevel(newLevel);
    this.bannerText = metrics.isReliefWave
      ? `¡NIVEL ${newLevel} — OLEADA BONUS!`
      : `¡NIVEL ${newLevel} — NUEVOS OBSTÁCULOS!`;
    this.bannerTimer = 2.2;
    this._updateHudSpeed();
  }

  _updateHudSpeed() {
    const m = this.api.getDifficulty();
    this.api.updateStatusText(`${m.speedMultiplier}x`);
  }

  _generateObstaclesForLevel(level) {
    this.obstacles = [];
    if (level <= 1) return;

    const occupied = new Set(this.snake.map((s) => `${s.x},${s.y}`));
    if (this.food) occupied.add(`${this.food.x},${this.food.y}`);
    if (this.bonusFood) occupied.add(`${this.bonusFood.x},${this.bonusFood.y}`);
    // Proteger zona frente a la cabeza de la serpiente
    const head = this.snake[0];
    for (let dx = -2; dx <= 3; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        occupied.add(`${head.x + dx},${head.y + dy}`);
      }
    }

    const pattern = (level - 2) % 4;
    const candidates = [];

    if (pattern === 0) {
      // Pilares en las 4 esquinas interiores
      const pts = [
        [4, 4], [5, 4], [4, 5],
        [15, 4], [14, 4], [15, 5],
        [4, 15], [5, 15], [4, 14],
        [15, 15], [14, 15], [15, 14]
      ];
      candidates.push(...pts);
    } else if (pattern === 1) {
      // Barreras paralelas horizontales
      for (let x = 5; x <= 14; x++) {
        if (x === 9 || x === 10) continue;
        candidates.push([x, 5], [x, 14]);
      }
    } else if (pattern === 2) {
      // Compuertas laterales y núcleo
      for (let y = 4; y <= 15; y++) {
        if (y >= 8 && y <= 11) continue;
        candidates.push([4, y], [15, y]);
      }
    } else {
      // Constelación escalonada
      const count = Math.min(18, 6 + level * 2);
      for (let i = 0; i < count; i++) {
        const rx = 2 + ((i * 7 + level * 3) % (this.cols - 4));
        const ry = 2 + ((i * 5 + level * 2) % (this.rows - 4));
        candidates.push([rx, ry]);
      }
    }

    for (const [ox, oy] of candidates) {
      const key = `${ox},${oy}`;
      if (!occupied.has(key)) {
        this.obstacles.push({ x: ox, y: oy });
        occupied.add(key);
      }
    }
  }

  _isCellBlocked(x, y) {
    if (this.snake.some((s) => s.x === x && s.y === y)) return true;
    if (this.obstacles.some((o) => o.x === x && o.y === y)) return true;
    if (this.food && this.food.x === x && this.food.y === y) return true;
    if (this.bonusFood && this.bonusFood.x === x && this.bonusFood.y === y) return true;
    return false;
  }

  _spawnFood() {
    const freeCells = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this._isCellBlocked(x, y)) {
          freeCells.push({ x, y });
        }
      }
    }
    if (!freeCells.length) return;
    const pick = freeCells[Math.floor(Math.random() * freeCells.length)];
    this.food = { x: pick.x, y: pick.y, pulse: 0 };

    // Probabilidad de generar un cristal especial temporal
    if (!this.bonusFood && Math.random() < 0.28) {
      const bonusPick = freeCells[Math.floor(Math.random() * freeCells.length)];
      if (bonusPick.x !== pick.x || bonusPick.y !== pick.y) {
        this.bonusFood = {
          x: bonusPick.x,
          y: bonusPick.y,
          timer: 7.5,
          maxTimer: 7.5,
          type: Math.random() < 0.25 && this.snake.length > 8 ? 'trim' : 'gold'
        };
      }
    }
  }

  handleInput(evt) {
    if (evt.type === 'keydown' || evt.type === 'virtualdown' || evt.type === 'swipe') {
      const act = evt.action;
      const lastDir = this.dirQueue.length ? this.dirQueue[this.dirQueue.length - 1] : this.dir;
      let next = null;
      if (act === 'up' && lastDir.y === 0) next = { x: 0, y: -1 };
      else if (act === 'down' && lastDir.y === 0) next = { x: 0, y: 1 };
      else if (act === 'left' && lastDir.x === 0) next = { x: -1, y: 0 };
      else if (act === 'right' && lastDir.x === 0) next = { x: 1, y: 0 };

      if (next && this.dirQueue.length < 2) {
        this.dirQueue.push(next);
      }
    }
  }

  update(dt) {
    const diff = this.api.getDifficulty();
    const stepsPerSecond = diff.speed; // Base 7.5 hasta ~18.5 celdas/seg
    const stepInterval = 1 / stepsPerSecond;

    this.animTime += dt;
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    }

    if (this.food) {
      this.food.pulse += dt * 5;
    }

    if (this.bonusFood) {
      this.bonusFood.timer -= dt;
      if (this.bonusFood.timer <= 0) {
        this.bonusFood = null;
      }
    }

    // Actualizar partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.moveAccumulator += dt;
    while (this.moveAccumulator >= stepInterval) {
      this.moveAccumulator -= stepInterval;
      if (!this._stepSnake()) break;
    }
  }

  _stepSnake() {
    if (this.dirQueue.length > 0) {
      this.dir = this.dirQueue.shift();
    }

    const head = this.snake[0];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    // Colisión con paredes
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.api.triggerGameOver({ reason: 'Impacto contra el muro perimetral' });
      return false;
    }

    // Colisión con obstáculos
    if (this.obstacles.some((o) => o.x === nx && o.y === ny)) {
      this.api.triggerGameOver({ reason: 'Colisión contra barrera láser' });
      return false;
    }

    // Colisión con el propio cuerpo (excluyendo la punta de la cola si va a moverse)
    const bodyCheck = this.snake.slice(0, -1);
    if (bodyCheck.some((s) => s.x === nx && s.y === ny)) {
      this.api.triggerGameOver({ reason: 'Colisión con tu propia estela' });
      return false;
    }

    this.snake.unshift({ x: nx, y: ny });

    // Comprobar alimento principal
    if (this.food && nx === this.food.x && ny === this.food.y) {
      this.api.audio.play('pickup');
      this.api.addScore(15);
      this.api.advanceProgress(15);
      this._burstParticles(nx, ny, '#ff2a85');
      this._spawnFood();
    } else if (this.bonusFood && nx === this.bonusFood.x && ny === this.bonusFood.y) {
      this.api.audio.play('point');
      this.api.addScore(40);
      this.api.advanceProgress(25);
      this._burstParticles(nx, ny, '#ffbe0b');
      if (this.bonusFood.type === 'trim' && this.snake.length > 6) {
        this.snake.pop();
        this.snake.pop();
      }
      this.bonusFood = null;
    } else {
      this.snake.pop();
    }

    return true;
  }

  _burstParticles(gridX, gridY, color) {
    const cx = (gridX + 0.5) * this.cellSize;
    const cy = (gridY + 0.5) * this.cellSize;
    spawnShockwave(this.shockwaves, cx, cy, { color, maxRadius: this.cellSize * 1.1, life: 0.3 });
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const spd = 45 + Math.random() * 65;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        life: 0.35
      });
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const cs = this.cellSize;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#080e1a';
      ctx.fillRect(0, 0, w, h);
    }

    // Pilones Tesla láser obstáculo
    for (const obs of this.obstacles) {
      const ox = obs.x * cs + cs * 0.5;
      const oy = obs.y * cs + cs * 0.5;
      const pad = 2;
      drawGlowCircle(ctx, ox, oy, cs * 0.62, 'rgba(244, 63, 94, 0.25)');
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obs.x * cs + pad, obs.y * cs + pad, cs - pad * 2, cs - pad * 2, 5);
      ctx.fill();
      ctx.stroke();
      // Núcleo metálico + bobina X brillante
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(obs.x * cs + 6, obs.y * cs + 6);
      ctx.lineTo(obs.x * cs + cs - 6, obs.y * cs + cs - 6);
      ctx.moveTo(obs.x * cs + cs - 6, obs.y * cs + 6);
      ctx.lineTo(obs.x * cs + 6, obs.y * cs + cs - 6);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(ox, oy, cs * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bio-Fruta energética principal
    if (this.food) {
      const fx = (this.food.x + 0.5) * cs;
      const fy = (this.food.y + 0.5) * cs;
      const r = cs * 0.34 + Math.sin(this.food.pulse) * 2;
      drawGlowCircle(ctx, fx, fy, cs * 0.62, 'rgba(244, 63, 94, 0.45)');
      // Cuerpo de fruta energética
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(fx, fy + 1, r, 0, Math.PI * 2);
      ctx.fill();
      // Reflejo cristalino
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(fx - r * 0.3, fy - r * 0.2, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      // Hoja ciber-verde superior
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.ellipse(fx + 3, fy - r, 5, 2.8, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cristal especial (Bonus Dorado o Cryo-Trim)
    if (this.bonusFood) {
      const bx = (this.bonusFood.x + 0.5) * cs;
      const by = (this.bonusFood.y + 0.5) * cs;
      const isTrim = this.bonusFood.type === 'trim';
      const col = isTrim ? '#38bdf8' : '#facc15';
      const darkCol = isTrim ? '#0369a1' : '#b45309';
      drawGlowCircle(ctx, bx, by, cs * 0.65, isTrim ? 'rgba(56,189,248,0.45)' : 'rgba(250,204,21,0.45)');
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(this.animTime * 2.4);
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -cs * 0.38);
      ctx.lineTo(cs * 0.32, 0);
      ctx.lineTo(0, cs * 0.38);
      ctx.lineTo(-cs * 0.32, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = darkCol;
      ctx.beginPath();
      ctx.moveTo(0, -cs * 0.16);
      ctx.lineTo(cs * 0.14, 0);
      ctx.lineTo(0, cs * 0.16);
      ctx.lineTo(-cs * 0.14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Cuerpo biomecánico articulado de la Víbora
    const len = this.snake.length;
    for (let i = len - 1; i >= 1; i--) {
      const seg = this.snake[i];
      const cx = (seg.x + 0.5) * cs;
      const cy = (seg.y + 0.5) * cs;
      const t = 1 - i / Math.max(1, len);
      const isTail = i === len - 1;
      const radius = isTail ? cs * 0.25 : cs * (0.28 + 0.14 * t);

      // Conector espinal suave hacia el segmento anterior
      const prev = this.snake[i - 1];
      if (Math.abs(prev.x - seg.x) + Math.abs(prev.y - seg.y) === 1) {
        const px = (prev.x + 0.5) * cs;
        const py = (prev.y + 0.5) * cs;
        ctx.strokeStyle = i % 2 === 0 ? '#0d9488' : '#0891b2';
        ctx.lineWidth = radius * 1.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Placa de escama hexagonal/redondeada con núcleo dorsal
      ctx.fillStyle = i % 2 === 0 ? '#14b8a6' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 === 0 ? '#5eead4' : '#67e8f9';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cabeza blindada de Cyber-Viper con ojos, cuernos y lengua bífida
    if (len > 0) {
      const head = this.snake[0];
      const hx = (head.x + 0.5) * cs;
      const hy = (head.y + 0.5) * cs;
      const ang = Math.atan2(this.dir.y, this.dir.x);
      drawGlowCircle(ctx, hx, hy, cs * 0.65, 'rgba(0, 245, 212, 0.35)');
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);

      // Lengua láser bífida animada
      const tongueOut = Math.sin(this.animTime * 8) > 0.25;
      if (tongueOut) {
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cs * 0.32, 0);
        ctx.lineTo(cs * 0.55, 0);
        ctx.lineTo(cs * 0.65, -4);
        ctx.moveTo(cs * 0.55, 0);
        ctx.lineTo(cs * 0.65, 4);
        ctx.stroke();
      }

      // Hocico y placas cefálicas
      ctx.fillStyle = '#2dd4bf';
      ctx.strokeStyle = '#ecfeff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cs * 0.44, 0);
      ctx.lineTo(cs * 0.14, -cs * 0.4);
      ctx.lineTo(-cs * 0.38, -cs * 0.32);
      ctx.lineTo(-cs * 0.38, cs * 0.32);
      ctx.lineTo(cs * 0.14, cs * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Visor / ojos cibernéticos brillantes
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cs * 0.12, -cs * 0.18, 3, 0, Math.PI * 2);
      ctx.arc(cs * 0.12, cs * 0.18, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cs * 0.11, -cs * 0.2, 2, 3);
      ctx.fillRect(cs * 0.11, cs * 0.15, 2, 3);
      ctx.restore();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);

    // Partículas
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 0.35);
      ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    }
    ctx.globalAlpha = 1;

    // Banner de subida de nivel
    if (this.bannerTimer > 0) {
      ctx.fillStyle = 'rgba(8, 14, 26, 0.88)';
      ctx.beginPath();
      ctx.roundRect(w * 0.12, h * 0.42, w * 0.76, 54, 10);
      ctx.fill();
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#00f5d4';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.bannerText, w / 2, h * 0.42 + 34);
    }
  }

  destroy() {
    this.particles = [];
  }
}
