/**
 * 5. NOVA DEFENDERS (Space Invaders — 8-Bit Retro Pixel Arcade)
 * Escuadrones alienígenas con distintos comportamientos, escudos de plasma,
 * naves de bonificación, mejoras temporales y naves nodriza jefe cada 5 oleadas.
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

const SQUID_FRAMES = [
  [
    '....XXXX....',
    '...XXXXXX...',
    '..XXXXXXXX..',
    '.XXKKXXKKXX.',
    '.XXXXXXXXXX.',
    '...XX..XX...',
    '..XX.XX.XX..',
    '.XX......XX.'
  ],
  [
    '....XXXX....',
    '...XXXXXX...',
    '..XXXXXXXX..',
    '.XXKKXXKKXX.',
    '.XXXXXXXXXX.',
    '..XX.XX.XX..',
    '.XX......XX.',
    '..XX....XX..'
  ]
];

const CRAB_FRAMES = [
  [
    '..X......X..',
    '...X....X...',
    '..XXXXXXXX..',
    '.XXKKXXKKXX.',
    'XXXXXXXXXXXX',
    'X.XXXXXXXX.X',
    'X.X......X.X',
    '...XX..XX...'
  ],
  [
    '..X......X..',
    'X..X....X..X',
    'X.XXXXXXXX.X',
    'XXXKKXXKKXXX',
    'XXXXXXXXXXXX',
    '.XXXXXXXXXX.',
    '..X......X..',
    '.X........X.'
  ]
];

const MANTIS_FRAMES = [
  [
    '...XXXXXX...',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XXXKKXXKKXXX',
    'XXXXXXXXXXXX',
    '..XXX..XXX..',
    '.XX..XX..XX.',
    'XX........XX'
  ],
  [
    '...XXXXXX...',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XXXKKXXKKXXX',
    'XXXXXXXXXXXX',
    '...XX..XX...',
    '..XX.XX.XX..',
    '..XX....XX..'
  ]
];

const UFO_GRID = [
  '.....RRRRRR.....',
  '...RRRRRRRRRR...',
  '..RRRWWYYWWRRR..',
  '.RRRRRRRRRRRRRR.',
  'RRRYYRRYRRYYRRRR',
  '..RRR..RR..RRR..',
  '................',
  '................'
];

const BOSS_GRID = [
  '........PPPPPPPPPP........',
  '.....PPPPWWWWWWWWPPPP.....',
  '...PPPWWWWCCCCCCWWWWPPP...',
  '..PPPCCCCCCCCCCCCCCCCPPP..',
  '.PPPPPPKKCCCCCCCCKKPPPPPP.',
  'PPPPPPPKKCCYYYYCCKKPPPPPPP',
  'PPPPPPPPCCCWWWWCCCPPPPPPPP',
  '.PPPPPP.PPP....PPP.PPPPPP.',
  '..PPPP...PP....PP...PPPP..',
  '..........................',
  '..........................',
  '..........................'
];

const CANNON_GRID = [
  '.......WW.......',
  '......WWWW......',
  '......CCCC......',
  '..CCCCCCCCCCCC..',
  '.CCWWWWWWWWWWCC.',
  'CCWWWWWWWWWWWWCC',
  'CCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCC',
  '................',
  '................'
];

export default class SpaceInvadersGame {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.player = { x: 350, y: 528, w: 46, h: 24, speed: 380, rapidTimer: 0, spreadTimer: 0, invuln: 0 };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.bunkers = [];
    this.powerUps = [];
    this.particles = [];
    this.shockwaves = [];
    this.ufo = null;
    this.boss = null;
    this.fleetDir = 1;
    this.shootCooldown = 0;
    this.animTime = 0;
    this.sprites = null;
    this.backdrop = null;
  }

  init() {
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    const colorSets = ['#ff2a85', '#ff9e00', '#00f5d4', '#00bbf9', '#9b5de5'];
    this.sprites = {
      cannon: compilePixelSprite(CANNON_GRID, { C: '#00f5d4', W: '#e0f2fe' }, 2.6),
      ufo: compilePixelSprite(UFO_GRID, { R: '#f43f5e', W: '#ffffff', Y: '#fde047' }, 2.6),
      boss: compilePixelSprite(BOSS_GRID, { P: '#ec4899', W: '#ffffff', C: '#38bdf8', K: '#0f172a', Y: '#fde047' }, 4.8),
      aliensByColor: {}
    };

    colorSets.forEach((col, idx) => {
      const frames = idx % 3 === 0 ? SQUID_FRAMES : idx % 3 === 1 ? CRAB_FRAMES : MANTIS_FRAMES;
      this.sprites.aliensByColor[col] = compileSpriteFrames(frames, { X: col, K: '#060814' }, 2.6);
    });

    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#040612');
      grad.addColorStop(0.75, '#070b1e');
      grad.addColorStop(1, '#101630');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Campo de estrellas pixelado 8-bit y línea terrestre inferior
      for (let i = 0; i < 75; i++) {
        const sx = (i * 97 + 19) % w;
        const sy = (i * 53 + 11) % (h - 60);
        bctx.fillStyle = i % 6 === 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.35)';
        bctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }
      bctx.fillStyle = 'rgba(0, 245, 212, 0.32)';
      bctx.fillRect(16, h - 22, w - 32, 2);
    });
  }

  start() {}

  restart() {
    this.lives = 3;
    this.player.x = this.api.width / 2 - this.player.w / 2;
    this.player.rapidTimer = 0;
    this.player.spreadTimer = 0;
    this.player.invuln = 0;
    this._setupBunkers();
    this._spawnWave(1);
    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`♥ ${this.lives}`);
  }

  _setupBunkers() {
    this.bunkers = [];
    const count = 4;
    const spacing = this.api.width / (count + 1);
    for (let i = 1; i <= count; i++) {
      this.bunkers.push({
        x: spacing * i - 36,
        y: this.api.height - 108,
        w: 72,
        h: 22,
        hp: 10,
        maxHp: 10
      });
    }
  }

  _spawnWave(level) {
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.shockwaves = [];
    this.boss = null;
    this.fleetDir = 1;

    // Cada 5 niveles aparece un Jefe Nodriza acompañado de escoltas
    if (level % 5 === 0) {
      this.boss = {
        x: this.api.width / 2 - 70,
        y: 54,
        w: 140,
        h: 44,
        hp: 25 + level * 4,
        maxHp: 25 + level * 4,
        vx: 140
      };
    }

    const cols = 9;
    const rows = Math.min(5, 3 + Math.floor(level / 2));
    const startX = 76;
    const startY = this.boss ? 116 : 62;
    const gapX = 62;
    const gapY = 42;
    const colors = ['#ff2a85', '#ff9e00', '#00f5d4', '#00bbf9', '#9b5de5'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.enemies.push({
          x: startX + c * gapX,
          y: startY + r * gapY,
          w: 36,
          h: 24,
          hp: r === 0 && level >= 3 ? 2 : 1,
          color: colors[r % colors.length],
          points: (rows - r) * 10
        });
      }
    }
  }

  handleInput(evt) {
    if ((evt.type === 'keydown' || evt.type === 'virtualdown') && (evt.action === 'left' || evt.action === 'right')) {
      this._keyboardLock = true;
    }

    if (evt.type === 'pointerdown') {
      this._keyboardLock = false;
      this.player.x = Math.max(
        16,
        Math.min(this.api.width - this.player.w - 16, evt.x * this.api.width - this.player.w / 2)
      );
      this._firePlayerWeapon();
    } else if (evt.type === 'pointermove') {
      if (evt.isDown) {
        this._keyboardLock = false;
        this.player.x = Math.max(
          16,
          Math.min(this.api.width - this.player.w - 16, evt.x * this.api.width - this.player.w / 2)
        );
      } else if (
        evt.pointerType === 'mouse' &&
        evt.insideTarget &&
        !this._keyboardLock &&
        !this.api.input.isPressed('left') &&
        !this.api.input.isPressed('right')
      ) {
        this.player.x = Math.max(
          16,
          Math.min(this.api.width - this.player.w - 16, evt.x * this.api.width - this.player.w / 2)
        );
      }
    } else if ((evt.type === 'keydown' || evt.type === 'virtualdown') && evt.action === 'action') {
      this._firePlayerWeapon();
    }
  }

  _firePlayerWeapon() {
    if (this.shootCooldown > 0) return;
    const cx = this.player.x + this.player.w / 2;
    const cy = this.player.y - 6;

    if (this.player.spreadTimer > 0) {
      this.bullets.push(
        { x: cx, y: cy, vx: 0, vy: -520, r: 4 },
        { x: cx - 8, y: cy, vx: -130, vy: -500, r: 4 },
        { x: cx + 8, y: cy, vx: 130, vy: -500, r: 4 }
      );
    } else {
      this.bullets.push({ x: cx, y: cy, vx: 0, vy: -520, r: 4 });
    }

    this.shootCooldown = this.player.rapidTimer > 0 ? 0.14 : 0.28;
    this.api.audio.play('laser');
  }

  update(dt) {
    const w = this.api.width;
    const h = this.api.height;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - dt);
    if (this.player.rapidTimer > 0) this.player.rapidTimer = Math.max(0, this.player.rapidTimer - dt);
    if (this.player.spreadTimer > 0) this.player.spreadTimer = Math.max(0, this.player.spreadTimer - dt);

    if (this.api.input.isPressed('left')) {
      this.player.x -= this.player.speed * dt;
    }
    if (this.api.input.isPressed('right')) {
      this.player.x += this.player.speed * dt;
    }
    this.player.x = Math.max(16, Math.min(w - this.player.w - 16, this.player.x));

    if (this.api.input.isPressed('action') || this.api.input.isCanvasDragging?.()) {
      this._firePlayerWeapon();
    }

    // Aparición ocasional de OVNI bonus en la parte superior
    if (!this.ufo && !this.boss && Math.random() < dt * 0.08) {
      this.ufo = { x: -40, y: 28, w: 42, h: 18, vx: 170 };
    }
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      if (this.ufo.x > w + 50) this.ufo = null;
    }

    // Actualizar Jefe si existe
    if (this.boss) {
      this.boss.x += this.boss.vx * diff.speedMultiplier * dt;
      if (this.boss.x < 24 || this.boss.x + this.boss.w > w - 24) {
        this.boss.vx *= -1;
      }
      if (Math.random() < dt * 1.6) {
        const bx = this.boss.x + this.boss.w / 2;
        this.enemyBullets.push(
          { x: bx - 24, y: this.boss.y + this.boss.h, vx: -40, vy: 270, r: 5 },
          { x: bx, y: this.boss.y + this.boss.h, vx: 0, vy: 290, r: 5 },
          { x: bx + 24, y: this.boss.y + this.boss.h, vx: 40, vy: 270, r: 5 }
        );
      }
    }

    // Movimiento de la flota enemiga
    const speedBoost = 1 + Math.max(0, (36 - this.enemies.length) * 0.04);
    const fleetSpeed = 52 * diff.speedMultiplier * speedBoost;
    let hitEdge = false;

    for (const e of this.enemies) {
      e.x += this.fleetDir * fleetSpeed * dt;
      if (e.x < 18 || e.x + e.w > w - 18) {
        hitEdge = true;
      }
    }

    if (hitEdge) {
      this.fleetDir *= -1;
      for (const e of this.enemies) {
        e.y += 16;
        if (e.y + e.h >= this.player.y - 10) {
          this.api.triggerGameOver({ reason: 'La flota invasora alcanzó la superficie' });
          return;
        }
      }
    }

    // Disparo enemigo (acotado asintóticamente para que niveles 25-100 sigan siendo jugables)
    const fireRate = Math.min(3.4, 0.7 + (diff.level - 1) * 0.12) * dt;
    if (this.enemies.length > 0 && Math.random() < fireRate) {
      const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      this.enemyBullets.push({
        x: shooter.x + shooter.w / 2,
        y: shooter.y + shooter.h,
        vx: 0,
        vy: Math.min(410, 240 + (diff.level - 1) * 10),
        r: 4
      });
    }

    // Proyectiles del jugador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Impacto contra OVNI bonus
      if (
        this.ufo &&
        b.x >= this.ufo.x &&
        b.x <= this.ufo.x + this.ufo.w &&
        b.y >= this.ufo.y &&
        b.y <= this.ufo.y + this.ufo.h
      ) {
        spawnShockwave(this.shockwaves, this.ufo.x + this.ufo.w / 2, this.ufo.y + this.ufo.h / 2, { color: '#fde047', maxRadius: 42 });
        spawnFXParticles(this.particles, this.ufo.x + this.ufo.w / 2, this.ufo.y + this.ufo.h / 2, 12, { colors: ['#f43f5e', '#fde047', '#ffffff'], speedMax: 160 });
        this.api.addScore(100);
        this.api.audio.play('point');
        this.ufo = null;
        this.bullets.splice(i, 1);
        continue;
      }

      // Impacto contra Jefe
      if (
        this.boss &&
        b.x >= this.boss.x &&
        b.x <= this.boss.x + this.boss.w &&
        b.y >= this.boss.y &&
        b.y <= this.boss.y + this.boss.h
      ) {
        this.boss.hp--;
        spawnFXParticles(this.particles, b.x, b.y, 4, { colors: ['#38bdf8', '#ffffff'], speedMax: 90, lifeMax: 0.22 });
        this.bullets.splice(i, 1);
        this.api.audio.play('hit');
        if (this.boss.hp <= 0) {
          spawnShockwave(this.shockwaves, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, { color: '#ec4899', maxRadius: 85, life: 0.45, lineWidth: 4 });
          spawnFXParticles(this.particles, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 22, { colors: ['#ec4899', '#38bdf8', '#fde047', '#ffffff'], speedMax: 220 });
          this.api.addScore(250);
          this.api.audio.play('explosion');
          this.boss = null;
        }
        continue;
      }

      // Impacto contra invasores
      let hitEnemy = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          e.hp--;
          this.bullets.splice(i, 1);
          hitEnemy = true;
          if (e.hp <= 0) {
            spawnFXParticles(this.particles, e.x + e.w / 2, e.y + e.h / 2, 9, { colors: [e.color, '#ffffff', '#fde047'], speedMax: 140, lifeMax: 0.35 });
            this.enemies.splice(j, 1);
            this.api.addScore(e.points);
            this.api.audio.play('explosion');
            if (Math.random() < 0.14) {
              this.powerUps.push({
                x: e.x + e.w / 2,
                y: e.y + e.h / 2,
                kind: Math.random() < 0.5 ? 'rapid' : 'spread'
              });
            }
          } else {
            this.api.audio.play('hit');
          }
          break;
        }
      }
      if (hitEnemy) continue;
    }

    // Proyectiles enemigos
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += (eb.vx || 0) * dt;
      eb.y += eb.vy * dt;

      if (eb.y > h) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Impacto contra escudos búnker
      let absorbed = false;
      for (let k = this.bunkers.length - 1; k >= 0; k--) {
        const bk = this.bunkers[k];
        if (eb.x >= bk.x && eb.x <= bk.x + bk.w && eb.y >= bk.y && eb.y <= bk.y + bk.h) {
          bk.hp--;
          if (bk.hp <= 0) this.bunkers.splice(k, 1);
          this.enemyBullets.splice(i, 1);
          absorbed = true;
          break;
        }
      }
      if (absorbed) continue;

      // Impacto contra el jugador
      if (
        this.player.invuln <= 0 &&
        eb.x >= this.player.x &&
        eb.x <= this.player.x + this.player.w &&
        eb.y >= this.player.y &&
        eb.y <= this.player.y + this.player.h
      ) {
        this.enemyBullets.splice(i, 1);
        this.lives--;
        this.player.invuln = 1.6;
        this._syncHud();
        this.api.audio.play('explosion');
        if (this.lives <= 0) {
          this.api.triggerGameOver({ reason: 'Tu caza defensor fue destruido' });
          return;
        }
      }
    }

    // Power-ups cayendo
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += 150 * dt;
      if (
        p.x >= this.player.x &&
        p.x <= this.player.x + this.player.w &&
        p.y >= this.player.y &&
        p.y <= this.player.y + this.player.h
      ) {
        this.api.audio.play('pickup');
        if (p.kind === 'rapid') this.player.rapidTimer = 9;
        else this.player.spreadTimer = 9;
        this.powerUps.splice(i, 1);
      } else if (p.y > h) {
        this.powerUps.splice(i, 1);
      }
    }

    // Comprobar si se despejó la oleada
    if (this.enemies.length === 0 && !this.boss) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(150);
      this.api.audio.play('levelUp');
      if (nextLvl % 5 === 1) {
        this._setupBunkers(); // Restaurar escudos tras superar al Jefe Nodriza
      }
      this._spawnWave(nextLvl);
    }

    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#060814';
      ctx.fillRect(0, 0, w, h);
    }

    // OVNI bonus pixel art con luces parpadeantes
    if (this.ufo) {
      const ucx = this.ufo.x + this.ufo.w / 2;
      const ucy = this.ufo.y + this.ufo.h / 2;
      drawGlowCircle(ctx, ucx, ucy, 24, 'rgba(244, 63, 94, 0.35)');
      drawSprite(ctx, this.sprites.ufo, ucx, ucy, this.ufo.w + 8, this.ufo.h + 8);
    }

    // Jefe Nodriza 8-bit
    if (this.boss) {
      const bcx = this.boss.x + this.boss.w / 2;
      const bcy = this.boss.y + this.boss.h / 2;
      drawGlowCircle(ctx, bcx, bcy, 68, 'rgba(236, 72, 153, 0.25)');
      drawSprite(ctx, this.sprites.boss, bcx, bcy, this.boss.w + 10, this.boss.h + 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(this.boss.x - 1, this.boss.y - 14, this.boss.w + 2, 8);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(this.boss.x, this.boss.y - 13, (this.boss.hp / this.boss.maxHp) * this.boss.w, 6);
    }

    // Flota de invasores pixel art animados (marcha de 2 fotogramas)
    const alienFrame = Math.floor(this.animTime * 3.2) % 2;
    for (const e of this.enemies) {
      const set = this.sprites.aliensByColor[e.color];
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      if (set) {
        drawSprite(ctx, set[alienFrame], cx, cy, e.w, e.h + 2);
      } else {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.w, e.h);
      }
      if (e.hp > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
      }
    }

    // Escudos búnker de plasma con retícula energética y daño visible
    for (const bk of this.bunkers) {
      const ratio = bk.hp / bk.maxHp;
      ctx.save();
      ctx.fillStyle = `rgba(6, 182, 212, ${0.22 + ratio * 0.55})`;
      ctx.strokeStyle = ratio > 0.4 ? '#22d3ee' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bk.x + 8, bk.y);
      ctx.lineTo(bk.x + bk.w - 8, bk.y);
      ctx.lineTo(bk.x + bk.w, bk.y + 8);
      ctx.lineTo(bk.x + bk.w, bk.y + bk.h);
      ctx.lineTo(bk.x + bk.w - 16, bk.y + bk.h);
      ctx.lineTo(bk.x + bk.w - 22, bk.y + bk.h - 7);
      ctx.lineTo(bk.x + 22, bk.y + bk.h - 7);
      ctx.lineTo(bk.x + 16, bk.y + bk.h);
      ctx.lineTo(bk.x, bk.y + bk.h);
      ctx.lineTo(bk.x, bk.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Barras internas de integridad
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      const bars = Math.max(1, Math.round(ratio * 5));
      for (let bi = 0; bi < bars; bi++) {
        ctx.fillRect(bk.x + 10 + bi * 11, bk.y + 4, 8, 4);
      }
      ctx.restore();
    }

    // Cañón láser defensor del jugador
    if (this.player.invuln <= 0 || Math.floor(this.player.invuln * 12) % 2 === 0) {
      const pcx = this.player.x + this.player.w / 2;
      const pcy = this.player.y + this.player.h / 2;
      if (this.player.rapidTimer > 0 || this.player.spreadTimer > 0) {
        drawGlowCircle(ctx, pcx, pcy, 26, 'rgba(56, 189, 248, 0.35)');
      }
      drawSprite(ctx, this.sprites.cannon, pcx, pcy, this.player.w, this.player.h + 2);
    }

    // Proyectiles láser del jugador
    for (const b of this.bullets) {
      drawGlowCircle(ctx, b.x, b.y, 7, 'rgba(250, 204, 21, 0.45)');
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x - 2, b.y - 7, 4, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 1, b.y - 5, 2, 10);
    }

    // Rayos zigzag alienígenas
    const zig = Math.floor(this.animTime * 16) % 2 === 0 ? 3 : -3;
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 2.5;
    for (const eb of this.enemyBullets) {
      ctx.beginPath();
      ctx.moveTo(eb.x - zig, eb.y - 6);
      ctx.lineTo(eb.x + zig, eb.y);
      ctx.lineTo(eb.x - zig, eb.y + 6);
      ctx.stroke();
    }

    // Power-ups encapsulados ('R' Rapid, 'S' Spread)
    for (const p of this.powerUps) {
      const col = p.kind === 'rapid' ? '#facc15' : '#34d399';
      drawGlowCircle(ctx, p.x, p.y, 16, `${col}44`);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - 10, p.y - 10, 20, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.kind === 'rapid' ? 'R' : 'S', p.x, p.y + 4);
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);
  }

  destroy() {}
}
