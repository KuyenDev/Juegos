/**
 * 15. IRON COMMANDO (Metal Slug-like — Run & Gun Horizontal, 16-bit Military Arcade)
 * Acción de desplazamiento lateral con plataformas, salto, agachado, disparo multi-arma,
 * granadas explosivas parabólicas, cajas de suministros y Tanques Jefe al final de cada sector.
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

const COMMANDO_FRAMES = [
  [
    '....RRRRRR......',
    '...RRRRRRRR.....',
    '..RRSSSSSSSS....',
    '..SSKKSSSSWSS...',
    '...SSSSSSSS.....',
    '....OOOOOO......',
    '..GGGOOOOGGGGG..',
    '..GGGOOOOGGGGKK.',
    '...OOOOOOOOOO...',
    '...KKKKKKKKKK...',
    '....GGGGGGGG....',
    '....GGG..GGG....',
    '...GGG....GGG...',
    '...BB......BB...',
    '..BBB......BBB..',
    '................'
  ],
  [
    '....RRRRRR......',
    '...RRRRRRRR.....',
    '..RRSSSSSSSS....',
    '..SSKKSSSSWSS...',
    '...SSSSSSSS.....',
    '....OOOOOO......',
    '..GGGOOOOGGGGG..',
    '..GGGOOOOGGGGKK.',
    '...OOOOOOOOOO...',
    '...KKKKKKKKKK...',
    '....GGGGGGGG....',
    '...GGG...GGG....',
    '..GGG.....GGG...',
    '..BB.......BB...',
    '.BBB......BBB...',
    '................'
  ]
];

const SOLDIER_FRAMES = [
  [
    '.....MMMMMM.....',
    '....MMMMMMMM....',
    '...MMKKKKKKMM...',
    '...MKKKKKKKKM...',
    '....SSSSSSSS....',
    '....RRRRRRRR....',
    '..KKRRRRRRRRRR..',
    '..KKRRRRRRRRR...',
    '....RRRRRRRR....',
    '....KKKKKKKK....',
    '....RRR..RRR....',
    '...RRR....RRR...',
    '...KK......KK...',
    '..KKK......KKK..',
    '................',
    '................'
  ],
  [
    '.....MMMMMM.....',
    '....MMMMMMMM....',
    '...MMKKKKKKMM...',
    '...MKKKKKKKKM...',
    '....SSSSSSSS....',
    '....RRRRRRRR....',
    '..KKRRRRRRRRRR..',
    '..KKRRRRRRRRR...',
    '....RRRRRRRR....',
    '....KKKKKKKK....',
    '...RRR...RRR....',
    '..RRR.....RRR...',
    '..KK.......KK...',
    '.KKK......KKK...',
    '................',
    '................'
  ]
];

const TURRET_GRID = [
  '.....DDDDDD.....',
  '...DDSSSSSSDD...',
  '..DSSYYYYYYSSD..',
  'KKKKSSSRRSSSSSD.',
  'KKKKSSSRRSSSSSD.',
  '..DSSSSSSSSSSSD.',
  '..DDDDDDDDDDDDD.',
  '.DSSSSSSSSSSSSSD',
  '.DSSKKSSSSSKKSSD',
  'DDDDDDDDDDDDDDDD',
  'SSSSSSSSSSSSSSSS',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const DRONE_FRAMES = [
  [
    '.YYYYYY..YYYYYY.',
    '...YY......YY...',
    '..DDDDDDDDDDDD..',
    '.DPPPPPPPPPPPPD.',
    '.PPPPPWWWWPPPPP.',
    'DPPPPWKKKKWPPPPD',
    'DPPPPPWWWWPPPPPD',
    '.PPPPPPPPPPPPPP.',
    '..DDDDDDDDDDDD..',
    '....DD....DD....',
    '...R........R...',
    '................'
  ],
  [
    '...YY......YY...',
    '.YYYYYY..YYYYYY.',
    '..DDDDDDDDDDDD..',
    '.DPPPPPPPPPPPPD.',
    '.PPPPPWWWWPPPPP.',
    'DPPPPWKRRKWPPPPD',
    'DPPPPPWWWWPPPPPD',
    '.PPPPPPPPPPPPPP.',
    '..DDDDDDDDDDDD..',
    '....DD....DD....',
    '...Y........Y...',
    '................'
  ]
];

const AMMO_CRATE_GRID = [
  'DDDDDDDDDDDDDDDD',
  'DOOOOOOOOOOOOOOD',
  'DOYYYYYYYYYYYYOD',
  'DOYDDDDDDDDDDYOD',
  'DOYDOOYYYYOOOYOD',
  'DOYDOYYYYYYOOYOD',
  'DOYDOYDDDDYOOYOD',
  'DOYDOOYYYYOOOYOD',
  'DOYDOOOOOOOOOYOD',
  'DOYDOYDDDDYOOYOD',
  'DOYDOYYYYYYOOYOD',
  'DOYDOOOOOOOOOYOD',
  'DOYDDDDDDDDDDYOD',
  'DOYYYYYYYYYYYYOD',
  'DOOOOOOOOOOOOOOD',
  'DDDDDDDDDDDDDDDD'
];

export default class MetalSlugGame {
  constructor(api) {
    this.api = api;
    this.groundY = 420;
    this.cameraX = 0;
    this.sectorLength = 2400;
    this.lives = 4;
    this.grenades = 6;
    this.weapon = 'rifle'; // 'rifle' | 'heavy' | 'plasma'
    this.ammo = 0;
    this.player = null;
    this.platforms = [];
    this.crates = [];
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.grenadeObjs = [];
    this.pickups = [];
    this.explosions = [];
    this.particles = [];
    this.shockwaves = [];
    this.boss = null;
    this.shootCooldown = 0;
    this.grenadeCooldown = 0;
    this.animTime = 0;
    this.muzzleTimer = 0;
    this.aimUpActive = false;
    this.sprites = null;
    this.skyBackdrop = null;
  }

  init() {
    this.groundY = this.api.height - 64;
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    this.sprites = {
      commando: compileSpriteFrames(COMMANDO_FRAMES, {
        R: '#ef4444', S: '#fde68a', K: '#0f172a', W: '#ffffff', O: '#4d7c0f', G: '#3f6212', B: '#451a03'
      }, 2.4),
      soldier: compileSpriteFrames(SOLDIER_FRAMES, {
        M: '#475569', K: '#0f172a', S: '#fed7aa', R: '#dc2626'
      }, 2.3),
      turret: compilePixelSprite(TURRET_GRID, {
        D: '#1e293b', S: '#64748b', Y: '#f59e0b', K: '#0f172a', R: '#f43f5e'
      }, 2.3),
      drone: compileSpriteFrames(DRONE_FRAMES, {
        Y: '#facc15', D: '#334155', P: '#7c3aed', W: '#e0f2fe', K: '#0f172a', R: '#f43f5e'
      }, 2.3),
      crate: compilePixelSprite(AMMO_CRATE_GRID, {
        D: '#451a03', O: '#92400e', Y: '#f59e0b'
      }, 2)
    };

    this.skyBackdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, 0, this.groundY);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.55, '#1e1b4b');
      grad.addColorStop(1, '#7c2d12');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, this.groundY);

      // Resplandor solar lejano
      drawGlowCircle(bctx, w * 0.72, this.groundY - 40, 180, 'rgba(251, 146, 60, 0.25)');
    });
  }

  start() {}

  restart() {
    this.lives = 4;
    this.grenades = 6;
    this.weapon = 'rifle';
    this.ammo = 0;
    this._setupSector(1);
  }

  _setupSector(level) {
    this.cameraX = 0;
    this.sectorLength = 2200 + (level - 1) * 350;
    this.player = {
      x: 120,
      y: this.groundY - 40,
      w: 28,
      h: 40,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      crouching: false,
      invuln: 1.5,
      walkPhase: 0,
      moving: false
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.grenadeObjs = [];
    this.pickups = [];
    this.explosions = [];
    this.particles = [];
    this.shockwaves = [];
    this.boss = null;
    this.platforms = [];
    this.crates = [];
    this.enemies = [];

    // Generar plataformas, cajas y escuadrones a lo largo del sector
    for (let x = 280; x < this.sectorLength - 360; x += 220) {
      if (Math.random() < 0.72) {
        const py = this.groundY - (95 + Math.floor(Math.random() * 2) * 85);
        this.platforms.push({ x, y: py, w: 135, h: 16 });
        if (Math.random() < 0.6) {
          this.enemies.push(this._makeEnemy(x + 65, py - 36, level, 'soldier'));
        }
      }
      if (Math.random() < 0.65) {
        this.crates.push({ x: x + 40, y: this.groundY - 30, w: 30, h: 30, hp: 2 });
      }
      // Enemigos en tierra y drones aéreos
      this.enemies.push(this._makeEnemy(x + 120, this.groundY - 36, level, Math.random() < 0.3 ? 'turret' : 'soldier'));
      if (level >= 2 && Math.random() < 0.45) {
        this.enemies.push(this._makeEnemy(x + 170, 120 + Math.random() * 90, level, 'drone'));
      }
    }

    // Tanque Blindado Jefe al final del sector
    this.boss = {
      x: this.sectorLength - 130,
      y: this.groundY - 76,
      w: 118,
      h: 76,
      hp: 34 + level * 14,
      maxHp: 34 + level * 14,
      vx: -45,
      shootTimer: 1.4,
      activated: false
    };

    this._syncHud();
  }

  _makeEnemy(x, y, level, kind) {
    return {
      x,
      y,
      w: kind === 'turret' ? 34 : 28,
      h: kind === 'turret' ? 32 : 36,
      kind,
      hp: Math.min(8, (kind === 'turret' ? 4 : 2) + Math.floor(level / 3)),
      vx: kind === 'soldier' ? -55 : kind === 'drone' ? -70 : 0,
      shootTimer: 1.0 + Math.random() * 1.2,
      patrolOrigin: x
    };
  }

  _syncHud() {
    const wTag = this.weapon === 'heavy' ? `H(${this.ammo})` : this.weapon === 'plasma' ? `P(${this.ammo})` : 'RIFLE';
    this.api.updateStatusText(`♥${this.lives} · 💣${this.grenades} · ${wTag}`);
  }

  handleInput(evt) {
    if (evt.type === 'keydown' || evt.type === 'virtualdown') {
      if (evt.action === 'up' && this.player.grounded && !this.api.input.isPressed('down')) {
        this.player.vy = -510;
        this.player.grounded = false;
        this.api.audio.play('jump');
      } else if (evt.action === 'down' && this.player.grounded && this.player.y + this.player.h < this.groundY - 4) {
        // Bajar de plataforma elevada con Abajo
        this.player.y += 10;
        this.player.grounded = false;
      } else if (evt.action === 'action') {
        this._fireWeapon();
      } else if (evt.action === 'secondary') {
        this._throwGrenade();
      }
    } else if (evt.type === 'pointerdown') {
      if (evt.x > 0.65) this._fireWeapon();
      else if (evt.y < 0.4 && this.player.grounded) {
        this.player.vy = -510;
        this.player.grounded = false;
        this.api.audio.play('jump');
      }
    }
  }

  _fireWeapon() {
    if (this.shootCooldown > 0) return;
    const p = this.player;
    // Permite disparar hacia arriba manteniendo Arriba/W en el aire o agachado+Arriba, para abatir drones
    const aimUp = this.api.input.isPressed('up') ? -1 : 0;
    this.muzzleTimer = 0.09;
    this.aimUpActive = Boolean(aimUp);
    const sx = p.x + (aimUp ? p.w / 2 : (p.facing > 0 ? p.w : 0));
    const sy = p.y + (p.crouching ? p.h * 0.65 : p.h * 0.35);

    if (this.weapon === 'heavy' && this.ammo > 0) {
      this.ammo--;
      const spread = (Math.random() - 0.5) * 80;
      this.bullets.push({
        x: sx,
        y: sy,
        vx: aimUp ? spread : p.facing * 640,
        vy: aimUp ? -620 : spread,
        dmg: 1.5,
        color: '#ffbe0b',
        r: 5
      });
      this.shootCooldown = 0.09;
    } else if (this.weapon === 'plasma' && this.ammo > 0) {
      this.ammo--;
      this.bullets.push({
        x: sx,
        y: sy,
        vx: aimUp ? 0 : p.facing * 560,
        vy: aimUp ? -560 : 0,
        dmg: 3,
        color: '#ff2a85',
        r: 8
      });
      this.shootCooldown = 0.24;
    } else {
      this.weapon = 'rifle';
      this.bullets.push({
        x: sx,
        y: sy,
        vx: aimUp ? 0 : p.facing * 580,
        vy: aimUp ? -580 : 0,
        dmg: 1,
        color: '#00f5d4',
        r: 4
      });
      this.shootCooldown = 0.16;
    }

    if (this.ammo <= 0 && this.weapon !== 'rifle') {
      this.weapon = 'rifle';
    }
    this._syncHud();
    this.api.audio.play('shoot');
  }

  _throwGrenade() {
    if (this.grenades <= 0 || this.grenadeCooldown > 0) return;
    this.grenades--;
    this.grenadeCooldown = 0.35;
    this.grenadeObjs.push({
      x: this.player.x + this.player.w / 2,
      y: this.player.y + 8,
      vx: this.player.facing * 310,
      vy: -360,
      timer: 1.25
    });
    this._syncHud();
    this.api.audio.play('grenade');
  }

  update(dt) {
    const p = this.player;
    const w = this.api.width;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    if (this.muzzleTimer > 0) this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.grenadeCooldown > 0) this.grenadeCooldown -= dt;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);

    p.crouching = this.api.input.isPressed('down') && p.grounded;
    let moveX = 0;
    if (this.api.input.isPressed('left')) {
      moveX -= 1;
      p.facing = -1;
    }
    if (this.api.input.isPressed('right')) {
      moveX += 1;
      p.facing = 1;
    }
    p.moving = moveX !== 0;
    if (p.moving && p.grounded) p.walkPhase += dt * 11;
    p.x += moveX * (p.crouching ? 110 : 250) * dt;
    p.x = Math.max(this.cameraX + 16, Math.min(this.sectorLength - 40, p.x));

    if (this.api.input.isPressed('action')) {
      this._fireWeapon();
    }

    // Gravedad y plataformas
    const prevBottom = p.y + p.h;
    p.vy += 1200 * dt;
    p.y += p.vy * dt;
    p.grounded = false;

    if (p.y + p.h >= this.groundY) {
      p.y = this.groundY - p.h;
      p.vy = 0;
      p.grounded = true;
    } else if (p.vy >= 0 && !this.api.input.isPressed('down')) {
      for (const plat of this.platforms) {
        if (
          p.x + p.w > plat.x &&
          p.x < plat.x + plat.w &&
          prevBottom <= plat.y + 8 &&
          p.y + p.h >= plat.y
        ) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
    }

    // Seguimiento de cámara lateral (avanza con el jugador, bloqueada en la arena del Jefe)
    const desiredCam = Math.max(this.cameraX, p.x - w * 0.36);
    this.cameraX = Math.min(this.sectorLength - w, desiredCam);

    // Balas del jugador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < this.cameraX - 40 || b.x > this.cameraX + w + 40 || b.y < -20 || b.y > this.api.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Impacto en cajas de suministros
      let consumed = false;
      for (let cIdx = this.crates.length - 1; cIdx >= 0; cIdx--) {
        const cr = this.crates[cIdx];
        if (b.x > cr.x && b.x < cr.x + cr.w && b.y > cr.y && b.y < cr.y + cr.h) {
          cr.hp -= b.dmg;
          this.bullets.splice(i, 1);
          consumed = true;
          if (cr.hp <= 0) {
            this.crates.splice(cIdx, 1);
            this._spawnSupply(cr.x + cr.w / 2, cr.y + 8);
            this.api.audio.play('brick');
          }
          break;
        }
      }
      if (consumed) continue;

      // Impacto en Jefe Tanque
      if (
        this.boss &&
        b.x > this.boss.x &&
        b.x < this.boss.x + this.boss.w &&
        b.y > this.boss.y &&
        b.y < this.boss.y + this.boss.h
      ) {
        this.boss.hp -= b.dmg;
        this.bullets.splice(i, 1);
        this.api.audio.play('hit');
        if (this.boss.hp <= 0) {
          this._defeatBoss();
          return;
        }
        continue;
      }

      // Impacto en enemigos
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.hp -= b.dmg;
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this.enemies.splice(eIdx, 1);
            this.api.addScore(50);
            this.api.audio.play('explosion');
            this.explosions.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 24, life: 0.25 });
          } else {
            this.api.audio.play('hit');
          }
          break;
        }
      }
    }

    // Granadas parabólicas
    for (let i = this.grenadeObjs.length - 1; i >= 0; i--) {
      const g = this.grenadeObjs[i];
      g.vy += 900 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.timer -= dt;
      if (g.y >= this.groundY - 6) {
        g.y = this.groundY - 6;
        g.vy = -Math.abs(g.vy) * 0.52;
        g.vx *= 0.72;
      }
      const hitEnemy = this.enemies.some((e) => g.x > e.x && g.x < e.x + e.w && g.y > e.y && g.y < e.y + e.h);
      const hitBoss = this.boss && g.x > this.boss.x && g.x < this.boss.x + this.boss.w && g.y > this.boss.y && g.y < this.boss.y + this.boss.h;
      if (g.timer <= 0 || hitEnemy || hitBoss) {
        this._explodeArea(g.x, g.y, 82, 8);
        this.grenadeObjs.splice(i, 1);
      }
    }

    // Enemigos activos cercanos a la cámara
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.x < this.cameraX - 80 || e.x > this.cameraX + w + 120) continue;

      if (e.kind === 'soldier') {
        e.x += e.vx * dt;
        if (Math.abs(e.x - e.patrolOrigin) > 90) e.vx *= -1;
      } else if (e.kind === 'drone') {
        e.x += e.vx * dt;
        e.y += Math.sin(e.x * 0.03) * 45 * dt;
      }

      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        const ang = Math.atan2(p.y + 16 - (e.y + 12), p.x + 14 - (e.x + 14));
        const spd = Math.min(390, 230 + (diff.level - 1) * 10);
        this.enemyBullets.push({
          x: e.x + e.w / 2,
          y: e.y + e.h / 2,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 5
        });
        e.shootTimer = Math.max(0.95, 2.0 - (diff.level - 1) * 0.06);
      }

      if (
        p.invuln <= 0 &&
        p.x + p.w > e.x &&
        p.x < e.x + e.w &&
        p.y + p.h > e.y &&
        p.y < e.y + e.h
      ) {
        this._damagePlayer('Herido en combate cuerpo a cuerpo');
        return;
      }
    }

    // Jefe Tanque
    if (this.boss && this.boss.x < this.cameraX + w + 20) {
      this.boss.activated = true;
      this.boss.x += this.boss.vx * dt;
      if (this.boss.x < this.cameraX + w * 0.45 || this.boss.x + this.boss.w > this.sectorLength - 20) {
        this.boss.vx *= -1;
      }
      this.boss.shootTimer -= dt;
      if (this.boss.shootTimer <= 0) {
        const dirToPlayer = p.x < this.boss.x + this.boss.w / 2 ? -1 : 1;
        this.enemyBullets.push(
          { x: this.boss.x + (dirToPlayer > 0 ? this.boss.w : 0), y: this.boss.y + 22, vx: dirToPlayer * 280, vy: 0, r: 7 },
          { x: this.boss.x + this.boss.w / 2, y: this.boss.y + 10, vx: dirToPlayer * 220, vy: -140, r: 6 }
        );
        this.boss.shootTimer = Math.max(0.7, 1.35 - (diff.level - 1) * 0.04);
      }
    }

    // Balas enemigas
    const playerHitY = p.crouching ? p.y + p.h * 0.45 : p.y;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < this.cameraX - 40 || eb.x > this.cameraX + w + 40 || eb.y > this.api.height || eb.y < -30) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (
        p.invuln <= 0 &&
        eb.x > p.x &&
        eb.x < p.x + p.w &&
        eb.y > playerHitY &&
        eb.y < p.y + p.h
      ) {
        this.enemyBullets.splice(i, 1);
        this._damagePlayer('Impacto de fuego enemigo');
        return;
      }
    }

    // Suministros
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (p.x + p.w > pk.x - 14 && p.x < pk.x + 14 && p.y + p.h > pk.y - 14 && p.y < pk.y + 14) {
        if (pk.kind === 'heavy') {
          this.weapon = 'heavy';
          this.ammo = 60;
        } else if (pk.kind === 'plasma') {
          this.weapon = 'plasma';
          this.ammo = 25;
        } else if (pk.kind === 'grenade') {
          this.grenades = Math.min(12, this.grenades + 4);
        } else if (pk.kind === 'heal') {
          this.lives = Math.min(6, this.lives + 1);
        }
        this.api.addScore(40);
        this.api.audio.play('pickup');
        this._syncHud();
        this.pickups.splice(i, 1);
      }
    }

    // Explosiones visuales
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].life -= dt;
      if (this.explosions[i].life <= 0) this.explosions.splice(i, 1);
    }
    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
  }

  _spawnSupply(x, y) {
    const kinds = ['heavy', 'plasma', 'grenade', 'heal'];
    this.pickups.push({ x, y, kind: kinds[Math.floor(Math.random() * kinds.length)] });
  }

  _explodeArea(cx, cy, radius, dmg) {
    this.api.audio.play('boom');
    this.explosions.push({ x: cx, y: cy, r: radius * 0.7, life: 0.35 });
    spawnShockwave(this.shockwaves, cx, cy, { color: '#fb923c', maxRadius: radius * 1.05, life: 0.35, lineWidth: 4 });
    spawnFXParticles(this.particles, cx, cy, 18, {
      colors: ['#fef08a', '#fb923c', '#ef4444', '#64748b'],
      speedMax: 220,
      gravity: 260
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy) < radius) {
        e.hp -= dmg;
        if (e.hp <= 0) {
          this.enemies.splice(i, 1);
          this.api.addScore(60);
        }
      }
    }

    if (this.boss && Math.hypot(this.boss.x + this.boss.w / 2 - cx, this.boss.y + this.boss.h / 2 - cy) < radius + 55) {
      this.boss.hp -= dmg;
      if (this.boss.hp <= 0) {
        this._defeatBoss();
      }
    }
  }

  _defeatBoss() {
    this.explosions.push({ x: this.boss.x + this.boss.w / 2, y: this.boss.y + 30, r: 90, life: 0.5 });
    this.boss = null;
    this.api.addScore(500);
    const nextLvl = this.api.level.level + 1;
    this.api.setLevel(nextLvl);
    this.api.audio.play('levelUp');
    this._setupSector(nextLvl);
  }

  _damagePlayer(reason) {
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

    // 1. Cielo de combate industrial cacheado
    if (!drawCachedBackdrop(ctx, this.skyBackdrop, 0, 0, w, this.groundY)) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Paralaje lejano: torres industriales y focos antiaéreos
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const bx = (((i * 210 - cam * 0.25) % (w + 260)) + (w + 260)) % (w + 260) - 130;
      const bh = 130 + (i % 3) * 45;
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(bx, this.groundY - bh, 118, bh);
      // Ventanas / luces de búnker
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 146, 60, 0.35)' : 'rgba(56, 189, 248, 0.25)';
      for (let wy = this.groundY - bh + 18; wy < this.groundY - 24; wy += 24) {
        ctx.fillRect(bx + 14, wy, 14, 8);
        ctx.fillRect(bx + 44, wy, 14, 8);
        ctx.fillRect(bx + 74, wy, 14, 8);
      }
      if (i % 3 === 0) {
        // Reflector giratorio en azotea
        const sweep = Math.sin(this.animTime * 1.4 + i) * 55;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.06)';
        ctx.beginPath();
        ctx.moveTo(bx + 55, this.groundY - bh);
        ctx.lineTo(bx + 10 + sweep, 20);
        ctx.lineTo(bx + 100 + sweep, 20);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Paralaje medio: muros derruidos y barriles lejanos
    for (let i = 0; i < 12; i++) {
      const mx = (((i * 150 - cam * 0.55) % (w + 180)) + (w + 180)) % (w + 180) - 90;
      ctx.fillStyle = '#27273f';
      ctx.fillRect(mx, this.groundY - 46 - (i % 2) * 18, 86, 46 + (i % 2) * 18);
    }

    // 4. Calzada militar de acero remachada + franja de peligro
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, this.groundY, w, 12);
    // Franjas amarillas/negras de advertencia desplazándose con cámara
    const stripeShift = Math.floor(cam % 40);
    for (let sx = -40 - stripeShift; sx < w + 40; sx += 40) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx, this.groundY, 20, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx + 20, this.groundY, 20, 5);
    }
    // Remaches de placas de acero
    ctx.fillStyle = '#475569';
    const plateShift = Math.floor(cam % 64);
    for (let px = -plateShift; px < w; px += 64) {
      ctx.fillRect(px, this.groundY + 12, 2, h - this.groundY - 12);
      ctx.fillRect(px + 8, this.groundY + 22, 4, 4);
      ctx.fillRect(px + 50, this.groundY + 22, 4, 4);
    }

    ctx.save();
    ctx.translate(-cam, 0);

    // Pasarelas / Plataformas metálicas con vigas de celosía
    for (const pl of this.platforms) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(pl.x, pl.y, pl.w, 4);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let rx = pl.x + 8; rx < pl.x + pl.w - 14; rx += 22) {
        ctx.moveTo(rx, pl.y + 4);
        ctx.lineTo(rx + 14, pl.y + pl.h);
        ctx.moveTo(rx + 14, pl.y + 4);
        ctx.lineTo(rx, pl.y + pl.h);
      }
      ctx.stroke();
    }

    // Cajas de munición de madera pixel art
    for (const cr of this.crates) {
      drawSprite(ctx, this.sprites.crate, cr.x, cr.y, cr.w, cr.h, { centered: false });
      if (cr.hp === 1) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cr.x + 5, cr.y + 4);
        ctx.lineTo(cr.x + 16, cr.y + 18);
        ctx.lineTo(cr.x + 24, cr.y + 24);
        ctx.stroke();
      }
    }

    // Suministros tácticos (Heavy, Plasma, Granada, Botiquín)
    const bob = Math.sin(this.animTime * 5) * 2.5;
    for (const pk of this.pickups) {
      const py = pk.y + bob;
      const color = pk.kind === 'heal' ? '#ef4444' : pk.kind === 'grenade' ? '#f59e0b' : pk.kind === 'heavy' ? '#facc15' : '#38bdf8';
      drawGlowCircle(ctx, pk.x, py, 20, `${color}44`);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(pk.x - 13, py - 13, 26, 26, 5);
      ctx.fill();
      ctx.stroke();
      if (pk.kind === 'heal') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pk.x - 10, py - 9, 20, 18);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pk.x - 2.5, py - 7, 5, 14);
        ctx.fillRect(pk.x - 7, py - 2.5, 14, 5);
      } else {
        ctx.fillStyle = color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pk.kind[0].toUpperCase(), pk.x, py + 5);
      }
    }

    // Enemigos: Soldados rebeldes, Torretas y Drones rotor
    for (const e of this.enemies) {
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      if (e.kind === 'drone') {
        const df = Math.floor(this.animTime * 16) % 2;
        const hover = Math.sin(this.animTime * 7 + e.x * 0.05) * 3;
        drawGlowCircle(ctx, cx, cy + hover, 22, 'rgba(124, 58, 237, 0.25)');
        drawSprite(ctx, this.sprites.drone[df], cx, cy + hover, e.w + 10, e.h + 4, { flipX: e.vx > 0 });
      } else if (e.kind === 'turret') {
        drawSprite(ctx, this.sprites.turret, cx, cy, e.w + 6, e.h + 6);
      } else {
        const sf = Math.floor(this.animTime * 7 + e.x * 0.1) % 2;
        drawSprite(ctx, this.sprites.soldier[sf], cx, cy, e.w + 10, e.h + 4, { flipX: e.vx < 0 });
      }
    }

    // Tanque Pesado Jefe con orugas, torreta y chimenea de humo
    if (this.boss) {
      const b = this.boss;
      // Orugas inferiores
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(b.x + 4, b.y + b.h - 24, b.w - 8, 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Ruedas giratorias de oruga
      for (let wi = 0; wi < 4; wi++) {
        const wx = b.x + 20 + wi * 26;
        const wy = b.y + b.h - 12;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(wx + Math.cos(this.animTime * 6 + wi) * 3, wy + Math.sin(this.animTime * 6 + wi) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Casco blindado verde oliva/acero
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.roundRect(b.x + 8, b.y + 18, b.w - 16, b.h - 38, 8);
      ctx.fill();
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Torreta y cañón principal
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.roundRect(b.x + 22, b.y + 2, b.w - 48, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x - 28, b.y + 8, 52, 11);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(b.x + 36, b.y + 8, 12, 8);
      // Barra de vida del Jefe
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(b.x - 2, b.y - 18, b.w + 4, 11);
      ctx.fillStyle = b.hp < b.maxHp * 0.35 ? '#ef4444' : '#22c55e';
      ctx.fillRect(b.x, b.y - 16, b.w * (b.hp / b.maxHp), 7);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x - 2, b.y - 18, b.w + 4, 11);
    }

    // Commando héroe animado
    const p = this.player;
    if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0) {
      const drawH = p.crouching ? p.h * 0.68 : p.h;
      const drawY = p.y + (p.h - drawH);
      const frame = p.moving ? Math.floor(p.walkPhase) % 2 : 0;
      const cx = p.x + p.w / 2;
      const cy = drawY + drawH / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, p.y + p.h, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, this.sprites.commando[frame], cx, cy, p.w + 14, drawH + 4, {
        flipX: p.facing < 0
      });
      if (this.muzzleTimer > 0) {
        const mx = this.aimUpActive ? cx : p.facing > 0 ? p.x + p.w + 10 : p.x - 10;
        const my = this.aimUpActive ? drawY - 6 : drawY + drawH * 0.38;
        drawGlowCircle(ctx, mx, my, 15, 'rgba(254, 240, 138, 0.9)');
      }
    }

    // Proyectiles con estela
    for (const b of this.bullets) {
      drawGlowCircle(ctx, b.x, b.y, b.r * 2.1, `${b.color}55`);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const eb of this.enemyBullets) {
      drawGlowCircle(ctx, eb.x, eb.y, eb.r * 2.2, 'rgba(244, 63, 94, 0.45)');
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Granadas giratorias
    for (const g of this.grenadeObjs) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(this.animTime * 10);
      ctx.fillStyle = '#3f6212';
      ctx.strokeStyle = '#bef264';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-3, -10, 6, 3);
      ctx.restore();
    }

    for (const ex of this.explosions) {
      const fade = Math.max(0, ex.life / 0.35);
      drawGlowCircle(ctx, ex.x, ex.y, ex.r * 1.4, `rgba(251, 146, 60, ${fade * 0.85})`);
      ctx.fillStyle = `rgba(254, 240, 138, ${fade * 0.85})`;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);

    ctx.restore();
  }

  destroy() {}
}
