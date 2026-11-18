/**
 * 2. CYBER MAZE (Inspirado en laberintos arcade clásicos, 100% original — Neo-Retro Maze)
 * Plantillas de laberintos rotativas, cristales de datos, pulsos PEM temporales,
 * objetos especiales y centinelas con distintos comportamientos.
 *
 * Leyenda del mapa (19x19):
 *   '#' = Muro (1)
 *   '.' = Cristal de datos (2)
 *   'o' = Pulso PEM (3)
 *   '-' = Puerta de la base de centinelas (4: solo salida de centinelas)
 *   'S' = Inicio del jugador
 *   'G' = Base de centinelas
 *   'P' = Punto de aparición de objeto bonus
 */
import {
  createCachedBackdrop,
  drawCachedBackdrop,
  drawGlowCircle,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

const MAZE_TEMPLATES = [
  [
    '###################',
    '#o.......#.......o#',
    '#.##.###.#.###.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.### # ###.####',
    '   #.#       #.#   ',
    '####.# ##-## #.####',
    '    .  #GGG#  .    ',
    '####.# ##### #.####',
    '   #.#   P   #.#   ',
    '####.# ##### #.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#.....S.....#.o#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '###################'
  ],
  [
    '###################',
    '#o..#.........#..o#',
    '#.#.#.#######.#.#.#',
    '#.#.............#.#',
    '#.###.###.###.###.#',
    '#.................#',
    '###.#.## # ##.#.###',
    '    #.#     #.#    ',
    '#####. ##-## .#####',
    '     . #GGG# .     ',
    '#####. ##### .#####',
    '    #.   P   .#    ',
    '###.#.#######.#.###',
    '#........S........#',
    '#.###.##.#.##.###.#',
    '#o..#....#....#..o#',
    '###.#.#######.#.###',
    '#.................#',
    '###################'
  ]
];

const CARDINALS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 }
];

const EPS = 1e-5;

export default class CyberMazeGame {
  constructor(api) {
    this.api = api;
    this.gridSize = 19;
    this.tile = 32;
    this.lives = 3;
    this.grid = [];
    this.dotsRemaining = 0;
    this.empTimer = 0;
    this.empCombo = 0;
    this.bonusItem = null;
    this.player = null;
    this.enemies = [];
    this.shockwaves = [];
    this.animTime = 0;
    this.mazeBackdrop = null;
    this.spawnPoints = {
      player: { x: 9, y: 15 },
      ghosts: [],
      gate: { x: 9, y: 8 },
      bonus: { x: 9, y: 11 }
    };
  }

  init() {
    this.tile = Math.floor(this.api.width / this.gridSize);
    this.lives = 3;
    this._loadMazeForLevel(1);
  }

  start() {}

  restart() {
    this.lives = 3;
    this._loadMazeForLevel(1);
  }

  _loadMazeForLevel(level) {
    const template = MAZE_TEMPLATES[(level - 1) % MAZE_TEMPLATES.length];
    this.grid = [];
    this.dotsRemaining = 0;
    this.empTimer = 0;
    this.bonusItem = null;
    this.spawnPoints.ghosts = [];

    for (let y = 0; y < this.gridSize; y++) {
      const row = [];
      for (let x = 0; x < this.gridSize; x++) {
        const ch = template[y][x] || ' ';
        if (ch === '#') {
          row.push(1); // Muro
        } else if (ch === '.') {
          row.push(2); // Cristal de datos
          this.dotsRemaining++;
        } else if (ch === 'o') {
          row.push(3); // Pulso PEM
          this.dotsRemaining++;
        } else if (ch === '-') {
          row.push(4); // Puerta de la base
          this.spawnPoints.gate = { x, y };
        } else {
          row.push(0);
          if (ch === 'S') this.spawnPoints.player = { x, y };
          if (ch === 'G') this.spawnPoints.ghosts.push({ x, y });
          if (ch === 'P') this.spawnPoints.bonus = { x, y };
        }
      }
      this.grid.push(row);
    }

    this._buildMazeBackdrop();
    this._resetPositions(level);
    this._syncHud();
  }

