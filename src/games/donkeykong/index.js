/**
 * 17. STEEL GIRDER (Donkey Kong Clásico — 1981 Retro Industrial Pixel Arcade)
 * Plataformas de vigas inclinadas conectadas por escaleras. Esquiva o salta barriles rodantes,
 * recoge martillos de choque temporales y alcanza la cima para rescatar el núcleo energético.
 */
import {
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

const WORKER_FRAMES = [
  [
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '....BBSSSSSK....',
    '...BSBSSSSSSS...',
    '...BSBBSSSSKK...',
    '....BBSSSSSS....',
    '....RRRRRRRR....',
    '...BBRRYYRRBB...',
    '..SSBRRRRRRBSS..',
    '..SSBBBBBBBBSS..',
    '....BBBBBBBB....',
    '....BBB..BBB....',
    '...BBB....BBB...',
    '..KKKK....KKKK..',
    '................',
    '................'
  ],
  [
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '....BBSSSSSK....',
    '...BSBSSSSSSS...',
    '...BSBBSSSSKK...',
    '....BBSSSSSS....',
    '....RRRRRRRR....',
    '...BBRRYYRRBB...',
    '..SSBRRRRRRBSS..',
    '..SSBBBBBBBBSS..',
    '....BBBBBBBB....',
    '...BBB...BBB....',
    '..BBB.....BBB...',
    '.KKKK.....KKKK..',
    '................',
    '................'
  ]
];

const CLIMB_FRAMES = [
  [
    '.....RRRRRR.....',
    '....RRRRRRRR....',
    '...BBBRRRRBBB...',
    '..SSRRRRRRRRSS..',
    '..SSBBBBBBBBSS..',
    '....BBBBBBBB....',
    '....BBBBBBBB....',
    '....BBB..BBB....',
    '...KKKK..KKKK...',
    '................',
    '................',
    '................'
  ],
  [
    '.....RRRRRR.....',
    '....RRRRRRRR....',
    '..SSBRRRRRRBSS..',
    '..SSRRRRRRRRSS..',
    '....BBBBBBBB....',
    '....BBBBBBBB....',
    '....BBB..BBB....',
    '...KKKK..KKKK...',
    '................',
    '................',
    '................',
    '................'
  ]
];

const KONG_FRAMES = [
  [
    '......PPPPPP......',
    '....PPPPPPPPPP....',
    '...PPPSSSSSSPPP...',
    '...PPKYYKKYYKPP...',
    '..PPPPSSSSSSPPPP..',
    '..PPPPPSSSSPPPPP..',
    '.PPPPDDDDDDDDPPPP.',
    'PPPPDDGGGGGGDDPPPP',
    'PPPDDDGGGGGGDDDPPP',
    'PPPDDDDDDDDDDDDPPP',
    '.PP..DDDDDDDD..PP.',
    '.....PPPPPPPP.....',
    '....PPPP..PPPP....',
    '...PPPP....PPPP...',
    '..KKKKK....KKKKK..',
    '..................'
  ],
  [
    '..PP..PPPPPP..PP..',
    '.PPPPPPPPPPPPPPPP.',
    'PPPPPPSSSSSSPPPPPP',
    'PP.PPKYYKKYYKPP.PP',
    '...PPPSSSSSSPPP...',
    '...PPPPSSSSPPPP...',
    '...PPDDDDDDDDPP...',
    '...PDDGGGGGGDDP...',
    '..PPDDGGGGGGDDPP..',
    '..PPDDDDDDDDDDPP..',
    '.....DDDDDDDD.....',
    '.....PPPPPPPP.....',
    '....PPPP..PPPP....',
    '...PPPP....PPPP...',
    '..KKKKK....KKKKK..',
    '..................'
  ]
];

export default class DonkeyKongGame {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.player = null;
    this.girders = [];
    this.ladders = [];
    this.barrels = [];
    this.hammers = [];
    this.particles = [];
    this.shockwaves = [];
    this.goal = null;
    this.boss = null;
    this.throwTimer = 0;
    this.animTime = 0;
    this.jumpedBarrels = new Set();
    this.sprites = null;
    this.backdrop = null;
  }

  init() {
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    this.sprites = {
      worker: compileSpriteFrames(WORKER_FRAMES, {
        R: '#ef4444', B: '#1d4ed8', S: '#fed7aa', K: '#1e293b', Y: '#facc15'
      }, 2),
      climb: compileSpriteFrames(CLIMB_FRAMES, {
        R: '#ef4444', B: '#1d4ed8', S: '#fed7aa', K: '#1e293b'
      }, 2.2),
      kong: compileSpriteFrames(KONG_FRAMES, {
        P: '#6d28d9', S: '#c4b5fd', K: '#0f172a', Y: '#fde047', D: '#4c1d95', G: '#a855f7'
      }, 3)
    };

    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#090714');
      grad.addColorStop(1, '#120e24');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Columnas estructurales verticales industriales de fondo
      bctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
      bctx.fillRect(36, 40, 18, h - 76);
      bctx.fillRect(w - 54, 40, 18, h - 76);
      bctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      bctx.lineWidth = 2;
      for (let y = 44; y < h - 90; y += 36) {
        bctx.beginPath();
        bctx.moveTo(36, y);
        bctx.lineTo(54, y + 28);
        bctx.moveTo(w - 54, y);
        bctx.lineTo(w - 36, y + 28);
        bctx.stroke();
      }
    });
  }

  start() {}

  restart() {
    this.lives = 3;
    this._setupLevel(1);
  }

  _setupLevel(level) {
    const w = this.api.width;
    const h = this.api.height;

    this.girders = [];
    this.ladders = [];
    this.barrels = [];
    this.hammers = [];
    this.particles = [];
    this.shockwaves = [];
    this.jumpedBarrels = new Set();

    // 6 pisos de vigas alternando pendiente izquierda/derecha
    const floors = [
      { x1: 24, x2: w - 24, y1: h - 36, y2: h - 52 },
      { x1: 24, x2: w - 64, y1: h - 156, y2: h - 134 },
      { x1: 64, x2: w - 24, y1: h - 244, y2: h - 266 },
      { x1: 24, x2: w - 64, y1: h - 366, y2: h - 344 },
      { x1: 64, x2: w - 24, y1: h - 454, y2: h - 476 },
      { x1: 120, x2: w - 120, y1: 112, y2: 112 } // Plataforma de la cima
    ];
    this.girders = floors;

    // Escaleras conectando cada piso (con ligera variación según el nivel)
    const shift = ((level - 1) % 3) * 26 - 26;
    const ladderSpots = [
      { x: w - 108 + shift, floorIdx: 0 },
      { x: 240 - shift, floorIdx: 0 },
      { x: 110 + shift, floorIdx: 1 },
      { x: 310, floorIdx: 1 },
      { x: w - 115 - shift, floorIdx: 2 },
      { x: 250 + shift, floorIdx: 2 },
      { x: 115 - shift, floorIdx: 3 },
      { x: w - 190, floorIdx: 3 },
      { x: w - 170, floorIdx: 4 }
    ];

    for (const ls of ladderSpots) {
      const botY = this._getGirderY(ls.floorIdx, ls.x);
      const topY = this._getGirderY(ls.floorIdx + 1, ls.x);
      this.ladders.push({ x: ls.x, topY, botY, w: 28 });
    }

    // Martillos de choque temporales en pisos 1 y 3
    this.hammers.push(
      { x: 95, y: this._getGirderY(1, 95) - 24, taken: false },
      { x: w - 125, y: this._getGirderY(3, w - 125) - 24, taken: false }
    );

    this.boss = { x: 158, y: 112 - 54, w: 54, h: 54 };
    this.goal = { x: w / 2 + 40, y: 112 - 36, w: 30, h: 36 };

    this._resetPlayer();
    this.throwTimer = 0.8;
    this._syncHud();
  }

  _resetPlayer() {
    const startX = 64;
    const startY = this._getGirderY(0, startX) - 32;
    this.player = {
      x: startX,
      y: startY,
      w: 22,
      h: 32,
      vx: 0,
      vy: 0,
      grounded: true,
      climbing: false,
      facing: 1,
      hammerTimer: 0,
      invuln: 1.5
    };
    this.barrels = [];
    this.jumpedBarrels.clear();
  }

  _getGirderY(floorIdx, x) {
    const g = this.girders[floorIdx];
    const t = Math.max(0, Math.min(1, (x - g.x1) / (g.x2 - g.x1)));
    return g.y1 + (g.y2 - g.y1) * t;
  }

  _getGirderSlope(floorIdx) {
    const g = this.girders[floorIdx];
    return g.y2 - g.y1; // >0 baja hacia la derecha, <0 baja hacia la izquierda
  }

  _syncHud() {
    const hTag = this.player?.hammerTimer > 0 ? ' · 🔨 MARTILLO' : '';
    this.api.updateStatusText(`♥${this.lives}${hTag}`);
  }

  handleInput(evt) {
    const p = this.player;
    if ((evt.type === 'keydown' || evt.type === 'virtualdown') && (evt.action === 'action' || evt.action === 'up')) {
      // Si pulsa up frente a una escalera, empieza a trepar; si pulsa action (o up lejos de escalera), salta
      const ladder = this._findOverlappingLadder(p);
      if (evt.action === 'up' && ladder && p.hammerTimer <= 0) {
        p.climbing = true;
        p.vy = 0;
        p.x = ladder.x - p.w / 2;
      } else if (p.grounded && !p.climbing && (evt.action === 'action' || !ladder)) {
        p.vy = -420;
        p.grounded = false;
        this.api.audio.play('jump');
      }
    } else if (evt.type === 'pointerdown' && p.grounded && !p.climbing) {
      p.vy = -420;
      p.grounded = false;
      this.api.audio.play('jump');
    }
  }

  _findOverlappingLadder(p) {
    const cx = p.x + p.w / 2;
    const footY = p.y + p.h;
    return this.ladders.find(
      (l) => Math.abs(cx - l.x) < 18 && footY >= l.topY - 8 && footY <= l.botY + 12
    );
  }

  update(dt) {
    const p = this.player;
    const w = this.api.width;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.hammerTimer > 0) {
      p.hammerTimer = Math.max(0, p.hammerTimer - dt);
      if (p.hammerTimer === 0) this._syncHud();
    }

    const ladder = this._findOverlappingLadder(p);
    const upPressed = this.api.input.isPressed('up');
    const downPressed = this.api.input.isPressed('down');

    if (p.climbing) {
      if (!ladder) {
        p.climbing = false;
      } else {
        let climbDir = 0;
        if (upPressed) climbDir -= 1;
        if (downPressed) climbDir += 1;
        p.y += climbDir * 145 * dt;
        const footY = p.y + p.h;
        if (footY <= ladder.topY) {
          p.y = ladder.topY - p.h;
          p.climbing = false;
          p.grounded = true;
        } else if (footY >= ladder.botY) {
          p.y = ladder.botY - p.h;
          p.climbing = false;
          p.grounded = true;
        }
      }
    } else {
      const footY = p.y + p.h;
      if (upPressed && ladder && p.grounded && footY > ladder.topY + 8 && p.hammerTimer <= 0) {
        p.climbing = true;
        p.vy = 0;
        p.x = ladder.x - p.w / 2;
      } else if (downPressed && ladder && p.grounded && footY < ladder.botY - 12 && p.hammerTimer <= 0) {
        p.climbing = true;
        p.x = ladder.x - p.w / 2;
        p.y += 12;
      }

      let mx = 0;
      if (this.api.input.isPressed('left')) {
        mx -= 1;
        p.facing = -1;
      }
      if (this.api.input.isPressed('right')) {
        mx += 1;
        p.facing = 1;
      }
      p.x = Math.max(24, Math.min(w - 24 - p.w, p.x + mx * 195 * dt));

      const prevFootY = p.y + p.h;
      p.vy += 1080 * dt;
      p.y += p.vy * dt;
      p.grounded = false;

      if (p.vy >= 0) {
        const cx = p.x + p.w / 2;
        for (let i = 0; i < this.girders.length; i++) {
          const g = this.girders[i];
          if (cx >= g.x1 && cx <= g.x2) {
            const gy = this._getGirderY(i, cx);
            if (prevFootY <= gy + 12 && p.y + p.h >= gy) {
              p.y = gy - p.h;
              p.vy = 0;
              p.grounded = true;
              break;
            }
          }
        }
      }

      if (p.y > this.api.height + 30) {
        this._hitPlayer('Caída fuera de la estructura');
        return;
      }
    }

    // Recoger martillo
    for (const h of this.hammers) {
      if (!h.taken && Math.hypot(p.x + p.w / 2 - h.x, p.y + p.h / 2 - h.y) < 28) {
        h.taken = true;
        p.hammerTimer = 7.5;
        this.api.addScore(50);
        this.api.audio.play('hammer');
        this._syncHud();
      }
    }

    // Lanzar barriles desde el jefe
    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      const speed = 135 * Math.min(1.9, diff.speedMultiplier);
      this.barrels.push({
        id: Math.random(),
        x: this.boss.x + 56,
        y: 112 - 12,
        r: 11,
        vx: speed,
        vy: 0,
        floorIdx: 5,
        descendingLadder: null,
        checkedLadders: new Set()
      });
      this.throwTimer = Math.max(1.05, 2.35 - (diff.level - 1) * 0.12);
    }

    // Actualizar barriles
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const b = this.barrels[i];
      if (b.descendingLadder) {
        b.y += 140 * dt;
        if (b.y + b.r >= b.descendingLadder.botY) {
          b.y = b.descendingLadder.botY - b.r;
          b.floorIdx = b.targetFloor;
          const slope = this._getGirderSlope(b.floorIdx);
          b.vx = Math.abs(b.vx) * (slope >= 0 ? 1 : -1);
          b.descendingLadder = null;
        }
      } else {
        b.x += b.vx * dt;
        const g = this.girders[b.floorIdx];
        if (g && b.x >= g.x1 - 8 && b.x <= g.x2 + 8) {
          b.y = this._getGirderY(b.floorIdx, b.x) - b.r;
          // Evaluar una única vez por escalera para probabilidad fiel (~32%)
          for (const l of this.ladders) {
            if (b.checkedLadders.has(l)) continue;
            if (Math.abs(l.topY - (b.y + b.r)) < 8 && Math.abs(b.x - l.x) < 7) {
              b.checkedLadders.add(l);
              if (Math.random() < 0.32) {
                b.descendingLadder = l;
                b.targetFloor = this.girders.findIndex(
                  (gg, idx) => idx < b.floorIdx && Math.abs(this._getGirderY(idx, l.x) - l.botY) < 12
                );
                if (b.targetFloor < 0) b.targetFloor = Math.max(0, b.floorIdx - 1);
                b.x = l.x;
                break;
              }
            }
          }
        } else {
          // Cae al piso inferior
          b.vy += 900 * dt;
          b.y += b.vy * dt;
          for (let fi = b.floorIdx - 1; fi >= 0; fi--) {
            const fg = this.girders[fi];
            if (b.x >= fg.x1 && b.x <= fg.x2) {
              const gy = this._getGirderY(fi, b.x);
              if (b.y + b.r >= gy) {
                b.y = gy - b.r;
                b.vy = 0;
                b.floorIdx = fi;
                const slope = this._getGirderSlope(fi);
                b.vx = Math.abs(b.vx) * (slope >= 0 ? 1 : -1);
                break;
              }
            }
          }
        }
      }

      if (b.y > this.api.height + 30 || b.x < -30 || b.x > w + 30) {
        this.barrels.splice(i, 1);
        continue;
      }

      // Bonus por saltar un barril justo encima
      const pcx = p.x + p.w / 2;
      const pFoot = p.y + p.h;
      if (
        !p.grounded &&
        !this.jumpedBarrels.has(b.id) &&
        Math.abs(pcx - b.x) < 16 &&
        b.y - pFoot > 2 &&
        b.y - pFoot < 48
      ) {
        this.jumpedBarrels.add(b.id);
        this.api.addScore(100);
        this.api.audio.play('point');
      }

      // Colisión con jugador
      if (Math.hypot(pcx - b.x, p.y + p.h / 2 - b.y) < b.r + 11) {
        if (p.hammerTimer > 0) {
          spawnShockwave(this.shockwaves, b.x, b.y, { color: '#facc15', maxRadius: 48, life: 0.25 });
          spawnFXParticles(this.particles, b.x, b.y, 12, { colors: ['#d97706', '#fde047', '#ffffff'], speedMax: 160, gravity: 220 });
          this.barrels.splice(i, 1);
          this.api.addScore(150);
          this.api.audio.play('brick');
        } else if (p.invuln <= 0) {
          this._hitPlayer('Golpeado por un barril');
          return;
        }
      }
    }

    updateAndDrawFXParticles(null, this.particles, dt, false);
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);

    // Comprobar llegada a la cima
    if (
      p.x + p.w > this.goal.x &&
      p.x < this.goal.x + this.goal.w &&
      p.y + p.h > this.goal.y &&
      p.y < this.goal.y + this.goal.h
    ) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(300);
      this.api.audio.play('levelUp');
      this._setupLevel(nextLvl);
    }
  }

  _hitPlayer(reason) {
    this.lives--;
    this._syncHud();
    this.api.audio.play('explosion');
    if (this.lives <= 0) {
      this.api.triggerGameOver({ reason });
      return;
    }
    this._resetPlayer();
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#090714';
      ctx.fillRect(0, 0, w, h);
    }

    // Escaleras metálicas remachadas
    for (const l of this.ladders) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(l.x - 10, l.topY);
      ctx.lineTo(l.x - 10, l.botY);
      ctx.moveTo(l.x + 10, l.topY);
      ctx.lineTo(l.x + 10, l.botY);
      ctx.stroke();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let ry = l.topY + 10; ry < l.botY; ry += 13) {
        ctx.moveTo(l.x - 9, ry);
        ctx.lineTo(l.x + 9, ry);
      }
      ctx.stroke();
    }

    // Vigas de acero inclinadas con celosía interior y remaches
    for (const g of this.girders) {
      // Celosía entre borde superior e inferior de la viga
      const dx = g.x2 - g.x1;
      const dy = g.y2 - g.y1;
      const steps = Math.max(4, Math.floor(dx / 24));
      ctx.strokeStyle = '#9d174d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const t1 = (s + 1) / steps;
        const x0 = g.x1 + dx * t0;
        const y0 = g.y1 + dy * t0;
        const x1 = g.x1 + dx * t1;
        const y1 = g.y1 + dy * t1;
        ctx.moveTo(x0, y0 + 2);
        ctx.lineTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 + 11);
        ctx.lineTo(x1, y1 + 2);
      }
      ctx.stroke();

      // Cordón inferior y superior
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(g.x1, g.y1 + 11);
      ctx.lineTo(g.x2, g.y2 + 11);
      ctx.moveTo(g.x1, g.y1 + 1);
      ctx.lineTo(g.x2, g.y2 + 1);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x1, g.y1);
      ctx.lineTo(g.x2, g.y2);
      ctx.stroke();
    }

    // Pila de barriles junto al Cyber-Kong
    const stackX = this.boss.x - 42;
    const stackY = this.boss.y + this.boss.h;
    for (let bi = 0; bi < 2; bi++) {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(stackX + bi * 18, stackY - 24, 15, 24);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(stackX + bi * 18, stackY - 24, 15, 24);
    }

    // Cyber-Kong Coloso en la cima golpeando el pecho
    const kongFrame = this.throwTimer < 0.35 ? 1 : Math.floor(this.animTime * 2.5) % 2;
    drawGlowCircle(ctx, this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 36, 'rgba(139, 92, 246, 0.25)');
    drawSprite(
      ctx,
      this.sprites.kong[kongFrame],
      this.boss.x + this.boss.w / 2,
      this.boss.y + this.boss.h / 2,
      this.boss.w + 8,
      this.boss.h + 8
    );

    // Núcleo energético objetivo brillante en la cima
    const gx = this.goal.x + this.goal.w / 2;
    const gy = this.goal.y + this.goal.h / 2;
    drawGlowCircle(ctx, gx, gy, 28 + Math.sin(this.animTime * 5) * 4, 'rgba(0, 255, 136, 0.42)');
    ctx.fillStyle = '#065f46';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(this.goal.x, this.goal.y, this.goal.w, this.goal.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(this.animTime * 2.4);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();

    // Martillos de choque con aura eléctrica
    for (const hm of this.hammers) {
      if (hm.taken) continue;
      drawGlowCircle(ctx, hm.x, hm.y, 18, 'rgba(250, 204, 21, 0.35)');
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(hm.x - 11, hm.y - 10, 22, 12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#92400e';
      ctx.fillRect(hm.x - 2.5, hm.y + 2, 5, 15);
    }

    // Barriles rodantes con duelas de madera, aros metálicos y rotación
    for (const b of this.barrels) {
      const spin = b.x * 0.14;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(spin);
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Bandas de acero cruzadas para mostrar giro real
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-b.r * 0.7, 0);
      ctx.lineTo(b.r * 0.7, 0);
      ctx.moveTo(0, -b.r * 0.7);
      ctx.lineTo(0, b.r * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Operario héroe animado (corriendo, escalando o blandiendo martillo)
    const p = this.player;
    if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      if (p.climbing) {
        const cf = Math.floor(Math.abs(p.y) * 0.18) % 2;
        drawSprite(ctx, this.sprites.climb[cf], cx, cy, p.w + 10, p.h + 4);
      } else {
        const isMovingHoriz = this.api.input.isPressed('left') || this.api.input.isPressed('right');
        const wf = isMovingHoriz ? Math.floor(this.animTime * 11) % 2 : 0;
        drawSprite(ctx, this.sprites.worker[wf], cx, cy, p.w + 10, p.h + 4, {
          flipX: p.facing < 0
        });
      }
      if (p.hammerTimer > 0) {
        const swing = Math.sin(this.animTime * 22);
        const hx = p.facing > 0 ? p.x + p.w + 4 : p.x - 4;
        const hy = p.y + 8 + swing * 12;
        drawGlowCircle(ctx, hx, hy, 18, 'rgba(254, 240, 138, 0.45)');
        ctx.save();
        ctx.translate(cx, cy - 2);
        ctx.rotate((swing * 0.8 - 0.5) * p.facing);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(p.facing * 6, -3, p.facing * 14, 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(p.facing * 18, -9, p.facing * 12, 16);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.facing * 18, -9, p.facing * 12, 16);
        ctx.restore();
      }
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
    updateAndDrawFXParticles(ctx, this.particles, 0, true);
  }

  destroy() {}
}
