/**
 * 6. VOID BASTION (Asteroids — Supervivencia Espacial, Sci-Fi Vector Illustration)
 * Rotación, propulsión con inercia, fragmentación de asteroides en 3 tamaños,
 * salto al hiperespacio con escudo temporal y cazadores espaciales en niveles avanzados.
 */
import {
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

export default class AsteroidsGame {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.ship = null;
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.shockwaves = [];
    this.shootCooldown = 0;
    this.hyperspaceCooldown = 0;
    this.ufo = null;
    this.ufoBullets = [];
    this.ufoSpawnTimer = 6;
    this.animTime = 0;
    this.thrusting = false;
    this.backdrop = null;
  }

  init() {
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#040610');
      grad.addColorStop(0.55, '#090d1f');
      grad.addColorStop(1, '#120824');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);
      drawGlowCircle(bctx, w * 0.25, h * 0.35, 220, 'rgba(56, 189, 248, 0.09)');
      drawGlowCircle(bctx, w * 0.78, h * 0.72, 240, 'rgba(244, 63, 94, 0.08)');
      for (let i = 0; i < 95; i++) {
        const sx = (i * 113 + 29) % w;
        const sy = (i * 67 + 41) % h;
        bctx.fillStyle = i % 5 === 0 ? 'rgba(125, 211, 252, 0.65)' : 'rgba(255, 255, 255, 0.4)';
        bctx.fillRect(sx, sy, i % 6 === 0 ? 2 : 1.3, i % 6 === 0 ? 2 : 1.3);
      }
    });
    this.restart();
  }

  start() {}

  restart() {
    this.lives = 3;
    this.bullets = [];
    this.particles = [];
    this.shockwaves = [];
    this.ufo = null;
    this.ufoBullets = [];
    this.ufoSpawnTimer = 7;
    this._resetShip();
    this._spawnAsteroidWave(1);
    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`♥ ${this.lives}`);
  }

  _resetShip() {
    this.ship = {
      x: this.api.width / 2,
      y: this.api.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      r: 14,
      invuln: 2.5
    };
  }

  _spawnAsteroidWave(level) {
    this.asteroids = [];
    const count = Math.min(11, 4 + level);
    for (let i = 0; i < count; i++) {
      // Asegurar que aparezcan lejos del centro
      let x = Math.random() * this.api.width;
      let y = Math.random() * this.api.height;
      if (Math.hypot(x - this.ship.x, y - this.ship.y) < 150) {
        x = (x + 260) % this.api.width;
        y = (y + 200) % this.api.height;
      }
      this.asteroids.push(this._makeAsteroid(x, y, 3, level));
    }
  }

  _makeAsteroid(x, y, tier, level = 1) {
    const radius = tier === 3 ? 42 : tier === 2 ? 24 : 13;
    const speedBase = (tier === 3 ? 65 : tier === 2 ? 105 : 155) * Math.min(2.3, 1 + (level - 1) * 0.08);
    const angle = Math.random() * Math.PI * 2;
    const vertices = [];
    const points = 9;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const rad = radius * (0.78 + Math.random() * 0.36);
      vertices.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    return {
      x,
      y,
      vx: Math.cos(angle) * speedBase,
      vy: Math.sin(angle) * speedBase,
      r: radius,
      tier,
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 2.2,
      vertices
    };
  }

  handleInput(evt) {
    if (evt.type === 'keydown' || evt.type === 'virtualdown') {
      if (evt.action === 'action') {
        this._fireBullet();
      } else if (evt.action === 'secondary' && this.hyperspaceCooldown <= 0) {
        this.ship.x = 60 + Math.random() * (this.api.width - 120);
        this.ship.y = 60 + Math.random() * (this.api.height - 120);
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.invuln = 1.2;
        this.hyperspaceCooldown = 3.0;
        this.api.audio.play('jump');
      }
    }
  }

  _fireBullet() {
    if (this.shootCooldown > 0) return;
    const speed = 520;
    this.bullets.push({
      x: this.ship.x + Math.cos(this.ship.angle) * 16,
      y: this.ship.y + Math.sin(this.ship.angle) * 16,
      vx: Math.cos(this.ship.angle) * speed + this.ship.vx * 0.3,
      vy: Math.sin(this.ship.angle) * speed + this.ship.vy * 0.3,
      life: 1.05
    });
    this.shootCooldown = 0.18;
    this.api.audio.play('laser');
  }

  update(dt) {
    const w = this.api.width;
    const h = this.api.height;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.hyperspaceCooldown > 0) this.hyperspaceCooldown -= dt;
    if (this.ship.invuln > 0) this.ship.invuln = Math.max(0, this.ship.invuln - dt);

    if (this.api.input.isPressed('left')) {
      this.ship.angle -= 3.8 * dt;
    }
    if (this.api.input.isPressed('right')) {
      this.ship.angle += 3.8 * dt;
    }
    this.animTime += dt;
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
    this.thrusting = this.api.input.isPressed('up');
    if (this.api.input.isPressed('up')) {
      const thrust = 290;
      this.ship.vx += Math.cos(this.ship.angle) * thrust * dt;
      this.ship.vy += Math.sin(this.ship.angle) * thrust * dt;
      // Estela de propulsión
      if (Math.random() < 0.65) {
        this.particles.push({
          x: this.ship.x - Math.cos(this.ship.angle) * 14,
          y: this.ship.y - Math.sin(this.ship.angle) * 14,
          vx: -Math.cos(this.ship.angle) * 90 + (Math.random() - 0.5) * 40,
          vy: -Math.sin(this.ship.angle) * 90 + (Math.random() - 0.5) * 40,
          life: 0.25,
          color: '#ff9e00'
        });
      }
    }
    if (this.api.input.isPressed('action')) {
      this._fireBullet();
    }

    // Fricción espacial independiente de FPS y límite máximo de velocidad
    const damping = Math.pow(0.55, dt);
    this.ship.vx *= damping;
    this.ship.vy *= damping;
    const shipSpd = Math.hypot(this.ship.vx, this.ship.vy);
    if (shipSpd > 420) {
      this.ship.vx = (this.ship.vx / shipSpd) * 420;
      this.ship.vy = (this.ship.vy / shipSpd) * 420;
    }
    this.ship.x = (this.ship.x + this.ship.vx * dt + w) % w;
    this.ship.y = (this.ship.y + this.ship.vy * dt + h) % h;

    // OVNI cazador ocasional a partir del nivel 2
    const curLevel = this.api.level.level;
    if (curLevel >= 2 && !this.ufo) {
      this.ufoSpawnTimer -= dt;
      if (this.ufoSpawnTimer <= 0) {
        const fromLeft = Math.random() < 0.5;
        this.ufo = {
          x: fromLeft ? -25 : w + 25,
          y: 70 + Math.random() * (h - 140),
          vx: (fromLeft ? 1 : -1) * Math.min(210, 120 + curLevel * 6),
          r: 18,
          shootTimer: 1.1
        };
        this.ufoSpawnTimer = Math.max(8, 15 - curLevel * 0.4);
      }
    }
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      this.ufo.y += Math.sin(this.ufo.x * 0.025) * 40 * dt;
      this.ufo.shootTimer -= dt;
      if (this.ufo.shootTimer <= 0) {
        const ang = Math.atan2(this.ship.y - this.ufo.y, this.ship.x - this.ufo.x);
        this.ufoBullets.push({
          x: this.ufo.x,
          y: this.ufo.y,
          vx: Math.cos(ang) * 260,
          vy: Math.sin(ang) * 260,
          life: 1.8
        });
        this.ufo.shootTimer = 1.6;
      }
      if (this.ufo.x < -60 || this.ufo.x > w + 60) {
        this.ufo = null;
      }
    }

    // Proyectiles del OVNI
    for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
      const ub = this.ufoBullets[i];
      ub.x = (ub.x + ub.vx * dt + w) % w;
      ub.y = (ub.y + ub.vy * dt + h) % h;
      ub.life -= dt;
      if (ub.life <= 0) {
        this.ufoBullets.splice(i, 1);
        continue;
      }
      if (this.ship.invuln <= 0 && Math.hypot(ub.x - this.ship.x, ub.y - this.ship.y) < this.ship.r + 4) {
        this.ufoBullets.splice(i, 1);
        this.lives--;
        this._syncHud();
        this.api.audio.play('explosion');
        if (this.lives <= 0) {
          this.api.triggerGameOver({ reason: 'Alcanzado por un cazador espacial' });
          return;
        }
        this._resetShip();
        break;
      }
    }

    // Proyectiles
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x = (b.x + b.vx * dt + w) % w;
      b.y = (b.y + b.vy * dt + h) % h;
      b.life -= dt;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (this.ufo && Math.hypot(b.x - this.ufo.x, b.y - this.ufo.y) <= this.ufo.r + 4) {
        this.api.addScore(150);
        this.api.audio.play('explosion');
        this.ufo = null;
        this.bullets.splice(i, 1);
      }
    }

    // Asteroides y colisiones
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.x = (a.x + a.vx * dt + w) % w;
      a.y = (a.y + a.vy * dt + h) % h;
      a.rot += a.rotSpeed * dt;

      // Colisión proyectil-asteroide
      let destroyed = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) <= a.r + 4) {
          this.bullets.splice(j, 1);
          this._splitAsteroid(i);
          destroyed = true;
          break;
        }
      }
      if (destroyed) continue;

      // Colisión nave-asteroide
      if (this.ship.invuln <= 0 && Math.hypot(a.x - this.ship.x, a.y - this.ship.y) < a.r + this.ship.r - 4) {
        this.lives--;
        this._syncHud();
        this.api.audio.play('explosion');
        if (this.lives <= 0) {
          this.api.triggerGameOver({ reason: 'Colisión catastrófica contra asteroide' });
          return;
        }
        this._resetShip();
        break;
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Siguiente oleada si se destruyeron todos los asteroides
    if (this.asteroids.length === 0) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(120);
      this.api.audio.play('levelUp');
      this._spawnAsteroidWave(nextLvl);
    }
  }

  _splitAsteroid(index) {
    const a = this.asteroids[index];
    this.asteroids.splice(index, 1);
    this.api.audio.play('explosion');
    this.api.addScore(a.tier === 3 ? 20 : a.tier === 2 ? 35 : 50);
    spawnShockwave(this.shockwaves, a.x, a.y, {
      color: a.tier === 3 ? '#94a3b8' : a.tier === 2 ? '#38bdf8' : '#f43f5e',
      maxRadius: a.r * 1.9,
      life: 0.32
    });

    for (let k = 0; k < 8; k++) {
      const ang = (Math.PI * 2 * k) / 8;
      this.particles.push({
        x: a.x,
        y: a.y,
        vx: Math.cos(ang) * 90,
        vy: Math.sin(ang) * 90,
        life: 0.35,
        color: '#00f5d4'
      });
    }

    if (a.tier > 1) {
      const lvl = this.api.level.level;
      this.asteroids.push(
        this._makeAsteroid(a.x, a.y, a.tier - 1, lvl),
        this._makeAsteroid(a.x, a.y, a.tier - 1, lvl)
      );
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);
    }

    // Partículas con desvanecimiento
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.35));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Asteroides rocosos sombreados con cráteres e interior mineral
    for (const a of this.asteroids) {
      const fillCol = a.tier === 3 ? '#1e293b' : a.tier === 2 ? '#172554' : '#3b0764';
      const rimCol = a.tier === 3 ? '#94a3b8' : a.tier === 2 ? '#38bdf8' : '#f43f5e';
      const craterCol = a.tier === 3 ? '#0f172a' : a.tier === 2 ? '#0c192c' : '#23043c';
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.fillStyle = fillCol;
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      a.vertices.forEach((v, idx) => {
        if (idx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cráteres interiores y grietas facetadas
      ctx.fillStyle = craterCol;
      ctx.beginPath();
      ctx.arc(-a.r * 0.28, -a.r * 0.18, a.r * 0.22, 0, Math.PI * 2);
      ctx.arc(a.r * 0.25, a.r * 0.2, a.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a.vertices[0].x * 0.65, a.vertices[0].y * 0.65);
      ctx.lineTo(a.vertices[3].x * 0.45, a.vertices[3].y * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    // OVNI cazador detallado con cúpula de cristal y luces rotatorias
    if (this.ufo) {
      const ux = this.ufo.x;
      const uy = this.ufo.y;
      drawGlowCircle(ctx, ux, uy, 30, 'rgba(244, 63, 94, 0.28)');
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(ux, uy + 2, this.ufo.r, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Cúpula luminosa
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ux, uy - 3, 9, Math.PI, 0);
      ctx.fill();
      // Balizas de energía en el anillo
      const blink = Math.floor(this.animTime * 8) % 2;
      ctx.fillStyle = blink ? '#fde047' : '#fb7185';
      for (let li = -1; li <= 1; li++) {
        ctx.fillRect(ux + li * 10 - 2, uy + 1, 4, 3);
      }
    }

    for (const ub of this.ufoBullets) {
      drawGlowCircle(ctx, ub.x, ub.y, 9, 'rgba(244, 63, 94, 0.55)');
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(ub.x, ub.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Proyectiles láser de plasma
    for (const b of this.bullets) {
      drawGlowCircle(ctx, b.x, b.y, 8, 'rgba(250, 204, 21, 0.48)');
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);

    // Interceptor Espacial Bastión con alas, cabina y llama propulsora
    ctx.save();
    ctx.translate(this.ship.x, this.ship.y);
    ctx.rotate(this.ship.angle);
    if (this.ship.invuln > 0) {
      drawGlowCircle(ctx, 0, 0, 26, 'rgba(0, 245, 212, 0.22)');
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cono de llama del propulsor si acelera
    if (this.thrusting) {
      const fLen = 14 + Math.sin(this.animTime * 48) * 5;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-9 - fLen, 0);
      ctx.lineTo(-9, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-9, -2);
      ctx.lineTo(-9 - fLen * 0.55, 0);
      ctx.lineTo(-9, 2);
      ctx.closePath();
      ctx.fill();
    }

    // Fuselaje principal e alerones
    ctx.fillStyle = '#0f766e';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(3, -5);
    ctx.lineTo(-11, -13);
    ctx.lineTo(-14, -7);
    ctx.lineTo(-8, -3);
    ctx.lineTo(-8, 3);
    ctx.lineTo(-14, 7);
    ctx.lineTo(-11, 13);
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cabina iluminada
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.ellipse(4, 0, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  destroy() {
    this.particles = [];
  }
}