  _buildMazeBackdrop() {
    const t = this.tile;
    const size = this.gridSize;
    this.mazeBackdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      bctx.fillStyle = '#060414';
      bctx.fillRect(0, 0, w, h);

      // Suelo de circuitos sutil en pasillos
      bctx.strokeStyle = 'rgba(83, 56, 184, 0.14)';
      bctx.lineWidth = 1;
      for (let i = 0; i <= size; i++) {
        bctx.beginPath();
        bctx.moveTo(i * t, 0);
        bctx.lineTo(i * t, size * t);
        bctx.moveTo(0, i * t);
        bctx.lineTo(size * t, i * t);
        bctx.stroke();
      }

      const isWall = (x, y) => x >= 0 && x < size && y >= 0 && y < size && this.grid[y][x] === 1;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (!isWall(x, y)) continue;
          const px = x * t;
          const py = y * t;
          const up = isWall(x, y - 1);
          const down = isWall(x, y + 1);
          const left = isWall(x - 1, y);
          const right = isWall(x + 1, y);

          // Relleno continuo expandido hacia vecinos muro
          const x0 = left ? px : px + 3;
          const x1 = right ? px + t : px + t - 3;
          const y0 = up ? py : py + 3;
          const y1 = down ? py + t : py + t - 3;

          bctx.fillStyle = '#140e38';
          bctx.fillRect(x0, y0, x1 - x0, y1 - y0);

          // Núcleo central más oscuro con bisel técnico
          bctx.fillStyle = '#1f1654';
          bctx.fillRect(px + 6, py + 6, t - 12, t - 12);

          // Trazos neón exteriores SOLO en caras abiertas hacia pasillos
          bctx.strokeStyle = '#7c5dfa';
          bctx.lineWidth = 2.5;
          bctx.beginPath();
          if (!up) {
            bctx.moveTo(x0, y0 + 1);
            bctx.lineTo(x1, y0 + 1);
          }
          if (!down) {
            bctx.moveTo(x0, y1 - 1);
            bctx.lineTo(x1, y1 - 1);
          }
          if (!left) {
            bctx.moveTo(x0 + 1, y0);
            bctx.lineTo(x0 + 1, y1);
          }
          if (!right) {
            bctx.moveTo(x1 - 1, y0);
            bctx.lineTo(x1 - 1, y1);
          }
          bctx.stroke();

          // Nodos de unión luminosos en esquinas externas
          if (!up && !left) {
            bctx.fillStyle = '#38bdf8';
            bctx.fillRect(x0, y0, 4, 4);
          }
          if (!up && !right) {
            bctx.fillStyle = '#38bdf8';
            bctx.fillRect(x1 - 4, y0, 4, 4);
          }
        }
      }
    });
  }

  _resetPositions(level = this.api.level.level) {
    this.player = {
      x: this.spawnPoints.player.x,
      y: this.spawnPoints.player.y,
      dir: { x: 0, y: 0 },
      nextDir: { x: 0, y: 0 },
      nextDirTimer: 0,
      mouthPhase: 0
    };

    const colors = ['#ff2a85', '#00bbf9', '#ff9e00', '#9b5de5', '#00ff88'];
    const enemyCount = Math.min(5, 3 + Math.floor((level - 1) / 2));
    const ghostSpawns = this.spawnPoints.ghosts.length
      ? this.spawnPoints.ghosts
      : [{ x: 9, y: 9 }];

    this.enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      // El primer centinela sale ya frente a la puerta; los demás salen escalonados desde la base
      const sp = i === 0
        ? { x: this.spawnPoints.gate.x, y: this.spawnPoints.gate.y - 1 }
        : ghostSpawns[i % ghostSpawns.length];

      this.enemies.push({
        id: i,
        x: sp.x,
        y: sp.y,
        dir: i === 0 ? { x: -1, y: 0 } : { x: 0, y: -1 },
        color: colors[i % colors.length],
        role: i, // 0: cazador, 1: emboscador, 2+: patrullero
        exitDelay: i === 0 ? 0 : (i - 1) * 1.1
      });
    }
  }

  _syncHud() {
    this.api.updateStatusText(`♥ ${this.lives}`);
  }

  handleInput(evt) {
    if (evt.type === 'keydown' || evt.type === 'virtualdown' || evt.type === 'swipe') {
      const a = evt.action;
      let chosen = null;
      if (a === 'up') chosen = { x: 0, y: -1 };
      else if (a === 'down') chosen = { x: 0, y: 1 };
      else if (a === 'left') chosen = { x: -1, y: 0 };
      else if (a === 'right') chosen = { x: 1, y: 0 };

      if (chosen) {
        this.player.nextDir = chosen;
        this.player.nextDirTimer = 0.55;
      }
    }
  }

  _wrapX(cx) {
    return ((cx % this.gridSize) + this.gridSize) % this.gridSize;
  }

  _wrapFloatX(x) {
    let wx = ((x % this.gridSize) + this.gridSize) % this.gridSize;
    if (Math.abs(wx - this.gridSize) < EPS) wx = 0;
    return wx;
  }

  _getCell(cx, cy) {
    if (cy < 0 || cy >= this.gridSize) return 1;
    return this.grid[cy][this._wrapX(cx)];
  }

  _canPlayerEnter(cx, cy) {
    const cell = this._getCell(cx, cy);
    return cell !== 1 && cell !== 4;
  }

  _canEnemyEnter(cx, cy, allowGate = false) {
    const cell = this._getCell(cx, cy);
    if (cell === 1) return false;
    if (cell === 4 && !allowGate) return false;
    return true;
  }

  _isInGhostHouse(cx, cy) {
    const gx = this.spawnPoints.gate.x;
    const gy = this.spawnPoints.gate.y;
    return cy >= gy && cy <= gy + 1 && Math.abs(cx - gx) <= 1;
  }

  update(dt) {
    this.animTime += dt;
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
    const diff = this.api.getDifficulty();
    const playerSpeed = Math.min(7.8, 5.4 * (1 + (diff.speedMultiplier - 1) * 0.45));
    const enemyBaseSpeed = Math.min(7.2, 4.2 * (1 + (diff.speedMultiplier - 1) * 0.52));

    if (this.empTimer > 0) {
      this.empTimer = Math.max(0, this.empTimer - dt);
    }

    // Mantener intención mientras el jugador siga presionando una tecla o botón táctil
    if (this.api.input.isPressed('up')) {
      this.player.nextDir = { x: 0, y: -1 };
      this.player.nextDirTimer = 0.25;
    } else if (this.api.input.isPressed('down')) {
      this.player.nextDir = { x: 0, y: 1 };
      this.player.nextDirTimer = 0.25;
    } else if (this.api.input.isPressed('left')) {
      this.player.nextDir = { x: -1, y: 0 };
      this.player.nextDirTimer = 0.25;
    } else if (this.api.input.isPressed('right')) {
      this.player.nextDir = { x: 1, y: 0 };
      this.player.nextDirTimer = 0.25;
    } else if (this.player.nextDirTimer > 0) {
      this.player.nextDirTimer = Math.max(0, this.player.nextDirTimer - dt);
      if (this.player.nextDirTimer === 0) {
        this.player.nextDir = { x: 0, y: 0 };
      }
    }

    if (this.bonusItem) {
      this.bonusItem.timer -= dt;
      if (this.bonusItem.timer <= 0) this.bonusItem = null;
    } else if (Math.random() < dt * 0.08) {
      this.bonusItem = {
        x: this.spawnPoints.bonus.x,
        y: this.spawnPoints.bonus.y,
        timer: 8
      };
    }

    this._movePlayer(playerSpeed * dt);

    // Recolección en la celda actual del jugador
    const gx = this._wrapX(Math.round(this.player.x));
    const gy = Math.round(this.player.y);
    if (gy >= 0 && gy < this.gridSize) {
      const cell = this.grid[gy][gx];
      if (cell === 2) {
        this.grid[gy][gx] = 0;
        this.dotsRemaining--;
        this.api.addScore(10);
        this.api.audio.play('flip');
      } else if (cell === 3) {
        this.grid[gy][gx] = 0;
        this.dotsRemaining--;
        this.empTimer = Math.max(3.5, 7.5 - this.api.level.level * 0.3);
        this.empCombo = 0;
        this.api.addScore(40);
        this.api.audio.play('pickup');
      }
    }

    if (
      this.bonusItem &&
      Math.hypot(this.player.x - this.bonusItem.x, this.player.y - this.bonusItem.y) < 0.65
    ) {
      this.api.addScore(100);
      this.api.audio.play('point');
      this.bonusItem = null;
    }

    // Comprobar si se completó el laberinto
    if (this.dotsRemaining <= 0) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(150);
      this.api.audio.play('levelUp');
      this._loadMazeForLevel(nextLvl);
      return;
    }

    // Mover centinelas y comprobar colisión
    for (const enemy of this.enemies) {
      if (enemy.exitDelay > 0) {
        enemy.exitDelay = Math.max(0, enemy.exitDelay - dt);
        continue;
      }

      const spd = this.empTimer > 0 ? enemyBaseSpeed * 0.62 : enemyBaseSpeed;
      this._moveEnemy(enemy, spd * dt);

      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < 0.62) {
        if (this.empTimer > 0) {
          this.empCombo++;
          this.api.addScore(60 * this.empCombo);
          this.api.audio.play('point');
          enemy.x = this.spawnPoints.gate.x;
          enemy.y = this.spawnPoints.gate.y + 1;
          enemy.dir = { x: 0, y: -1 };
          enemy.exitDelay = 1.2;
        } else {
          this.lives--;
          this._syncHud();
          this.api.audio.play('explosion');
          if (this.lives <= 0) {
            this.api.triggerGameOver({ reason: 'Capturado por los centinelas del laberinto' });
            return;
          }
          this._resetPositions();
          return;
        }
      }
    }
  }

  /**
   * Avanza al jugador exactamente de centro de celda a centro de celda,
   * garantizando giros limpios, reversa instantánea e inmunidad a variaciones de FPS.
   */
  _movePlayer(step) {
    const p = this.player;
    p.mouthPhase += step * 3;

    // Reversa inmediata en cualquier punto del pasillo
    if (
      (p.nextDir.x !== 0 || p.nextDir.y !== 0) &&
      p.nextDir.x === -p.dir.x &&
      p.nextDir.y === -p.dir.y
    ) {
      p.dir = { ...p.nextDir };
      p.nextDir = { x: 0, y: 0 };
      p.nextDirTimer = 0;
    }

    let remaining = step;
    let guard = 0;

    while (remaining > EPS && guard++ < 6) {
      const alignedX = Math.abs(p.x - Math.round(p.x)) < EPS;
      const alignedY = Math.abs(p.y - Math.round(p.y)) < EPS;

      if (alignedX && alignedY) {
        const cx = this._wrapX(Math.round(p.x));
        const cy = Math.round(p.y);
        p.x = cx;
        p.y = cy;

        // Intentar aplicar la dirección en cola si la celda destino está libre
        if (
          (p.nextDir.x !== 0 || p.nextDir.y !== 0) &&
          this._canPlayerEnter(cx + p.nextDir.x, cy + p.nextDir.y)
        ) {
          p.dir = { ...p.nextDir };
          p.nextDir = { x: 0, y: 0 };
          p.nextDirTimer = 0;
        }

        // Si está quieto o bloqueado por un muro delante, detenerse en el centro
        if (
          (p.dir.x === 0 && p.dir.y === 0) ||
          !this._canPlayerEnter(cx + p.dir.x, cy + p.dir.y)
        ) {
          p.dir = { x: 0, y: 0 };
          break;
        }
      }

      if (p.dir.x === 0 && p.dir.y === 0) break;

      const distToCenter = this._distanceToNextCenter(p.x, p.y, p.dir);
      const move = Math.min(remaining, distToCenter);

      p.x = this._wrapFloatX(p.x + p.dir.x * move);
      p.y += p.dir.y * move;

      if (Math.abs(p.x - Math.round(p.x)) < EPS) p.x = this._wrapX(Math.round(p.x));
      if (Math.abs(p.y - Math.round(p.y)) < EPS) p.y = Math.round(p.y);

      remaining -= move;
    }
  }

  _moveEnemy(enemy, step) {
    let remaining = step;
    let guard = 0;

    while (remaining > EPS && guard++ < 6) {
      const alignedX = Math.abs(enemy.x - Math.round(enemy.x)) < EPS;
      const alignedY = Math.abs(enemy.y - Math.round(enemy.y)) < EPS;

      if (alignedX && alignedY) {
        const cx = this._wrapX(Math.round(enemy.x));
        const cy = Math.round(enemy.y);
        enemy.x = cx;
        enemy.y = cy;

        this._chooseEnemyDirection(enemy, cx, cy);
      }

      if (enemy.dir.x === 0 && enemy.dir.y === 0) break;

      const distToCenter = this._distanceToNextCenter(enemy.x, enemy.y, enemy.dir);
      const move = Math.min(remaining, distToCenter);

      enemy.x = this._wrapFloatX(enemy.x + enemy.dir.x * move);
      enemy.y += enemy.dir.y * move;

      if (Math.abs(enemy.x - Math.round(enemy.x)) < EPS) enemy.x = this._wrapX(Math.round(enemy.x));
      if (Math.abs(enemy.y - Math.round(enemy.y)) < EPS) enemy.y = Math.round(enemy.y);

      remaining -= move;
    }
  }

  _chooseEnemyDirection(enemy, cx, cy) {
    const inHouse = this._isInGhostHouse(cx, cy);
    const onGate = cx === this.spawnPoints.gate.x && cy === this.spawnPoints.gate.y;
    const allowGate = inHouse || onGate;

    let dirs = CARDINALS.filter((d) => {
      // Evitar revertir salvo callejón sin salida
      if (d.x === -enemy.dir.x && d.y === -enemy.dir.y) return false;
      // Si está sobre la puerta, solo puede salir hacia arriba (no volver a bajar a la casa)
      if (onGate && d.y > 0) return false;
      return this._canEnemyEnter(cx + d.x, cy + d.y, allowGate);
    });

    if (dirs.length === 0) {
      // Permitir dar la vuelta si no había otra salida
      dirs = CARDINALS.filter((d) => this._canEnemyEnter(cx + d.x, cy + d.y, allowGate));
    }

    if (dirs.length === 0) {
      enemy.dir = { x: 0, y: 0 };
      return;
    }

    if (dirs.length === 1) {
      enemy.dir = { ...dirs[0] };
      return;
    }

    if (inHouse || onGate) {
      // Priorizar salida hacia la casilla justo arriba de la puerta
      const exitX = this.spawnPoints.gate.x;
      const exitY = this.spawnPoints.gate.y - 1;
      dirs.sort(
        (a, b) =>
          Math.hypot(cx + a.x - exitX, cy + a.y - exitY) -
          Math.hypot(cx + b.x - exitX, cy + b.y - exitY)
      );
      enemy.dir = { ...dirs[0] };
      return;
    }

    if (this.empTimer > 0) {
      // Huir del jugador
      dirs.sort(
        (a, b) =>
          Math.hypot(cx + b.x - this.player.x, cy + b.y - this.player.y) -
          Math.hypot(cx + a.x - this.player.x, cy + a.y - this.player.y)
      );
      enemy.dir = { ...dirs[0] };
    } else if (enemy.role === 0 && Math.random() < 0.82) {
      // Cazador: persigue posición actual del jugador
      dirs.sort(
        (a, b) =>
          Math.hypot(cx + a.x - this.player.x, cy + a.y - this.player.y) -
          Math.hypot(cx + b.x - this.player.x, cy + b.y - this.player.y)
      );
      enemy.dir = { ...dirs[0] };
    } else if (enemy.role === 1 && Math.random() < 0.72) {
      // Emboscador: apunta 3 casillas por delante del jugador
      const tx = this.player.x + this.player.dir.x * 3;
      const ty = this.player.y + this.player.dir.y * 3;
      dirs.sort(
        (a, b) =>
          Math.hypot(cx + a.x - tx, cy + a.y - ty) -
          Math.hypot(cx + b.x - tx, cy + b.y - ty)
      );
      enemy.dir = { ...dirs[0] };
    } else {
      enemy.dir = { ...dirs[Math.floor(Math.random() * dirs.length)] };
    }
  }

  _distanceToNextCenter(x, y, dir) {
    if (dir.x > 0) {
      const next = Math.floor(x + EPS) + 1;
      return Math.max(EPS, next - x);
    }
    if (dir.x < 0) {
      const prev = Math.ceil(x - EPS) - 1;
      return Math.max(EPS, x - prev);
    }
    if (dir.y > 0) {
      const next = Math.floor(y + EPS) + 1;
      return Math.max(EPS, next - y);
    }
    if (dir.y < 0) {
      const prev = Math.ceil(y - EPS) - 1;
      return Math.max(EPS, y - prev);
    }
    return 0;
  }

  render(ctx) {
    const t = this.tile;
    if (!drawCachedBackdrop(ctx, this.mazeBackdrop, 0, 0, this.api.width, this.api.height)) {
      ctx.fillStyle = '#090619';
      ctx.fillRect(0, 0, this.api.width, this.api.height);
    }

    // Elementos dinámicos del laberinto (puerta, cristales de datos y pulsos PEM)
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const px = x * t;
        const py = y * t;
        const cx = px + t * 0.5;
        const cy = py + t * 0.5;
        if (cell === 4) {
          drawGlowCircle(ctx, cx, cy, t * 0.45, 'rgba(255, 42, 133, 0.3)');
          ctx.fillStyle = '#ff2a85';
          ctx.fillRect(px + 2, cy - 3, t - 4, 6);
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(px + 4, cy - 1, t - 8, 2);
        } else if (cell === 2) {
          // Cristal de datos diamante neón
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.moveTo(cx, cy - 4);
          ctx.lineTo(cx + 4, cy);
          ctx.lineTo(cx, cy + 4);
          ctx.lineTo(cx - 4, cy);
          ctx.closePath();
          ctx.fill();
        } else if (cell === 3) {
          // Pulso PEM energético giratorio
          const pulse = 7 + Math.sin(this.animTime * 8) * 1.8;
          drawGlowCircle(ctx, cx, cy, t * 0.46, 'rgba(255, 42, 133, 0.52)');
          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, pulse + 2, this.animTime * 4, this.animTime * 4 + Math.PI * 1.3);
          ctx.stroke();
          ctx.fillStyle = '#ff2a85';
          ctx.beginPath();
          ctx.arc(cx, cy, pulse * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - 1.5, cy - 1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Objeto bonus central (Esmeralda multifaceta)
    if (this.bonusItem) {
      const bx = (this.bonusItem.x + 0.5) * t;
      const by = (this.bonusItem.y + 0.5) * t + Math.sin(this.animTime * 6) * 2;
      drawGlowCircle(ctx, bx, by, t * 0.55, 'rgba(52, 211, 153, 0.45)');
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - 11);
      ctx.lineTo(bx + 9, by - 2);
      ctx.lineTo(bx + 7, by + 9);
      ctx.lineTo(bx - 7, by + 9);
      ctx.lineTo(bx - 9, by - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.moveTo(bx, by - 7);
      ctx.lineTo(bx + 5, by);
      ctx.lineTo(bx, by + 5);
      ctx.lineTo(bx - 5, by);
      ctx.closePath();
      ctx.fill();
    }

    // Jugador (Ciber-Explorador con casco y boca animada)
    const px = (this.player.x + 0.5) * t;
    const py = (this.player.y + 0.5) * t;
    const isMoving = this.player.dir.x !== 0 || this.player.dir.y !== 0;
    const mouth = isMoving ? (0.14 + 0.25 * Math.abs(Math.sin(this.player.mouthPhase))) : 0.12;
    const aimAngle =
      this.player.dir.x === 1
        ? 0
        : this.player.dir.x === -1
        ? Math.PI
        : this.player.dir.y === 1
        ? Math.PI / 2
        : this.player.dir.y === -1
        ? -Math.PI / 2
        : 0;

    drawGlowCircle(ctx, px, py, t * 0.55, 'rgba(250, 204, 21, 0.32)');
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, t * 0.41, aimAngle + mouth, aimAngle + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ojo direccional con brillo
    const eyeAngle = aimAngle - Math.PI / 4;
    const exPos = px + Math.cos(eyeAngle) * (t * 0.19);
    const eyPos = py + Math.sin(eyeAngle) * (t * 0.19);
    ctx.fillStyle = '#090619';
    ctx.beginPath();
    ctx.arc(exPos, eyPos, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(exPos + 0.8, eyPos - 0.8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Centinelas enemigos con falda ondulante, ojos expresivos y modo PEM
    for (let idx = 0; idx < this.enemies.length; idx++) {
      const enemy = this.enemies[idx];
      const ex = (enemy.x + 0.5) * t;
      const ey = (enemy.y + 0.5) * t;
      const vulnerable = this.empTimer > 0;
      const flashWhite = vulnerable && this.empTimer < 1.5 && Math.floor(this.empTimer * 7) % 2;
      const bodyColor = vulnerable ? (flashWhite ? '#e2e8f0' : '#2563eb') : enemy.color;
      const half = t * 0.39;
      const waveOffset = Math.sin(this.animTime * 12 + idx) * 1.8;

      if (!vulnerable) {
        drawGlowCircle(ctx, ex, ey, t * 0.52, `${enemy.color}33`);
      }

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(ex, ey - half * 0.18, half * 0.96, Math.PI, 0, false);
      ctx.lineTo(ex + half * 0.96, ey + half * 0.72 + waveOffset);
      ctx.lineTo(ex + half * 0.5, ey + half * 0.95 - waveOffset);
      ctx.lineTo(ex + half * 0.16, ey + half * 0.68 + waveOffset);
      ctx.lineTo(ex - half * 0.16, ey + half * 0.95 - waveOffset);
      ctx.lineTo(ex - half * 0.5, ey + half * 0.68 + waveOffset);
      ctx.lineTo(ex - half * 0.96, ey + half * 0.9 - waveOffset);
      ctx.closePath();
      ctx.fill();

      if (!vulnerable && enemy.role === 0) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ex - 2, ey - half * 1.18, 4, 4);
      }

      if (vulnerable) {
        ctx.fillStyle = flashWhite ? '#ef4444' : '#fde68a';
        ctx.fillRect(ex - 5, ey - 5, 3, 4);
        ctx.fillRect(ex + 2, ey - 5, 3, 4);
        ctx.strokeStyle = flashWhite ? '#ef4444' : '#fde68a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex - 7, ey + 4);
        ctx.lineTo(ex - 3, ey + 2);
        ctx.lineTo(ex, ey + 5);
        ctx.lineTo(ex + 3, ey + 2);
        ctx.lineTo(ex + 7, ey + 4);
        ctx.stroke();
      } else {
        const lookX = enemy.dir.x * 2.2;
        const lookY = enemy.dir.y * 2.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex - 4.5, ey - 2, 3.6, 4.4, 0, 0, Math.PI * 2);
        ctx.ellipse(ex + 4.5, ey - 2, 3.6, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex - 4.5 + lookX, ey - 2 + lookY, 1.9, 0, Math.PI * 2);
        ctx.arc(ex + 4.5 + lookX, ey - 2 + lookY, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
  }

  destroy() {}
}
