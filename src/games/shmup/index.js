/**
 * 14. STARLIGHT STRIKERS (Shmup Vertical Clásico — 16-bit Sci-Fi Arcade)
 * Nave espacial desplazándose libremente en 2D vertical, disparando hacia arriba
 * contra escuadrones con patrones variados, cápsulas de mejora, bomba Nova y Jefes de Sector.
 */
import {
  compilePixelSprite,
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  drawSprite,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

const PLAYER_SHIP_GRID = [
  '.......WW.......',
  '.......CC.......',
  '......CWWC......',
  '......CGGC......',
  '.....CCBBCC.....',
  '....CCBBBBCC....',
  '...WCCBBBBCCW...',
  '..WWCBBBBBBCWW..',
  '.WRWCBBBBBBCWRW.',
  '.W.WCBBWWBBCW.W.',
  'W..WCBWWWWBCW..W',
  'W..WCBBBBBBCW..W',
  'W..W.DD..DD.W..W',
  '.....OO..OO.....',
  '.....YY..YY.....',
  '................'
];

const SINE_FIGHTER_GRID = [
  '..R..........R..',
  '..RR........RR..',
  '.RMMR......RMMR.',
  '.RMMRRRRRRRRMMR.',
  '..RRRRWWWWWRRRR.',
  '..RRRWWKKWWRRR..',
  '...RRRRWWWRRRR..',
  '....RRRRRRRRR...',
  '....RM..R..MR...',
  '...RMM..R..MMR..',
  '...RR...R...RR..',
  '........R.......',
  '................',
  '................',
  '................',
  '................'
];

const LINER_WING_GRID = [
  '.OO..........OO.',
  '.OYYO......OYYO.',
  '..OYYOOOOOOYYO..',
  '..OOOOOOOOOOOO..',
  '...OOWWWWWWO....',
  '...OOWKKKKWO....',
  '....OOOOOOOO....',
  '....OYYYYYYO....',
  '.....OOOOOO.....',
  '......OOOO......',
  '......O..O......',
  '.......OO.......',
  '................',
  '................',
  '................',
  '................'
];

const HEAVY_CRUISER_GRID = [
  '....PPPPPPPP....',
  '..PPCCCCCCCCPP..',
  '.PCCCCCCCCCCCCP.',
  'PPPPPPPPPPPPPPPP',
  'PPPWWPPPPPPWWPPP',
  'PPWKKWPPPPWKKWPP',
  'PPPPPPWWWWPPPPPP',
  'PPPPPPWKKWPPPPPP',
  '.PPPPPPPPPPPPPP.',
  '..PPPCCPPPPCCPP.',
  '..PP..PPPP..PP..',
  '......PPPP......',
  '.......PP.......',
  '................',
  '................',
  '................'
];

const BOSS_SHIP_GRID = [
  '........RRRRRRRRRRRRRRRR........',
  '......RRRRMMMMMMMMMMMMRRRR......',
  '....RRMMMMMMMMMMMMMMMMMMMMRR....',
  '..RRMMDDDDMMMMMMMMMMMMDDDDMMRR..',
  '.RMMDDDDCCCCMMMMMMMMCCCCDDDDMMR.',
  'RMDDDDCCWWWWCCMMMMCCWWWWCCDDDDMR',
  'RMDDDDCCCCCCCCWWWWCCCCCCCCDDDDMR',
  'RMMDDDDDDDDCCWYYYYWCCDDDDDDDDMMR',
  'RRRRRMMMMMMCCWYWWYWCCMMMMMMRRRRR',
  '..RRRMMWWWWCCWYYYYWCCWWWWMWRRR..',
  '....RRMWKKWCCCWWWWCCCWKKWMRR....',
  '.....RMWWWWCC......CCWWWWM......',
  '......RM..M..........M..MR......',
  '......YY..Y..........Y..YY......',
  '................................',
  '................................'
];

export default class VerticalShmupGame {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.bombs = 2;
    this.weaponLevel = 1;
    this.player = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.particles = [];
    this.shockwaves = [];
    this.stars = [];
    this.boss = null;
    this.waveTimer = 0;
    this.waveIndex = 0;
    this.shootCooldown = 0;
    this.flashTimer = 0;
    this.animTime = 0;
    this.bankTilt = 0;
    this.sprites = null;
    this.backdrop = null;
  }

  init() {
    this.stars = Array.from({ length: 65 }, (_, i) => ({
      x: Math.random() * this.api.width,
      y: Math.random() * this.api.height,
      speed: i % 3 === 0 ? 155 : i % 3 === 1 ? 85 : 42,
      size: i % 3 === 0 ? 2.2 : 1.3,
      color: i % 5 === 0 ? '#7dd3fc' : i % 7 === 0 ? '#fbcfe8' : '#e2e8f0'
    }));
    this._buildVisualAssets();
    this.restart();
  }

  _buildVisualAssets() {
    this.sprites = {
      player: compilePixelSprite(PLAYER_SHIP_GRID, {
        W: '#f8fafc', C: '#22d3ee', G: '#7dd3fc', B: '#0284c7', R: '#f43f5e', D: '#334155', O: '#fb923c', Y: '#fef08a'
      }, 2.4),
      sine: compilePixelSprite(SINE_FIGHTER_GRID, {
        R: '#f43f5e', M: '#be123c', W: '#fef08a', K: '#0f172a'
      }, 2.2),
      liner: compilePixelSprite(LINER_WING_GRID, {
        O: '#f97316', Y: '#fde047', W: '#e0f2fe', K: '#0f172a'
      }, 2.3),
      heavy: compilePixelSprite(HEAVY_CRUISER_GRID, {
        P: '#7c3aed', C: '#a855f7', W: '#38bdf8', K: '#0f172a'
      }, 3.0),
      boss: compilePixelSprite(BOSS_SHIP_GRID, {
        R: '#be123c', M: '#f43f5e', D: '#312e81', C: '#38bdf8', W: '#f8fafc', Y: '#fde047', K: '#0f172a'
      }, 4.8)
    };

    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#040615');
      grad.addColorStop(0.55, '#0b1026');
      grad.addColorStop(1, '#140c2b');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Nebulosas suaves
      drawGlowCircle(bctx, w * 0.22, h * 0.28, w * 0.45, 'rgba(56, 189, 248, 0.14)');
      drawGlowCircle(bctx, w * 0.78, h * 0.68, w * 0.52, 'rgba(244, 63, 94, 0.14)');

      // Planeta anillado lejano
      const px = w * 0.78;
      const py = h * 0.22;
      drawGlowCircle(bctx, px, py, 68, 'rgba(139, 92, 246, 0.28)');
      bctx.fillStyle = '#312e81';
      bctx.beginPath();
      bctx.arc(px, py, 44, 0, Math.PI * 2);
      bctx.fill();
      bctx.fillStyle = '#4338ca';
      bctx.beginPath();
      bctx.arc(px - 8, py - 8, 34, 0, Math.PI * 2);
      bctx.fill();
      bctx.save();
      bctx.translate(px, py);
      bctx.rotate(-0.32);
      bctx.strokeStyle = 'rgba(165, 180, 252, 0.42)';
      bctx.lineWidth = 5;
      bctx.beginPath();
      bctx.ellipse(0, 0, 74, 15, 0, 0, Math.PI * 2);
      bctx.stroke();
      bctx.restore();
    });
  }

  start() {}

  restart() {
    this.lives = 3;
    this.bombs = 2;
    this.weaponLevel = 1;
    this.player = {
      x: this.api.width / 2,
      y: this.api.height - 76,
      r: 14,
      speed: 350,
      invuln: 2.0,
      shield: false
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerUps = [];
    this.particles = [];
    this.shockwaves = [];
    this.boss = null;
    this.waveIndex = 0;
    this.waveTimer = 0.3;
    this.shootCooldown = 0;
    this.flashTimer = 0;
    this.bankTilt = 0;
    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`♥${this.lives} · 💣${this.bombs} · P${this.weaponLevel}`);
  }

  handleInput(evt) {
    if (evt.type === 'pointerdown' && evt.rawY > 40) {
      if (evt.pointerType === 'mouse') {
        this.player.x = Math.max(22, Math.min(this.api.width - 22, evt.x * this.api.width));
        this.player.y = Math.max(60, Math.min(this.api.height - 26, evt.y * this.api.height));
      }
      this._firePlayer();
    } else if (evt.type === 'pointermove' && evt.isDown) {
      if (evt.pointerType === 'touch' && typeof evt.dxNorm === 'number') {
        this.player.x = Math.max(22, Math.min(this.api.width - 22, this.player.x + evt.dxNorm * this.api.width));
        this.player.y = Math.max(60, Math.min(this.api.height - 26, this.player.y + evt.dyNorm * this.api.height));
      } else {
        this.player.x = Math.max(22, Math.min(this.api.width - 22, evt.x * this.api.width));
        this.player.y = Math.max(60, Math.min(this.api.height - 26, evt.y * this.api.height));
      }
    } else if ((evt.type === 'keydown' || evt.type === 'virtualdown') && evt.action === 'secondary') {
      this._triggerNovaBomb();
    } else if ((evt.type === 'keydown' || evt.type === 'virtualdown') && evt.action === 'action') {
      this._firePlayer();
    }
  }

  _triggerNovaBomb() {
    if (this.bombs <= 0 || this.flashTimer > 0) return;
    this.bombs--;
    this.flashTimer = 0.4;
    this.enemyBullets = [];
    this.api.audio.play('boom');

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].hp -= 8;
      if (this.enemies[i].hp <= 0) {
        this._destroyEnemy(i);
      }
    }
    if (this.boss) {
      this.boss.hp -= 14;
      if (this.boss.hp <= 0) this._defeatBoss();
    }
    this._syncHud();
  }

  _firePlayer() {
    if (this.shootCooldown > 0) return;
    const x = this.player.x;
    const y = this.player.y - 16;

    if (this.weaponLevel === 1) {
      this.bullets.push({ x, y, vx: 0, vy: -640, dmg: 1 });
    } else if (this.weaponLevel === 2) {
      this.bullets.push(
        { x: x - 10, y, vx: 0, vy: -650, dmg: 1 },
        { x: x + 10, y, vx: 0, vy: -650, dmg: 1 }
      );
    } else if (this.weaponLevel === 3) {
      this.bullets.push(
        { x, y, vx: 0, vy: -670, dmg: 1.2 },
        { x: x - 10, y: y + 4, vx: -115, vy: -630, dmg: 1 },
        { x: x + 10, y: y + 4, vx: 115, vy: -630, dmg: 1 }
      );
    } else {
      this.bullets.push(
        { x: x - 7, y, vx: -20, vy: -700, dmg: 1.2 },
        { x: x + 7, y, vx: 20, vy: -700, dmg: 1.2 },
        { x: x - 15, y: y + 6, vx: -140, vy: -640, dmg: 1 },
        { x: x + 15, y: y + 6, vx: 140, vy: -640, dmg: 1 }
      );
    }

    this.shootCooldown = 0.14;
    this.api.audio.play('shoot');
  }

  _spawnWave() {
    const lvl = this.api.level.level;
    this.waveIndex++;

    // Cada 4 oleadas aparece un Jefe de Sector
    if (!this.boss && this.waveIndex % 4 === 0) {
      this.boss = {
        x: this.api.width / 2,
        y: -70,
        targetY: 110,
        w: 154,
        h: 64,
        hp: Math.min(280, 36 + lvl * 12),
        maxHp: Math.min(280, 36 + lvl * 12),
        vx: Math.min(260, 105 + lvl * 8),
        shootTimer: 1.0,
        phase: 0
      };
      return;
    }

    const pattern = this.waveIndex % 3;
    const count = Math.min(8, 4 + Math.floor(lvl / 2));

    if (pattern === 0) {
      // Escuadrón sinusoidal
      const baseX = 70 + Math.random() * (this.api.width - 140);
      for (let i = 0; i < count; i++) {
        this.enemies.push({
          x: baseX,
          baseX,
          y: -30 - i * 48,
          r: 16,
          hp: Math.min(6, 1 + Math.floor(lvl / 3)),
          vy: Math.min(265, 120 + lvl * 8),
          amp: 75,
          freq: 3.2,
          age: i * 0.3,
          kind: 'sine',
          shootTimer: 0.9 + Math.random() * 1.4,
          color: '#ff2a85',
          points: 25
        });
      }
    } else if (pattern === 1) {
      // Formación en V
      const cx = this.api.width / 2;
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * 58;
        this.enemies.push({
          x: cx + offset,
          y: -40 - Math.abs(i - 2) * 34,
          r: 17,
          hp: Math.min(8, 2 + Math.floor(lvl / 2)),
          vy: Math.min(240, 105 + lvl * 7),
          vx: 0,
          kind: 'liner',
          shootTimer: 0.7 + i * 0.25,
          color: '#ff9e00',
          points: 35
        });
      }
    } else {
      // Fragatas pesadas laterales
      for (let i = 0; i < 3; i++) {
        this.enemies.push({
          x: 90 + i * ((this.api.width - 180) / 2),
          y: -45,
          r: 23,
          hp: Math.min(14, 5 + lvl * 2),
          vy: Math.min(180, 68 + lvl * 5),
          kind: 'heavy',
          shootTimer: 1.1,
          color: '#9b5de5',
          points: 60
        });
      }
    }
  }

  update(dt) {
    const w = this.api.width;
    const h = this.api.height;
    const diff = this.api.getDifficulty();

    this.animTime += dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - dt);

    // Campo estelar
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > h) {
        s.y = -4;
        s.x = Math.random() * w;
      }
    }

    // Movimiento por teclado / botones / joystick analógico
    let dx = this.api.input.analog?.x || 0;
    let dy = this.api.input.analog?.y || 0;
    if (this.api.input.isPressed('left')) dx -= 1;
    if (this.api.input.isPressed('right')) dx += 1;
    if (this.api.input.isPressed('up')) dy -= 1;
    if (this.api.input.isPressed('down')) dy += 1;
    this.bankTilt += (Math.max(-1, Math.min(1, dx)) * 0.14 - this.bankTilt) * Math.min(1, dt * 12);
    if (dx !== 0 || dy !== 0) {
      const mag = Math.hypot(dx, dy);
      const scale = mag > 1 ? 1 / mag : 1;
      this.player.x = Math.max(22, Math.min(w - 22, this.player.x + dx * scale * this.player.speed * dt));
      this.player.y = Math.max(60, Math.min(h - 26, this.player.y + dy * scale * this.player.speed * dt));
    }

    // Auto-disparo continuo cómodo o con botón de acción
    if (this.api.input.isPressed('action') || this.api.input.pointer.isDown) {
      this._firePlayer();
    }

    // Oleadas
    if (!this.boss) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this._spawnWave();
        this.waveTimer = Math.max(1.6, 3.1 / Math.sqrt(diff.speedMultiplier));
      }
    }

    // Actualizar Jefe
    if (this.boss) {
      if (this.boss.y < this.boss.targetY) {
        this.boss.y += 95 * dt;
      } else {
        this.boss.x += this.boss.vx * dt;
        if (this.boss.x - this.boss.w / 2 < 20 || this.boss.x + this.boss.w / 2 > w - 20) {
          this.boss.vx *= -1;
        }
        this.boss.shootTimer -= dt;
        if (this.boss.shootTimer <= 0) {
          this.boss.phase = (this.boss.phase + 1) % 3;
          if (this.boss.phase === 0) {
            for (let a = -2; a <= 2; a++) {
              this.enemyBullets.push({
                x: this.boss.x,
                y: this.boss.y + 28,
                vx: a * 68,
                vy: 230,
                r: 5
              });
            }
          } else {
            const ang = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
            for (const off of [-0.18, 0, 0.18]) {
              this.enemyBullets.push({
                x: this.boss.x,
                y: this.boss.y + 28,
                vx: Math.cos(ang + off) * 265,
                vy: Math.sin(ang + off) * 265,
                r: 5
              });
            }
          }
          this.boss.shootTimer = Math.max(0.55, 1.15 - diff.level * 0.05);
        }
      }
    }

    // Proyectiles del jugador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (
        this.boss &&
        Math.abs(b.x - this.boss.x) < this.boss.w / 2 &&
        Math.abs(b.y - this.boss.y) < this.boss.h / 2
      ) {
        this.boss.hp -= b.dmg;
        this.bullets.splice(i, 1);
        this.api.audio.play('hit');
        if (this.boss.hp <= 0) {
          this._defeatBoss();
        }
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
          e.hp -= b.dmg;
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this._destroyEnemy(j);
          } else {
            this.api.audio.play('hit');
          }
          break;
        }
      }
    }

    // Enemigos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.age = (e.age || 0) + dt;
      e.y += e.vy * dt;
      if (e.kind === 'sine') {
        e.x = Math.max(24, Math.min(w - 24, e.baseX + Math.sin(e.age * e.freq) * e.amp));
      }

      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && e.y > 20 && e.y < h - 180) {
        if (e.kind === 'heavy') {
          this.enemyBullets.push(
            { x: e.x, y: e.y + 14, vx: -65, vy: 225, r: 5 },
            { x: e.x, y: e.y + 14, vx: 0, vy: 245, r: 5 },
            { x: e.x, y: e.y + 14, vx: 65, vy: 225, r: 5 }
          );
          e.shootTimer = 1.6;
        } else {
          const ang = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          const spd = Math.min(360, 210 + (diff.level - 1) * 10);
          this.enemyBullets.push({
            x: e.x,
            y: e.y + 10,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 4.5
          });
          e.shootTimer = Math.max(1.1, 2.3 - (diff.level - 1) * 0.06);
        }
      }

      if (this.player.invuln <= 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.r + this.player.r - 3) {
        this._destroyEnemy(i);
        this._hitPlayer('Colisión contra caza interceptor');
        continue;
      }

      if (e.y > h + 40) {
        this.enemies.splice(i, 1);
      }
    }

    // Balas enemigas
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > h + 20 || eb.x < -20 || eb.x > w + 20) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (this.player.invuln <= 0 && Math.hypot(eb.x - this.player.x, eb.y - this.player.y) < this.player.r - 2 + eb.r) {
        this.enemyBullets.splice(i, 1);
        this._hitPlayer('Impacto de plasma enemigo');
        return;
      }
    }

    // Cápsulas de mejora
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += 120 * dt;
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 28) {
        if (p.kind === 'weapon') this.weaponLevel = Math.min(4, this.weaponLevel + 1);
        else if (p.kind === 'bomb') this.bombs = Math.min(5, this.bombs + 1);
        else if (p.kind === 'shield') this.player.shield = true;
        this.api.addScore(50);
        this.api.audio.play('pickup');
        this._syncHud();
        this.powerUps.splice(i, 1);
      } else if (p.y > h + 20) {
        this.powerUps.splice(i, 1);
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
  }

  _destroyEnemy(idx) {
    const e = this.enemies[idx];
    this.enemies.splice(idx, 1);
    this.api.addScore(e.points);
    this.api.advanceProgress(12);
    this.api.audio.play('explosion');
    this._burst(e.x, e.y, e.color, 10);
    spawnShockwave(this.shockwaves, e.x, e.y, { color: e.color, maxRadius: e.r * 2.2, life: 0.28 });
    if (Math.random() < 0.16) {
      const kinds = ['weapon', 'shield', 'bomb'];
      this.powerUps.push({ x: e.x, y: e.y, kind: kinds[Math.floor(Math.random() * kinds.length)] });
    }
  }

  _defeatBoss() {
    this._burst(this.boss.x, this.boss.y, '#ff2a85', 26);
    spawnShockwave(this.shockwaves, this.boss.x, this.boss.y, { color: '#ff2a85', maxRadius: 110, life: 0.5, lineWidth: 5 });
    this.boss = null;
    this.enemyBullets = [];
    this.api.addScore(400);
    const nextLvl = this.api.level.level + 1;
    this.api.setLevel(nextLvl);
    this.api.audio.play('levelUp');
    this.waveTimer = 1.2;
  }

  _hitPlayer(reason) {
    if (this.player.shield) {
      this.player.shield = false;
      this.player.invuln = 1.6;
      this.api.audio.play('bounce');
      return;
    }
    this.lives--;
    this.weaponLevel = Math.max(1, this.weaponLevel - 1);
    this.player.invuln = 2.2;
    this._syncHud();
    this.api.audio.play('explosion');
    if (this.lives <= 0) {
      this.api.triggerGameOver({ reason });
    }
  }

  _burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const s = 60 + Math.random() * 110;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: 0.35 });
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#050816';
      ctx.fillRect(0, 0, w, h);
    }

    // Estrellas parallax con brillo
    for (const s of this.stars) {
      ctx.fillStyle = s.color || 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(s.x, s.y, s.size, s.size * 2.4);
    }

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(0, 245, 212, ${this.flashTimer * 0.55})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Jefe Acorazado de Sector
    if (this.boss) {
      drawGlowCircle(ctx, this.boss.x, this.boss.y, this.boss.w * 0.65, 'rgba(244, 63, 94, 0.25)');
      drawSprite(ctx, this.sprites.boss, this.boss.x, this.boss.y, this.boss.w, this.boss.h + 10);
      // Núcleo reactor palpitante
      const corePulse = 7 + Math.sin(this.animTime * 10) * 2.5;
      drawGlowCircle(ctx, this.boss.x, this.boss.y + 4, corePulse * 2.4, 'rgba(254, 240, 138, 0.7)');
      // Barra de vida segmentada
      const barW = 152;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(this.boss.x - barW / 2 - 2, this.boss.y - this.boss.h / 2 - 18, barW + 4, 11);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(this.boss.x - barW / 2, this.boss.y - this.boss.h / 2 - 16, barW * (this.boss.hp / this.boss.maxHp), 7);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.boss.x - barW / 2 - 2, this.boss.y - this.boss.h / 2 - 18, barW + 4, 11);
    }

    // Escuadrones enemigos pixel art
    for (const e of this.enemies) {
      const sp = e.kind === 'heavy' ? this.sprites.heavy : e.kind === 'liner' ? this.sprites.liner : this.sprites.sine;
      const drawS = e.kind === 'heavy' ? 48 : 36;
      const tilt = e.kind === 'sine' ? Math.cos((e.age || 0) * (e.freq || 3)) * 0.16 : 0;
      drawGlowCircle(ctx, e.x, e.y - 4, e.r * 1.15, `${e.color}33`);
      drawSprite(ctx, sp, e.x, e.y, drawS, drawS, { rotation: tilt });
    }

    // Cápsulas de energía giratorias
    for (const p of this.powerUps) {
      const color = p.kind === 'weapon' ? '#facc15' : p.kind === 'shield' ? '#38bdf8' : '#34d399';
      drawGlowCircle(ctx, p.x, p.y, 20, `${color}55`);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(this.animTime * 2.5);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.kind === 'weapon' ? 'W' : p.kind === 'shield' ? 'S' : 'B', p.x, p.y + 1);
    }
    ctx.textBaseline = 'alphabetic';

    // Proyectiles láser del jugador con núcleo blanco
    for (const b of this.bullets) {
      drawGlowCircle(ctx, b.x, b.y, 9, 'rgba(34, 211, 238, 0.35)');
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(b.x - 3, b.y - 10, 6, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 1.2, b.y - 8, 2.4, 14);
    }

    // Orbes de plasma enemigos
    for (const eb of this.enemyBullets) {
      drawGlowCircle(ctx, eb.x, eb.y, eb.r * 2.3, 'rgba(251, 191, 36, 0.5)');
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r + 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);

    // Partículas de explosión
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / 0.35);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 2.5, pt.y - 2.5, 5, 5);
      ctx.restore();
    }

    // Caza estelar del jugador
    if (this.player.invuln <= 0 || Math.floor(this.player.invuln * 12) % 2 === 0) {
      const px = this.player.x;
      const py = this.player.y;
      if (this.player.shield) {
        drawGlowCircle(ctx, px, py, 30, 'rgba(56, 189, 248, 0.25)');
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Postquemadores animados
      const flameLen = 10 + Math.sin(this.animTime * 42) * 4;
      drawGlowCircle(ctx, px - 6, py + 17, flameLen * 0.9, 'rgba(251, 146, 60, 0.7)');
      drawGlowCircle(ctx, px + 6, py + 17, flameLen * 0.9, 'rgba(251, 146, 60, 0.7)');
      drawSprite(ctx, this.sprites.player, px, py, 40, 40, { rotation: this.bankTilt });
    }
  }

  destroy() {}
}
