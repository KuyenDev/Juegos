/**
 * 16. DUSTY TRAILS (Sunset Riders-like — Western Run & Gun, Colorful Arcade)
 * Acción western de desplazamiento lateral por pueblos al atardecer:
 * salto entre tejados, barrida esquiva, disparo direccional, doble revólver y duelos contra Jefes Forajidos.
 */
import {
  compilePixelSprite,
  compileSpriteFrames,
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  drawSprite,
  spawnFXParticles,
  spawnShockwave,
  updateAndDrawFXParticles,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

const COWBOY_FRAMES = [
  [
    '.....YYYYYY.....',
    '....YYYYYYYY....',
    '..YYYYGGGGYYYY..',
    '....SSSSSSSS....',
    '....SKKSKKSS....',
    '.....RRRRRR.....',
    '...MMRRRRRRMM...',
    '..MMCCRRRRCCMM..',
    '..MCCRRRRRRCCSS.',
    '...CCCCYYCCCC...',
    '....CCCCCCCC....',
    '....CCC..CCC....',
    '...CCC....CCC...',
    '...BB......BB...',
    '..BBB......BBB..',
    '................'
  ],
  [
    '.....YYYYYY.....',
    '....YYYYYYYY....',
    '..YYYYGGGGYYYY..',
    '....SSSSSSSS....',
    '....SKKSKKSS....',
    '.....RRRRRR.....',
    '...MMRRRRRRMM...',
    '..MMCCRRRRCCMM..',
    '..MCCRRRRRRCCSS.',
    '...CCCCYYCCCC...',
    '....CCCCCCCC....',
    '...CCC...CCC....',
    '..CCC.....CCC...',
    '..BB.......BB...',
    '.BBB......BBB...',
    '................'
  ]
];

const BANDIT_FRAMES = [
  [
    '.....KKKKKK.....',
    '....KKKKKKKK....',
    '..KKKKRRRRKKKK..',
    '....SSSSSSSS....',
    '....SKKSKKSS....',
    '....RRRRRRRR....',
    '..SSRRRRRRRRSS..',
    '..KSSRRRRRRSSK..',
    '....DDDDDDDD....',
    '....DDDYYDDD....',
    '....DDD..DDD....',
    '...DDD....DDD...',
    '...KK......KK...',
    '..KKK......KKK..',
    '................',
    '................'
  ],
  [
    '.....KKKKKK.....',
    '....KKKKKKKK....',
    '..KKKKRRRRKKKK..',
    '....SSSSSSSS....',
    '....SKKSKKSS....',
    '....RRRRRRRR....',
    '..SSRRRRRRRRSS..',
    '..KSSRRRRRRSSK..',
    '....DDDDDDDD....',
    '....DDDYYDDD....',
    '...DDD...DDD....',
    '..DDD.....DDD...',
    '..KK.......KK...',
    '.KKK......KKK...',
    '................',
    '................'
  ]
];

const OUTLAW_BOSS_GRID = [
  '.....GGGGGG.....',
  '...GGKKKKKKGG...',
  '.KKKKYYYYYYKKKK.',
  '....SSSSSSSS....',
  '....SKKSKKSS....',
  '...RRRRRRRRRR...',
  '..KRRRRRRRRRRK..',
  '.KKRRRRYYRRRRKK.',
  'KKKRRRRRRRRRRKKK',
  '.KKKRRRRRRRRKKK.',
  '..KKKDDDDDDKKK..',
  '..KKKDDDDDDKKK..',
  '...KKK....KKK...',
  '...BB......BB...',
  '..BBB......BBB..',
  '................'
];

const TNT_BARREL_GRID = [
  '..KKKKKKKKKKKK..',
  '.KBBBBBBBBBBBBK.',
  'KBYYYYYYYYYYYYBK',
  'KBRRRRRRRRRRRRBK',
  'KBRRRRRRRRRRRRBK',
  'KBYYYYYYYYYYYYBK',
  'KBRRWWWRRWWWRRBK',
  'KBRRRWRRRRWRRRBK',
  'KBRRRWRRRRWRRRBK',
  'KBYYYYYYYYYYYYBK',
  'KBRRRRRRRRRRRRBK',
  'KBRRRRRRRRRRRRBK',
  'KBYYYYYYYYYYYYBK',
  '.KBBBBBBBBBBBBK.',
  '..KKKKKKKKKKKK..',
  '................'
];

export default class SunsetRidersGame {
  constructor(api) {
    this.api = api;
    this.groundY = 424;
    this.cameraX = 0;
    this.stageLength = 2350;
    this.lives = 4;
    this.rapidFireTimer = 0;
    this.player = null;
    this.balconies = [];
    this.barrels = [];
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.dynamites = [];
    this.coins = [];
    this.particles = [];
    this.shockwaves = [];
    this.boss = null;
    this.shootCooldown = 0;
    this.animTime = 0;
    this.muzzleTimer = 0;
    this.sprites = null;
    this.skyBackdrop = null;
  }

  init() {
    this.groundY = this.api.height - 62;
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    this.sprites = {
      cowboy: compileSpriteFrames(COWBOY_FRAMES, {
        Y: '#fef08a', G: '#eab308', S: '#fed7aa', K: '#0f172a', R: '#ec4899', M: '#be185d', C: '#0284c7', B: '#451a03'
      }, 2.4),
      bandit: compileSpriteFrames(BANDIT_FRAMES, {
        K: '#1e293b', R: '#dc2626', S: '#fed7aa', D: '#78350f', Y: '#facc15'
      }, 2.3),
      bomber: compileSpriteFrames(BANDIT_FRAMES, {
        K: '#1e293b', R: '#d97706', S: '#fed7aa', D: '#451a03', Y: '#fde047'
      }, 2.3),
      boss: compilePixelSprite(OUTLAW_BOSS_GRID, {
        G: '#475569', K: '#0f172a', Y: '#facc15', S: '#fed7aa', R: '#b91c1c', D: '#334155', B: '#451a03'
      }, 3.6),
      barrel: compilePixelSprite(TNT_BARREL_GRID, {
        K: '#1f2937', B: '#78350f', Y: '#fbbf24', R: '#dc2626', W: '#ffffff'
      }, 2.2)
    };

    this.skyBackdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w) => {
      const sky = bctx.createLinearGradient(0, 0, 0, this.groundY);
      sky.addColorStop(0, '#1e0b36');
      sky.addColorStop(0.45, '#9d174d');
      sky.addColorStop(0.82, '#ea580c');
      sky.addColorStop(1, '#fbbf24');
      bctx.fillStyle = sky;
      bctx.fillRect(0, 0, w, this.groundY);

      // Sol poniente con halo cálido
      drawGlowCircle(bctx, w * 0.72, 132, 120, 'rgba(253, 224, 71, 0.36)');
      bctx.fillStyle = '#fde047';
      bctx.beginPath();
      bctx.arc(w * 0.72, 132, 54, 0, Math.PI * 2);
      bctx.fill();

      // Cordilleras y mesetas del desierto lejanas
      bctx.fillStyle = '#4c1d3d';
      bctx.beginPath();
      bctx.moveTo(0, this.groundY);
      bctx.lineTo(0, this.groundY - 75);
      bctx.lineTo(w * 0.14, this.groundY - 125);
      bctx.lineTo(w * 0.28, this.groundY - 125);
      bctx.lineTo(w * 0.36, this.groundY - 68);
      bctx.lineTo(w * 0.56, this.groundY - 110);
      bctx.lineTo(w * 0.68, this.groundY - 110);
      bctx.lineTo(w * 0.78, this.groundY - 70);
      bctx.lineTo(w, this.groundY - 95);
      bctx.lineTo(w, this.groundY);
      bctx.closePath();
      bctx.fill();
    });
  }

  start() {}

  restart() {
    this.lives = 4;
    this.rapidFireTimer = 0;
    this._setupStage(1);
  }

  _setupStage(level) {
    this.cameraX = 0;
    this.stageLength = 2200 + (level - 1) * 320;
    this.player = {
      x: 110,
      y: this.groundY - 42,
      w: 28,
      h: 42,
      vy: 0,
      facing: 1,
      grounded: true,
      slideTimer: 0,
      slideCooldown: 0,
      invuln: 1.5,
      walkPhase: 0,
      moving: false
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.dynamites = [];
    this.balconies = [];
    this.barrels = [];
    this.enemies = [];
    this.coins = [];
    this.particles = [];
    this.shockwaves = [];

    for (let x = 260; x < this.stageLength - 380; x += 240) {
      // Balcones y tejados de madera
      const by = this.groundY - (100 + (x % 480 === 20 ? 75 : 0));
      this.balconies.push({ x, y: by, w: 150, h: 14 });
      this.coins.push({ x: x + 45, y: by - 22, kind: 'gold' });
      if (Math.random() < 0.3) {
        this.coins.push({ x: x + 100, y: by - 22, kind: 'star' });
      }

      // Enemigo en balcón (francotirador o dinamitero)
      this.enemies.push({
        x: x + 75,
        y: by - 38,
        w: 26,
        h: 38,
        kind: Math.random() < 0.35 ? 'bomber' : 'sniper',
        hp: 2 + Math.floor(level / 3),
        vx: 0,
        shootTimer: 1.0 + Math.random()
      });

      // Bandido en calle + barril explosivo
      this.enemies.push({
        x: x + 135,
        y: this.groundY - 38,
        w: 26,
        h: 38,
        kind: 'bandit',
        hp: 2 + Math.floor(level / 3),
        vx: -60,
        originX: x + 135,
        shootTimer: 0.9 + Math.random()
      });

      if (Math.random() < 0.6) {
        this.barrels.push({ x: x + 20, y: this.groundY - 32, w: 26, h: 32, hp: 1 });
      }
    }

    // Forajido Jefe al final de la calle
    this.boss = {
      x: this.stageLength - 130,
      y: this.groundY - 58,
      w: 44,
      h: 58,
      hp: 28 + level * 12,
      maxHp: 28 + level * 12,
      vx: -95,
      vy: 0,
      grounded: true,
      shootTimer: 1.1,
      bounty: 500 + level * 150
    };

    this._syncHud();
  }

  _syncHud() {
    const dual = this.rapidFireTimer > 0 ? ' · ★★ DOBLE' : '';
    this.api.updateStatusText(`♥${this.lives}${dual}`);
  }

  handleInput(evt) {
    const p = this.player;
    if (evt.type === 'keydown' || evt.type === 'virtualdown') {
      if (evt.action === 'up' && p.grounded) {
        p.vy = -525;
        p.grounded = false;
        this.api.audio.play('jump');
      } else if ((evt.action === 'secondary' || evt.action === 'down') && p.grounded && p.slideCooldown <= 0) {
        p.slideTimer = 0.38;
        p.slideCooldown = 0.65;
        this.api.audio.play('move');
      } else if (evt.action === 'action') {
        this._fireRevolver();
      }
    } else if (evt.type === 'pointerdown') {
      this._fireRevolver();
    }
  }

  _fireRevolver() {
    if (this.shootCooldown > 0) return;
    const p = this.player;

    let aimX = p.facing;
    let aimY = 0;
    if (this.api.input.isPressed('up')) {
      aimY = -0.8;
      if (!this.api.input.isPressed('left') && !this.api.input.isPressed('right')) {
        aimX = 0;
        aimY = -1;
      }
    }
    const len = Math.hypot(aimX, aimY) || 1;
    const speed = 620;

    this.bullets.push({
      x: p.x + p.w / 2,
      y: p.y + 14,
      vx: (aimX / len) * speed,
      vy: (aimY / len) * speed
    });

    if (this.rapidFireTimer > 0) {
      this.bullets.push({
        x: p.x + p.w / 2,
        y: p.y + 20,
        vx: (aimX / len) * speed,
        vy: ((aimY - 0.12) / len) * speed
      });
    }

    this.shootCooldown = this.rapidFireTimer > 0 ? 0.11 : 0.2;
    this.muzzleTimer = 0.08;
    this.api.audio.play('shoot');
  }

  update(dt) {
    const p = this.player;
    const w = this.api.width;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    if (this.muzzleTimer > 0) this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.slideCooldown > 0) p.slideCooldown = Math.max(0, p.slideCooldown - dt);
    if (this.rapidFireTimer > 0) {
      this.rapidFireTimer = Math.max(0, this.rapidFireTimer - dt);
      if (this.rapidFireTimer === 0) this._syncHud();
    }

    if (p.slideTimer > 0) {
      p.slideTimer = Math.max(0, p.slideTimer - dt);
      p.x += p.facing * 380 * dt;
      p.moving = true;
      if (Math.random() < 0.65) {
        spawnFXParticles(this.particles, p.x + p.w / 2, this.groundY - 4, 2, {
          colors: ['#d97706', '#fde68a', '#92400e'],
          speedMin: 20,
          speedMax: 70,
          lifeMin: 0.15,
          lifeMax: 0.3
        });
      }
    } else {
      let mx = 0;
      if (this.api.input.isPressed('left')) {
        mx -= 1;
        p.facing = -1;
      }
      if (this.api.input.isPressed('right')) {
        mx += 1;
        p.facing = 1;
      }
      p.moving = mx !== 0;
      if (p.moving && p.grounded) p.walkPhase += dt * 11;
      p.x += mx * 265 * dt;
    }

    p.x = Math.max(this.cameraX + 16, Math.min(this.stageLength - 36, p.x));

    if (this.api.input.isPressed('action')) {
      this._fireRevolver();
    }

    // Gravedad y aterrizaje en balcones
    const prevBottom = p.y + p.h;
    p.vy += 1180 * dt;
    p.y += p.vy * dt;
    p.grounded = false;

    if (p.y + p.h >= this.groundY) {
      p.y = this.groundY - p.h;
      p.vy = 0;
      p.grounded = true;
    } else if (p.vy >= 0 && !this.api.input.isPressed('down')) {
      for (const b of this.balconies) {
        if (
          p.x + p.w > b.x &&
          p.x < b.x + b.w &&
          prevBottom <= b.y + 8 &&
          p.y + p.h >= b.y
        ) {
          p.y = b.y - p.h;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
    }

    this.cameraX = Math.min(this.stageLength - w, Math.max(this.cameraX, p.x - w * 0.35));

    // Balas del jugador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < this.cameraX - 30 || b.x > this.cameraX + w + 30 || b.y < -20 || b.y > this.api.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Barriles explosivos
      let hit = false;
      for (let k = this.barrels.length - 1; k >= 0; k--) {
        const br = this.barrels[k];
        if (b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) {
          this.barrels.splice(k, 1);
          this.bullets.splice(i, 1);
          this._explodeBarrel(br.x + br.w / 2, br.y + br.h / 2);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      if (
        this.boss &&
        this.boss.x < this.cameraX + w &&
        b.x > this.boss.x &&
        b.x < this.boss.x + this.boss.w &&
        b.y > this.boss.y &&
        b.y < this.boss.y + this.boss.h
      ) {
        this.boss.hp--;
        this.bullets.splice(i, 1);
        this.api.audio.play('hit');
        if (this.boss.hp <= 0) {
          this._defeatBoss();
          return;
        }
        continue;
      }

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.hp--;
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this.enemies.splice(eIdx, 1);
            this.api.addScore(60);
            this.api.audio.play('explosion');
          } else {
            this.api.audio.play('hit');
          }
          break;
        }
      }
    }

    // Enemigos
    for (const e of this.enemies) {
      if (e.x < this.cameraX - 60 || e.x > this.cameraX + w + 80) continue;
      if (e.kind === 'bandit') {
        e.x += e.vx * dt;
        if (Math.abs(e.x - e.originX) > 75) e.vx *= -1;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        if (e.kind === 'bomber') {
          this.dynamites.push({
            x: e.x + e.w / 2,
            y: e.y + 8,
            vx: Math.sign(p.x - e.x) * 165,
            vy: -280,
            timer: 1.5
          });
          e.shootTimer = 2.2;
        } else {
          const ang = Math.atan2(p.y + 18 - (e.y + 14), p.x + 14 - (e.x + 12));
          const spd = Math.min(395, 235 + (diff.level - 1) * 10);
          this.enemyBullets.push({
            x: e.x + e.w / 2,
            y: e.y + 14,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 5
          });
          e.shootTimer = Math.max(0.95, 1.9 - (diff.level - 1) * 0.06);
        }
      }
    }

    // Jefe Forajido
    if (this.boss && this.boss.x < this.cameraX + w) {
      this.boss.x += this.boss.vx * dt;
      if (this.boss.x < this.cameraX + w * 0.45 || this.boss.x + this.boss.w > this.stageLength - 20) {
        this.boss.vx *= -1;
      }
      if (this.boss.grounded && Math.random() < dt * 0.7) {
        this.boss.vy = -440;
        this.boss.grounded = false;
      }
      this.boss.vy += 1100 * dt;
      this.boss.y += this.boss.vy * dt;
      if (this.boss.y + this.boss.h >= this.groundY) {
        this.boss.y = this.groundY - this.boss.h;
        this.boss.vy = 0;
        this.boss.grounded = true;
      }
      this.boss.shootTimer -= dt;
      if (this.boss.shootTimer <= 0) {
        const ang = Math.atan2(p.y + 18 - (this.boss.y + 20), p.x - this.boss.x);
        for (const spread of [-0.22, 0, 0.22]) {
          this.enemyBullets.push({
            x: this.boss.x,
            y: this.boss.y + 22,
            vx: Math.cos(ang + spread) * 280,
            vy: Math.sin(ang + spread) * 280,
            r: 6
          });
        }
        this.boss.shootTimer = Math.max(0.65, 1.25 - diff.level * 0.05);
      }
    }

    // Dinamita lanzada
    for (let i = this.dynamites.length - 1; i >= 0; i--) {
      const d = this.dynamites[i];
      d.vy += 760 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.timer -= dt;
      if (d.y >= this.groundY - 6) {
        d.y = this.groundY - 6;
        d.vy = -120;
      }
      if (d.timer <= 0) {
        this.api.audio.play('boom');
        spawnShockwave(this.shockwaves, d.x, d.y, { color: '#f97316', maxRadius: 65, life: 0.32 });
        spawnFXParticles(this.particles, d.x, d.y, 12, { colors: ['#fef08a', '#fb923c', '#ef4444'], speedMax: 180 });
        if (p.invuln <= 0 && p.slideTimer <= 0 && Math.hypot(p.x + p.w / 2 - d.x, p.y + p.h / 2 - d.y) < 58) {
          this._hitPlayer('Alcanzado por dinamita forajida');
        }
        this.dynamites.splice(i, 1);
      }
    }

    // Balas enemigas (agacharse/barrer pasa por debajo)
    const hitTop = p.slideTimer > 0 ? p.y + p.h * 0.65 : p.y;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < this.cameraX - 30 || eb.x > this.cameraX + w + 30 || eb.y > this.api.height || eb.y < -30) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (
        p.invuln <= 0 &&
        p.slideTimer <= 0 &&
        eb.x > p.x &&
        eb.x < p.x + p.w &&
        eb.y > hitTop &&
        eb.y < p.y + p.h
      ) {
        this.enemyBullets.splice(i, 1);
        this._hitPlayer('Impacto en duelo del oeste');
        return;
      }
    }

    // Monedas y estrellas de sheriff
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y) < 28) {
        if (c.kind === 'star') {
          this.rapidFireTimer = 10;
          this._syncHud();
        }
        this.api.addScore(c.kind === 'star' ? 100 : 30);
        this.api.audio.play('coin');
        this.coins.splice(i, 1);
      }
    }

    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
  }

  _explodeBarrel(bx, by) {
    this.api.audio.play('boom');
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x + e.w / 2 - bx, e.y + e.h / 2 - by) < 110) {
        this.enemies.splice(i, 1);
        this.api.addScore(75);
      }
    }
    spawnShockwave(this.shockwaves, bx, by, { color: '#fb923c', maxRadius: 110, life: 0.38, lineWidth: 5 });
    spawnFXParticles(this.particles, bx, by, 20, {
      colors: ['#fef08a', '#fb923c', '#dc2626', '#78350f'],
      speedMax: 240,
      gravity: 280
    });
  }

  _defeatBoss() {
    this.api.addScore(this.boss.bounty);
    this.boss = null;
    const nextLvl = this.api.level.level + 1;
    this.api.setLevel(nextLvl);
    this.api.audio.play('levelUp');
    this._setupStage(nextLvl);
  }

  _hitPlayer(reason) {
    this.lives--;
    this.player.invuln = 2.0;
    this._syncHud();
    this.api.audio.play('explosion');
    if (this.lives <= 0) {
      this.api.triggerGameOver({ reason });
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const cam = this.cameraX;

    // 1. Cielo atardecer western, sol y mesas desérticas cacheadas
    if (!drawCachedBackdrop(ctx, this.skyBackdrop, 0, 0, w, this.groundY)) {
      const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
      sky.addColorStop(0, '#2a0845');
      sky.addColorStop(1, '#f953c6');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Cactus saguaro lejanos + cantinas Western detalladas en paralaje
    for (let i = 0; i < 9; i++) {
      const sx = (((i * 250 - cam * 0.4) % (w + 260)) + (w + 260)) % (w + 260) - 130;
      const bh = 165 + (i % 2) * 35;
      // Cuerpo del edificio western
      ctx.fillStyle = '#3b1533';
      ctx.fillRect(sx, this.groundY - bh, 152, bh);
      // Cornisa superior escalonada
      ctx.fillStyle = '#4c1d3d';
      ctx.fillRect(sx + 16, this.groundY - bh - 18, 120, 18);
      // Cartel "SALOON" o tejado
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sx + 24, this.groundY - bh + 12, 104, 18);
      // Ventanas iluminadas cálidas
      ctx.fillStyle = 'rgba(253, 224, 71, 0.32)';
      ctx.fillRect(sx + 22, this.groundY - bh + 46, 36, 36);
      ctx.fillRect(sx + 94, this.groundY - bh + 46, 36, 36);
      // Puertas batientes abajo
      ctx.fillStyle = '#5c2d16';
      ctx.fillRect(sx + 56, this.groundY - 54, 18, 52);
      ctx.fillRect(sx + 78, this.groundY - 54, 18, 52);
    }

    // 3. Calle polvorienta del Oeste con acera de tablones
    ctx.fillStyle = '#7c3f1d';
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, this.groundY, w, 10);
    ctx.fillStyle = '#d97706';
    const plankOffset = Math.floor(cam % 44);
    for (let px = -plankOffset; px < w + 44; px += 44) {
      ctx.fillRect(px, this.groundY + 1, 40, 4);
    }

    ctx.save();
    ctx.translate(-cam, 0);

    // Balcones y porches de madera con barandillas
    for (const b of this.balconies) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(b.x, b.y, b.w, 4);
      // Barandilla y postes de madera
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y - 14, b.w, 14);
      for (let rx = b.x + 12; rx < b.x + b.w - 8; rx += 20) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(rx, b.y - 14, 3, 14);
      }
    }

    // Barriles TNT pixel art
    for (const br of this.barrels) {
      drawSprite(ctx, this.sprites.barrel, br.x + br.w / 2, br.y + br.h / 2, br.w + 4, br.h + 4);
    }

    // Monedas giratorias y Estrellas de Sheriff
    for (const c of this.coins) {
      const spinScale = 0.55 + 0.45 * Math.abs(Math.sin(this.animTime * 5 + c.x * 0.05));
      if (c.kind === 'star') {
        drawGlowCircle(ctx, c.x, c.y, 18, 'rgba(34, 211, 238, 0.45)');
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(this.animTime * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 12 : 5.5;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        drawGlowCircle(ctx, c.x, c.y, 13, 'rgba(250, 204, 21, 0.35)');
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(spinScale, 1);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef9c3';
        ctx.fillRect(-1.5, -5, 3, 10);
        ctx.restore();
      }
    }

    // Bandidos y Dinamiteros animados
    for (const e of this.enemies) {
      const f = Math.floor(this.animTime * 7 + e.x * 0.1) % 2;
      const sp = e.kind === 'bomber' ? this.sprites.bomber[f] : this.sprites.bandit[f];
      drawSprite(ctx, sp, e.x + e.w / 2, e.y + e.h / 2, e.w + 14, e.h + 6, {
        flipX: e.x > this.player.x
      });
    }

    // Jefe Forajido "Most Wanted"
    if (this.boss) {
      drawGlowCircle(ctx, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 42, 'rgba(220, 38, 38, 0.24)');
      drawSprite(ctx, this.sprites.boss, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, this.boss.w + 16, this.boss.h + 12, {
        flipX: this.boss.x > this.player.x
      });
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(this.boss.x - 12, this.boss.y - 24, this.boss.w + 24, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.boss.x - 10, this.boss.y - 22, (this.boss.w + 20) * (this.boss.hp / this.boss.maxHp), 6);
    }

    // Vaquero Jugador
    const p = this.player;
    if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0) {
      const drawH = p.slideTimer > 0 ? p.h * 0.65 : p.h;
      const drawY = p.y + (p.h - drawH);
      const cx = p.x + p.w / 2;
      const cy = drawY + drawH / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(cx, p.y + p.h, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      const f = p.moving ? Math.floor(p.walkPhase) % 2 : 0;
      const rot = p.slideTimer > 0 ? (p.facing > 0 ? -0.35 : 0.35) : 0;
      drawSprite(ctx, this.sprites.cowboy[f], cx, cy, p.w + 16, drawH + 8, {
        flipX: p.facing < 0,
        rotation: rot
      });
      if (this.muzzleTimer > 0) {
        drawGlowCircle(ctx, p.facing > 0 ? p.x + p.w + 10 : p.x - 10, drawY + drawH * 0.42, 14, 'rgba(254, 240, 138, 0.92)');
      }
    }

    // Balas y Dinamitas con mecha chispeante
    for (const b of this.bullets) {
      drawGlowCircle(ctx, b.x, b.y, 7, 'rgba(255, 255, 255, 0.5)');
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const eb of this.enemyBullets) {
      drawGlowCircle(ctx, eb.x, eb.y, eb.r * 2, 'rgba(249, 115, 22, 0.45)');
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of this.dynamites) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(this.animTime * 11);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-4, -9, 8, 18);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-4, -5, 8, 3);
      ctx.fillRect(-4, 2, 8, 3);
      drawGlowCircle(ctx, 0, -12, 6 + Math.sin(this.animTime * 35) * 2, 'rgba(253, 224, 71, 0.9)');
      ctx.restore();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);

    ctx.restore();
  }

  destroy() {}
}
