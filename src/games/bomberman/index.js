/**
 * 13. BLAST GRID (Bomberman Clásico — 16-bit Adventure Pixel Art)
 * Laberinto destructible con bombas temporizadas, reacciones en cadena,
 * mejoras (+Bomba, +Llama, +Velocidad), enemigos patrulleros y portal de salida infinito.
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

const DIRS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 }
];

const HERO_FRAMES = [
  [
    '......WWWW......',
    '....WWCCWWWW....',
    '...WCCCCCCCCW...',
    '..WCCKKKKKKCCW..',
    '..WCKKKBBKKKCW..',
    '..WCCKKKKKKCCW..',
    '...WWCCCCCCWW...',
    '....BBBBBBBB....',
    '..CCBBGGGGGBBCC.',
    '..CCBGBBBBGBBCC.',
    '...CBBBBBBBBBC..',
    '....BBBBBBBB....',
    '....KKKK.KKKK...',
    '...KKWW...KKWW..',
    '...KKKK...KKKK..',
    '................'
  ],
  [
    '.....WWWW.......',
    '....WWCCWWWW....',
    '...WCCCCCCCCW...',
    '..WCCKKKKKKCCW..',
    '..WCKKKBBKKKCW..',
    '..WCCKKKKKKCCW..',
    '...WWCCCCCCWW...',
    '....BBBBBBBB....',
    '..CCBBGGGGGBBCC.',
    '..CCBGBBBBGBBCC.',
    '...CBBBBBBBBBC..',
    '....BBBBBBBB....',
    '...KKKK...KKKK..',
    '..KKWW.....KKWW.',
    '..KKKK.....KKKK.',
    '................'
  ]
];

const SLIME_FRAMES = [
  [
    '......OOOO......',
    '....OOMMMMO.....',
    '...OMMMMMMMO....',
    '..OMMMMMMMMMO...',
    '.OMMMWWMMWWMMO..',
    '.OMMMWKMMWKMMO..',
    '.OMMMMMMMMMMMO..',
    '.OMMMKKKKKKMMO..',
    '.OMMMMMMMMMMMO..',
    '.OMMMMOOOOOMMO..',
    '..OMMMMMMMMMO...',
    '...OOOMMMMOO....',
    '....OO....OO....',
    '...OO......OO...',
    '................',
    '................'
  ],
  [
    '................',
    '.....OOOOOO.....',
    '...OOMMMMMMOO...',
    '..OMMMMMMMMMMO..',
    '.OMMMWWMMWWMMMO.',
    '.OMMMWKMMWKMMMO.',
    '.OMMMMMMMMMMMMO.',
    '.OMMMKKKKKKMMMO.',
    '.OMMMMMMMMMMMMO.',
    '.OMMMOOOOOOMMMO.',
    '..OMMMMMMMMMMO..',
    '..OOOMMMMMMOOO..',
    '..OO........OO..',
    '................',
    '................',
    '................'
  ]
];

const HUNTER_FRAMES = [
  [
    '...KK......KK...',
    '..KRRK....KRRK..',
    '...KRPPPPPPPK...',
    '..KPPPPPPPPPPK..',
    '.KPPKKKKKKKKPPK.',
    '.KPKRWWWWWWKRPK.',
    '.KPKKKKKKKKKKPK.',
    '..KPPPPPPPPPPK..',
    '..KPPCCGGCCPPK..',
    '.KPPCCCCCCCCPPK.',
    '..KPPCCCCCCPPK..',
    '...KPPPPPPPPK...',
    '...KKK....KKK...',
    '..KCCK....KCCK..',
    '..KKKK....KKKK..',
    '................'
  ],
  [
    '....KK....KK....',
    '...KRRK..KRRK...',
    '...KRPPPPPPPK...',
    '..KPPPPPPPPPPK..',
    '.KPPKKKKKKKKPPK.',
    '.KPKRRWWWWWRRPK.',
    '.KPKKKKKKKKKKPK.',
    '..KPPPPPPPPPPK..',
    '..KPPCCGGCCPPK..',
    '.KPPCCCCCCCCPPK.',
    '..KPPCCCCCCPPK..',
    '...KPPPPPPPPK...',
    '..KKK......KKK..',
    '.KCCK......KCCK.',
    '.KKKK......KKKK.',
    '................'
  ]
];

const PILLAR_GRID = [
  'LLLLLLLLLLLLLLLL',
  'LSSSSSSSSSSSSSSD',
  'LSKKSSSSSSSSKKSD',
  'LSKKSSLLLLSSKKSD',
  'LSSSSLMMMMDSSSS.',
  'LSSSSLMSSMDSSSSD',
  'LSSSSLMSSMDSSSSD',
  'LSSSSLMMMMDSSSSD',
  'LSSSSSDDDDSSSSD.',
  'LSSSSSSSSSSSSSSD',
  'LSSSSSSSSSSSSSSD',
  'LSSLLLLLLLLLLSSD',
  'LSKKSSSSSSSSKKSD',
  'LSKKSSSSSSSSKKSD',
  'LDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD'
];

const CRATE_GRID = [
  'BBBBBBBBBBBBBBBB',
  'BYYYYYYYYYYYYYYD',
  'BYWWWWWWWWWWWWYD',
  'BYWBBBBBBBBBBWYD',
  'BYWBYDDDDDDYBWYD',
  'BYWBYYDDDDYYBWYD',
  'BYWBDYYDDYYDBWYD',
  'BYWBDDYYYYDDBWYD',
  'BYWBDDYYYYDDBWYD',
  'BYWBDYYDDYYDBWYD',
  'BYWBYYDDDDYYBWYD',
  'BYWBYDDDDDDYBWYD',
  'BYWBBBBBBBBBBWYD',
  'BYDDDDDDDDDDDDYD',
  'BDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD'
];

const BOMB_SPRITE_GRID = [
  '........YY......',
  '.......Y.Y......',
  '......GGG.......',
  '.....DDDDD......',
  '...DDKKKKKDD....',
  '..DKWWKKKKKKD...',
  '.DKWWWKKKKKKKD..',
  '.DKWWKKKKKKKKD..',
  '.DKKKKKKKKKKKD..',
  '.DKKKKKKKKKKKD..',
  '.DKKKKKKKKSSSD..',
  '..DKBBBBBKSSD...',
  '...DDKKKKKDD....',
  '....DDDDDDD.....',
  '................',
  '................'
];

const PU_BOMB_GRID = [
  'BBBBBBBBBBBBBBBB',
  'BCCCCCCCCCCCCCCB',
  'BCKKKKK..KKKKKCB',
  'BCKKK..YY..KKKCB',
  'BCKKK.GGGG.KKKCB',
  'BCKK.DDDDDD.KKCB',
  'BCK.DDWKKKKD.KCB',
  'BCK.DKWKKKKD.KCB',
  'BCK.DKKKKKKD.KCB',
  'BCK.DKKKKSSD.KCB',
  'BCKK.DDDDDD.KKCB',
  'BCKKK......KKKCB',
  'BCKKKKKKKKKKKKCB',
  'BCWWWWWWWWWWWWCB',
  'BCCCCCCCCCCCCCCB',
  'BBBBBBBBBBBBBBBB'
];

const PU_FIRE_GRID = [
  'BBBBBBBBBBBBBBBB',
  'BMMMMMMMMMMMMMMB',
  'BMKKKKKKKKKKKKMB',
  'BMKKKKKYYKKKKKMB',
  'BMKKKKYYYYKKKKMB',
  'BMKKKYYOOYYKKKMB',
  'BMKKYOOYYOOYKKMB',
  'BMKKYOYWWYOYKKMB',
  'BMKKYOOYYOOYKKMB',
  'BMKKKOOOOOOKKKMB',
  'BMKKKKOOOOKKKKMB',
  'BMKKKKKKKKKKKKMB',
  'BMWWWWWWWWWWWWMB',
  'BMMMMMMMMMMMMMMB',
  'BBBBBBBBBBBBBBBB',
  '................'
];

const PU_SPEED_GRID = [
  'BBBBBBBBBBBBBBBB',
  'BYYYYYYYYYYYYYYB',
  'BYKKKKKKKKKKKKYB',
  'BYKKKKKKKYYKKKYB',
  'BYKKKKKKYYKKKKYB',
  'BYKKKKKYYKKKKKYB',
  'BYKKKKYYYYYYKKYB',
  'BYKKKKKKKYYKKKYB',
  'BYKKKKKKYYKKKKYB',
  'BYWWWWWYYWWWWKYB',
  'BYWCCCCCCCCCKKYB',
  'BYWWWWWWWWWWWKYB',
  'BYKKKKKKKKKKKKYB',
  'BYYYYYYYYYYYYYYB',
  'BBBBBBBBBBBBBBBB',
  '................'
];

export default class BombermanGame {
  constructor(api) {
    this.api = api;
    this.cols = 15;
    this.rows = 13;
    this.tile = 48;
    this.lives = 3;
    this.grid = []; // 0: vacío, 1: pilar sólido, 2: bloque destructible
    this.bombs = [];
    this.flames = [];
    this.powerUps = [];
    this.enemies = [];
    this.particles = [];
    this.shockwaves = [];
    this.portal = null;
    this.player = null;
    this.animTime = 0;
    this.sprites = null;
    this.backdrop = null;
    this.stats = { maxBombs: 1, range: 2, speedBonus: 0 };
  }

  init() {
    this.tile = Math.floor(Math.min(this.api.width / this.cols, this.api.height / this.rows));
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    const heroPal = { W: '#f8fafc', C: '#38bdf8', K: '#0f172a', B: '#1d4ed8', G: '#fbbf24' };
    this.sprites = {
      hero: compileSpriteFrames(HERO_FRAMES, heroPal, 2),
      slimes: [
        compileSpriteFrames(SLIME_FRAMES, { O: '#be185d', M: '#ec4899', W: '#ffffff', K: '#0f172a' }, 2),
        compileSpriteFrames(SLIME_FRAMES, { O: '#b45309', M: '#f59e0b', W: '#ffffff', K: '#0f172a' }, 2)
      ],
      hunters: compileSpriteFrames(HUNTER_FRAMES, { K: '#0f172a', R: '#f43f5e', P: '#7c3aed', W: '#e0f2fe', C: '#22d3ee', G: '#fde047' }, 2),
      pillar: compilePixelSprite(PILLAR_GRID, { L: '#64748b', S: '#334155', M: '#475569', D: '#1e293b', K: '#0f172a' }, 2),
      crate: compilePixelSprite(CRATE_GRID, { B: '#78350f', Y: '#d97706', W: '#fbbf24', D: '#451a03' }, 2),
      bomb: compilePixelSprite(BOMB_SPRITE_GRID, { Y: '#fde047', G: '#94a3b8', D: '#334155', K: '#0f172a', W: '#f8fafc', S: '#475569', B: '#38bdf8' }, 2),
      puBomb: compilePixelSprite(PU_BOMB_GRID, { B: '#0c4a6e', C: '#38bdf8', K: '#0f172a', Y: '#fde047', G: '#94a3b8', D: '#334155', W: '#ffffff', S: '#64748b' }, 2),
      puFire: compilePixelSprite(PU_FIRE_GRID, { B: '#831843', M: '#f43f5e', K: '#0f172a', Y: '#fde047', O: '#f97316', W: '#ffffff' }, 2),
      puSpeed: compilePixelSprite(PU_SPEED_GRID, { B: '#78350f', Y: '#facc15', K: '#0f172a', W: '#ffffff', C: '#22d3ee' }, 2)
    };

    const t = this.tile;
    const boardW = this.cols * t;
    const boardH = this.rows * t;
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const bgGrad = bctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d1a');
      bgGrad.addColorStop(1, '#111827');
      bctx.fillStyle = bgGrad;
      bctx.fillRect(0, 0, w, h);

      const ox = Math.floor((w - boardW) / 2);
      const oy = Math.floor((h - boardH) / 2);

      // Flagstone dungeon arena floor
      for (let gy = 0; gy < this.rows; gy++) {
        for (let gx = 0; gx < this.cols; gx++) {
          const px = ox + gx * t;
          const py = oy + gy * t;
          const even = (gx + gy) % 2 === 0;
          bctx.fillStyle = even ? '#13203b' : '#0f1a31';
          bctx.fillRect(px, py, t, t);
          bctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
          bctx.lineWidth = 1;
          bctx.strokeRect(px + 1, py + 1, t - 2, t - 2);
          if ((gx * 7 + gy * 13) % 5 === 0) {
            bctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
            bctx.fillRect(px + 6, py + 8, Math.max(4, t * 0.2), 3);
            bctx.fillRect(px + t * 0.55, py + t * 0.65, Math.max(4, t * 0.25), 2);
          }
        }
      }
      bctx.strokeStyle = '#38bdf8';
      bctx.lineWidth = 2;
      bctx.strokeRect(ox - 1, oy - 1, boardW + 2, boardH + 2);
    });
  }

  start() {}

  restart() {
    this.lives = 3;
    this.stats = { maxBombs: 1, range: 2, speedBonus: 0 };
    this._buildLevel(1);
  }

  _buildLevel(level) {
    this.bombs = [];
    this.flames = [];
    this.powerUps = [];
    this.enemies = [];
    this.particles = [];
    this.shockwaves = [];
    this.grid = [];

    const softBlocks = [];
    const blockDensity = Math.min(0.68, 0.42 + (level - 1) * 0.03);

    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        const isBorder = x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1;
        const isPillar = x % 2 === 0 && y % 2 === 0;
        const isStartSafe = (x <= 2 && y === 1) || (x === 1 && y <= 2);

        if (isBorder || isPillar) {
          row.push(1);
        } else if (!isStartSafe && Math.random() < blockDensity) {
          row.push(2);
          softBlocks.push({ x, y });
        } else {
          row.push(0);
        }
      }
      this.grid.push(row);
    }

    // Asegurar al menos algunos bloques destructibles y ocultar portal bajo uno
    if (softBlocks.length > 0) {
      const pIdx = Math.floor(Math.random() * softBlocks.length);
      this.portal = { ...softBlocks[pIdx], revealed: false };
    } else {
      this.portal = { x: this.cols - 2, y: this.rows - 2, revealed: true };
    }

    // Colocar jugador en esquina segura (1,1)
    this.player = {
      x: 1,
      y: 1,
      invuln: 2.0,
      facing: { x: 0, y: 1 },
      walkPhase: 0,
      moving: false
    };

    // Generar enemigos en celdas libres alejadas del inicio
    const freeCells = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.grid[y][x] === 0 && Math.hypot(x - 1, y - 1) > 4.5) {
          freeCells.push({ x, y });
        }
      }
    }

    const enemyCount = Math.min(10, 3 + Math.floor(level * 0.85));
    const colors = ['#ff2a85', '#ff9e00', '#9b5de5', '#00bbf9'];
    for (let i = 0; i < enemyCount && freeCells.length > 0; i++) {
      const idx = Math.floor(Math.random() * freeCells.length);
      const cell = freeCells.splice(idx, 1)[0];
      this.enemies.push({
        x: cell.x,
        y: cell.y,
        dir: { ...DIRS[Math.floor(Math.random() * DIRS.length)] },
        color: colors[i % colors.length],
        smart: i % 2 === 1 && level >= 2,
        speed: Math.min(4.2, 2.0 + (level - 1) * 0.18)
      });
    }

    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`♥${this.lives} · 💣${this.stats.maxBombs} · 🔥${this.stats.range}`);
  }

  handleInput(evt) {
    if ((evt.type === 'keydown' || evt.type === 'virtualdown') && !evt.repeat && evt.action === 'action') {
      this._placeBomb();
    }
  }

  _placeBomb() {
    if (!this.player) return;
    if (this.bombs.length >= this.stats.maxBombs) return;
    const gx = Math.round(this.player.x);
    const gy = Math.round(this.player.y);
    if (this.bombs.some((b) => b.x === gx && b.y === gy)) return;

    this.bombs.push({
      x: gx,
      y: gy,
      timer: 2.1,
      range: this.stats.range,
      ownerWalkOut: true
    });
    this.api.audio.play('bomb');
  }

  _isWalkable(cx, cy, ignoreBombAt = null) {
    if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) return false;
    if (this.grid[cy][cx] !== 0) return false;
    for (const b of this.bombs) {
      if (b.x === cx && b.y === cy) {
        if (ignoreBombAt && ignoreBombAt.x === cx && ignoreBombAt.y === cy) continue;
        return false;
      }
    }
    return true;
  }

  update(dt) {
    this.animTime += dt;
    if (this.player.invuln > 0) {
      this.player.invuln = Math.max(0, this.player.invuln - dt);
    }

    // Permitir salir de la celda de la bomba recién colocada
    const pGx = Math.round(this.player.x);
    const pGy = Math.round(this.player.y);
    let activeOwnBomb = null;
    for (const b of this.bombs) {
      if (b.ownerWalkOut) {
        if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < 0.85) {
          activeOwnBomb = b;
        } else {
          b.ownerWalkOut = false;
        }
      }
    }

    // Movimiento suave del jugador con auto-alineado en pasillos
    let mx = 0;
    let my = 0;
    if (this.api.input.isPressed('left')) mx -= 1;
    if (this.api.input.isPressed('right')) mx += 1;
    if (this.api.input.isPressed('up')) my -= 1;
    if (this.api.input.isPressed('down')) my += 1;

    if (mx !== 0 && my !== 0) my = 0;
    this.player.moving = mx !== 0 || my !== 0;
    if (this.player.moving) {
      this.player.facing = { x: mx, y: my };
      this.player.walkPhase += dt * 10;
      const spd = Math.min(6.4, 3.8 + this.stats.speedBonus * 0.45);
      this._moveGridActor(this.player, mx, my, spd * dt, activeOwnBomb);
    }

    const t = this.tile;
    const offsetX = Math.floor((this.api.width - this.cols * t) / 2);
    const offsetY = Math.floor((this.api.height - this.rows * t) / 2);

    // Recoger mejoras
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (Math.hypot(this.player.x - pu.x, this.player.y - pu.y) < 0.65) {
        if (pu.kind === 'bomb') this.stats.maxBombs = Math.min(6, this.stats.maxBombs + 1);
        else if (pu.kind === 'fire') this.stats.range = Math.min(7, this.stats.range + 1);
        else if (pu.kind === 'speed') this.stats.speedBonus = Math.min(5, this.stats.speedBonus + 1);
        spawnShockwave(this.shockwaves, offsetX + (pu.x + 0.5) * t, offsetY + (pu.y + 0.5) * t, {
          color: pu.kind === 'bomb' ? '#38bdf8' : pu.kind === 'fire' ? '#f43f5e' : '#facc15',
          maxRadius: t * 0.75,
          life: 0.3
        });
        this.api.addScore(35);
        this.api.audio.play('pickup');
        this.powerUps.splice(i, 1);
        this._syncHud();
      }
    }

    // Actualizar temporizador de bombas
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      this.bombs[i].timer -= dt;
      if (this.bombs[i].timer <= 0) {
        this._detonateBomb(i);
      }
    }

    // Actualizar llamas
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.timer -= dt;
      if (f.timer <= 0) {
        this.flames.splice(i, 1);
        continue;
      }
      // Daño al jugador
      if (this.player.invuln <= 0 && Math.hypot(this.player.x - f.x, this.player.y - f.y) < 0.58) {
        this._damagePlayer('Alcanzado por una explosión');
        return;
      }
      // Daño a enemigos
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const en = this.enemies[eIdx];
        if (Math.hypot(en.x - f.x, en.y - f.y) < 0.6) {
          spawnFXParticles(this.particles, offsetX + (en.x + 0.5) * t, offsetY + (en.y + 0.5) * t, 14, {
            colors: [en.color, '#fde047', '#ffffff'],
            speedMax: 160,
            lifeMax: 0.45
          });
          this.enemies.splice(eIdx, 1);
          this.api.addScore(100);
          this.api.audio.play('point');
        }
      }
    }

    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);

    // Mover enemigos y comprobar colisión con jugador
    for (const en of this.enemies) {
      this._moveEnemy(en, dt);
      if (this.player.invuln <= 0 && Math.hypot(en.x - this.player.x, en.y - this.player.y) < 0.62) {
        this._damagePlayer('Atrapado por un dron del laberinto');
        return;
      }
    }

    // Comprobar avance de nivel: todos los enemigos eliminados y jugador en portal
    if (this.enemies.length === 0 && this.portal) {
      this.portal.revealed = true;
      if (Math.hypot(this.player.x - this.portal.x, this.player.y - this.portal.y) < 0.6) {
        const nextLvl = this.api.level.level + 1;
        this.api.setLevel(nextLvl);
        this.api.addScore(200);
        this.api.audio.play('levelUp');
        this._buildLevel(nextLvl);
      }
    }
  }

  _moveGridActor(actor, dx, dy, step, ignoreBombAt) {
    // Auto-alineación al eje perpendicular para doblar suavemente entre pilares
    if (dx !== 0) {
      const cx = Math.round(actor.x);
      const cy = Math.round(actor.y);
      if (Math.abs(actor.y - cy) < 0.42) {
        actor.y += Math.sign(cy - actor.y) * Math.min(Math.abs(cy - actor.y), step * 1.5);
      }
      const nextX = actor.x + dx * step;
      const frontCol = Math.round(nextX + dx * 0.46);
      if (frontCol === cx || this._isWalkable(frontCol, cy, ignoreBombAt)) {
        actor.x = nextX;
      } else {
        // Tope exacto en el centro de la celda actual sin penetrar ni saltar dentro del muro
        actor.x = dx > 0 ? Math.min(nextX, cx) : Math.max(nextX, cx);
      }
    } else if (dy !== 0) {
      const cx = Math.round(actor.x);
      const cy = Math.round(actor.y);
      if (Math.abs(actor.x - cx) < 0.42) {
        actor.x += Math.sign(cx - actor.x) * Math.min(Math.abs(cx - actor.x), step * 1.5);
      }
      const nextY = actor.y + dy * step;
      const frontRow = Math.round(nextY + dy * 0.46);
      if (frontRow === cy || this._isWalkable(cx, frontRow, ignoreBombAt)) {
        actor.y = nextY;
      } else {
        actor.y = dy > 0 ? Math.min(nextY, cy) : Math.max(nextY, cy);
      }
    }
  }

  _moveEnemy(en, dt) {
    const step = en.speed * dt;
    const cx = Math.round(en.x);
    const cy = Math.round(en.y);
    const nextX = en.x + en.dir.x * step;
    const nextY = en.y + en.dir.y * step;
    const lookCol = Math.round(nextX + en.dir.x * 0.46);
    const lookRow = Math.round(nextY + en.dir.y * 0.46);

    const nearCenter = Math.hypot(en.x - cx, en.y - cy) < 0.08;
    const blocked = (lookCol !== cx || lookRow !== cy) && !this._isWalkable(lookCol, lookRow);

    if (blocked || (nearCenter && Math.random() < 0.25)) {
      const valid = DIRS.filter((d) => this._isWalkable(cx + d.x, cy + d.y));
      if (valid.length > 0) {
        if (en.smart && Math.random() < 0.65) {
          valid.sort(
            (a, b) =>
              Math.hypot(cx + a.x - this.player.x, cy + a.y - this.player.y) -
              Math.hypot(cx + b.x - this.player.x, cy + b.y - this.player.y)
          );
          en.dir = { ...valid[0] };
        } else {
          const nonReverse = valid.filter((d) => !(d.x === -en.dir.x && d.y === -en.dir.y));
          const pool = nonReverse.length ? nonReverse : valid;
          en.dir = { ...pool[Math.floor(Math.random() * pool.length)] };
        }
        en.x = cx;
        en.y = cy;
      }
    }

    const tx = en.x + en.dir.x * step;
    const ty = en.y + en.dir.y * step;
    const tCol = Math.round(tx + en.dir.x * 0.46);
    const tRow = Math.round(ty + en.dir.y * 0.46);
    if ((tCol === cx && tRow === cy) || this._isWalkable(tCol, tRow)) {
      en.x = tx;
      en.y = ty;
    }
  }

  _detonateBomb(index) {
    const bomb = this.bombs[index];
    if (!bomb) return;
    this.bombs.splice(index, 1);
    this.api.audio.play('boom');

    const t = this.tile;
    const offsetX = Math.floor((this.api.width - this.cols * t) / 2);
    const offsetY = Math.floor((this.api.height - this.rows * t) / 2);
    const bCx = offsetX + (bomb.x + 0.5) * t;
    const bCy = offsetY + (bomb.y + 0.5) * t;
    spawnShockwave(this.shockwaves, bCx, bCy, { color: '#fb923c', maxRadius: t * 1.15, life: 0.3 });
    spawnFXParticles(this.particles, bCx, bCy, 10, { colors: ['#fef08a', '#fb923c', '#ef4444'], speedMax: 150 });

    this.flames.push({ x: bomb.x, y: bomb.y, timer: 0.42, center: true });

    for (const d of DIRS) {
      for (let dist = 1; dist <= bomb.range; dist++) {
        const fx = bomb.x + d.x * dist;
        const fy = bomb.y + d.y * dist;
        if (fx < 0 || fx >= this.cols || fy < 0 || fy >= this.rows) break;
        const cell = this.grid[fy][fx];
        if (cell === 1) break; // Pilar sólido detiene la explosión

        this.flames.push({ x: fx, y: fy, timer: 0.42, dir: d });

        // Reacción en cadena con otra bomba
        const chainIdx = this.bombs.findIndex((b) => b.x === fx && b.y === fy);
        if (chainIdx !== -1) {
          this.bombs[chainIdx].timer = Math.min(this.bombs[chainIdx].timer, 0.05);
        }

        if (cell === 2) {
          this.grid[fy][fx] = 0;
          spawnFXParticles(this.particles, offsetX + (fx + 0.5) * t, offsetY + (fy + 0.5) * t, 12, {
            colors: ['#d97706', '#fbbf24', '#78350f', '#fde047'],
            speedMax: 170,
            gravity: 220
          });
          this.api.addScore(15);
          if (this.portal && this.portal.x === fx && this.portal.y === fy) {
            this.portal.revealed = true;
          } else if (Math.random() < 0.24) {
            const kinds = ['bomb', 'fire', 'speed'];
            this.powerUps.push({
              x: fx,
              y: fy,
              kind: kinds[Math.floor(Math.random() * kinds.length)]
            });
          }
          break; // Los bloques destructibles detienen la onda expansiva
        }
      }
    }
  }

  _damagePlayer(reason) {
    this.lives--;
    this._syncHud();
    this.api.audio.play('explosion');
    if (this.lives <= 0) {
      this.api.triggerGameOver({ reason });
      return;
    }
    this.player.x = 1;
    this.player.y = 1;
    this.player.invuln = 2.4;
  }

  render(ctx) {
    const t = this.tile;
    const offsetX = Math.floor((this.api.width - this.cols * t) / 2);
    const offsetY = Math.floor((this.api.height - this.rows * t) / 2);

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, this.api.width, this.api.height)) {
      ctx.fillStyle = '#090e1c';
      ctx.fillRect(0, 0, this.api.width, this.api.height);
    }

    // Bloques sólidos (pilares remachados) y cajas destructibles de madera
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = offsetX + x * t;
        const py = offsetY + y * t;
        const cell = this.grid[y][x];
        if (cell === 1) {
          drawSprite(ctx, this.sprites.pillar, px, py, t, t, { centered: false });
        } else if (cell === 2) {
          drawSprite(ctx, this.sprites.crate, px + 1, py + 1, t - 2, t - 2, { centered: false });
        }
      }
    }

    // Portal de salida arcano animado si fue revelado
    if (this.portal && this.portal.revealed) {
      const px = offsetX + (this.portal.x + 0.5) * t;
      const py = offsetY + (this.portal.y + 0.5) * t;
      const unlocked = this.enemies.length === 0;
      const spin = this.animTime * (unlocked ? 3.8 : 1.0);
      drawGlowCircle(ctx, px, py, t * 0.52, unlocked ? 'rgba(0, 255, 136, 0.5)' : 'rgba(100, 116, 139, 0.25)');
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(spin);
      ctx.strokeStyle = unlocked ? '#00ff88' : '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, t * 0.34, 0, Math.PI * 1.45);
      ctx.stroke();
      ctx.rotate(-spin * 2);
      ctx.strokeStyle = unlocked ? '#fef08a' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, t * 0.2, 0.3, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();
    }

    // Mejoras pixel art flotantes
    const puBob = Math.sin(this.animTime * 4.5) * 2.2;
    for (const pu of this.powerUps) {
      const px = offsetX + (pu.x + 0.5) * t;
      const py = offsetY + (pu.y + 0.5) * t + puBob;
      const sp = pu.kind === 'bomb' ? this.sprites.puBomb : pu.kind === 'fire' ? this.sprites.puFire : this.sprites.puSpeed;
      drawGlowCircle(ctx, px, py, t * 0.42, pu.kind === 'bomb' ? 'rgba(56,189,248,0.3)' : pu.kind === 'fire' ? 'rgba(244,63,94,0.3)' : 'rgba(250,204,21,0.3)');
      drawSprite(ctx, sp, px, py, t * 0.68, t * 0.68);
    }

    // Bombas con chispa animada en la mecha
    for (const b of this.bombs) {
      const bx = offsetX + (b.x + 0.5) * t;
      const by = offsetY + (b.y + 0.5) * t;
      const fuseRatio = Math.max(0, 1 - b.timer / 2.1);
      const pulse = 1 + Math.sin(this.animTime * (10 + fuseRatio * 18)) * 0.08;
      if (fuseRatio > 0.72) {
        drawGlowCircle(ctx, bx, by, t * 0.46, 'rgba(239, 68, 68, 0.38)');
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + t * 0.32, t * 0.28, t * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, this.sprites.bomb, bx, by, t * 0.8 * pulse, t * 0.8 * pulse);
      // Chispa viva
      const sparkR = 2.5 + Math.abs(Math.sin(this.animTime * 35)) * 2.5;
      drawGlowCircle(ctx, bx + t * 0.12, by - t * 0.3, sparkR * 2.2, 'rgba(253,224,71,0.85)');
    }

    // Llamas de explosión multicapa
    for (const f of this.flames) {
      const fx = offsetX + (f.x + 0.5) * t;
      const fy = offsetY + (f.y + 0.5) * t;
      const fade = Math.min(1, f.timer / 0.22);
      drawGlowCircle(ctx, fx, fy, t * 0.62 * fade, 'rgba(251, 146, 60, 0.55)');
      const outer = t * 0.88;
      const inner = t * 0.54;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = f.timer > 0.22 ? '#f97316' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(fx - outer * 0.5, fy - outer * 0.5, outer, outer, 10);
      ctx.fill();
      ctx.fillStyle = f.timer > 0.16 ? '#fef08a' : '#fb923c';
      ctx.beginPath();
      ctx.roundRect(fx - inner * 0.5, fy - inner * 0.5, inner, inner, 7);
      ctx.fill();
      ctx.restore();
    }

    // Enemigos (Slimes saltarines y Hunters acorazados)
    for (const en of this.enemies) {
      const ex = offsetX + (en.x + 0.5) * t;
      const ey = offsetY + (en.y + 0.5) * t;
      const frame = Math.floor(this.animTime * 6) % 2;
      const bob = Math.sin(this.animTime * 9 + en.x) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(ex, ey + t * 0.34, t * 0.28, t * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const spriteSet = en.smart
        ? this.sprites.hunters
        : this.sprites.slimes[en.color === '#ff9e00' ? 1 : 0];
      drawSprite(ctx, spriteSet[frame], ex, ey + bob, t * 0.86, t * 0.86, {
        flipX: en.dir && en.dir.x < 0
      });
    }

    // Jugador Bomber-Hero animado
    if (this.player && (this.player.invuln <= 0 || Math.floor(this.player.invuln * 10) % 2 === 0)) {
      const px = offsetX + (this.player.x + 0.5) * t;
      const py = offsetY + (this.player.y + 0.5) * t;
      const frame = this.player.moving ? Math.floor(this.player.walkPhase) % 2 : 0;
      const bob = this.player.moving ? Math.abs(Math.sin(this.player.walkPhase * Math.PI * 0.5)) * -2 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(px, py + t * 0.35, t * 0.28, t * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (this.player.invuln > 0) {
        drawGlowCircle(ctx, px, py, t * 0.52, 'rgba(56, 189, 248, 0.35)');
      }
      drawSprite(ctx, this.sprites.hero[frame], px, py + bob, t * 0.9, t * 0.9, {
        flipX: this.player.facing && this.player.facing.x < 0
      });
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);
  }

  destroy() {}
}
