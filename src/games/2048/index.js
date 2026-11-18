/**
 * 11. CYBER MERGE 2048 (Fusión Numérica Infinita — Energy Reactor Grid)
 * Soporta tableros 3x3, 4x4 y 5x5, botón para deshacer 1 jugada y modo infinito más allá de 2048.
 */
import {
  drawBeveledBlock,
  drawGlowCircle
} from '../../engine/PixelSprites.js';

const TILE_COLORS = {
  2: { bg: '#1e293b', fg: '#f8fafc' },
  4: { bg: '#1e3a5f', fg: '#e0f2fe' },
  8: { bg: '#0284c7', fg: '#ffffff' },
  16: { bg: '#00bbf9', fg: '#08101c' },
  32: { bg: '#00f5d4', fg: '#08101c' },
  64: { bg: '#10b981', fg: '#08101c' },
  128: { bg: '#f59e0b', fg: '#08101c' },
  256: { bg: '#ff9e00', fg: '#08101c' },
  512: { bg: '#ff2a85', fg: '#ffffff' },
  1024: { bg: '#9b5de5', fg: '#ffffff' },
  2048: { bg: '#ffbe0b', fg: '#08101c' }
};

export default class Cyber2048Game {
  constructor(api) {
    this.api = api;
    this.size = 4;
    this.grid = [];
    this.previousState = null;
    this.maxTile = 2;
  }

  init() {
    this.restart();
  }

  start() {}

  restart() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.previousState = null;
    this.maxTile = 2;
    this._addRandomTile();
    this._addRandomTile();
    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`Máx: ${this.maxTile} (${this.size}×${this.size})`);
  }

  _addRandomTile() {
    const empty = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.88 ? 2 : 4;
    this.grid[r][c] = val;
    this.maxTile = Math.max(this.maxTile, val);
  }

  handleInput(evt) {
    if (evt.type === 'pointerdown') {
      const px = evt.x * this.api.width;
      const py = evt.y * this.api.height;
      if (py < 54) {
        if (px < 190) {
          this._undoMove();
        } else if (px > this.api.width - 210) {
          this.size = this.size === 4 ? 5 : this.size === 5 ? 3 : 4;
          this.api.audio.play('click');
          this.restart();
        }
      }
      return;
    }

    if (evt.type === 'keydown' || evt.type === 'virtualdown' || evt.type === 'swipe') {
      const a = evt.action;
      if (['up', 'down', 'left', 'right'].includes(a)) {
        this._slide(a);
      } else if (a === 'secondary' || evt.code === 'KeyZ') {
        this._undoMove();
      }
    }
  }

  _undoMove() {
    if (!this.previousState) return;
    this.grid = this.previousState.grid.map((row) => [...row]);
    this.maxTile = this.previousState.maxTile;
    this.api.setScore(this.previousState.score);
    this.previousState = null;
    this._syncHud();
    this.api.audio.play('flip');
  }

  _slide(direction) {
    const snapshot = {
      grid: this.grid.map((row) => [...row]),
      score: this.api.score.score,
      maxTile: this.maxTile
    };
    let moved = false;
    let gainedScore = 0;

    const processLine = (line) => {
      const nonZero = line.filter((v) => v !== 0);
      const merged = [];
      for (let i = 0; i < nonZero.length; i++) {
        if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
          const nextVal = nonZero[i] * 2;
          merged.push(nextVal);
          gainedScore += nextVal;
          this.maxTile = Math.max(this.maxTile, nextVal);
          i++;
        } else {
          merged.push(nonZero[i]);
        }
      }
      while (merged.length < this.size) merged.push(0);
      return merged;
    };

    for (let i = 0; i < this.size; i++) {
      let line = [];
      for (let j = 0; j < this.size; j++) {
        if (direction === 'left') line.push(this.grid[i][j]);
        else if (direction === 'right') line.push(this.grid[i][this.size - 1 - j]);
        else if (direction === 'up') line.push(this.grid[j][i]);
        else if (direction === 'down') line.push(this.grid[this.size - 1 - j][i]);
      }

      const result = processLine(line);

      for (let j = 0; j < this.size; j++) {
        let r = i;
        let c = j;
        if (direction === 'right') c = this.size - 1 - j;
        else if (direction === 'up') {
          r = j;
          c = i;
        } else if (direction === 'down') {
          r = this.size - 1 - j;
          c = i;
        }
        if (this.grid[r][c] !== result[j]) moved = true;
        this.grid[r][c] = result[j];
      }
    }

    if (!moved) return;

    this.previousState = snapshot;
    this._addRandomTile();

    if (gainedScore > 0) {
      this.api.audio.play('merge');
      this.api.addScore(gainedScore, false);
      this.api.advanceProgress(gainedScore);
    } else {
      this.api.audio.play('move');
    }

    this._syncHud();

    if (!this._hasAvailableMoves()) {
      this.api.triggerGameOver({
        reason: 'No quedan fusiones posibles en el tablero',
        extraStats: `Ficha máxima alcanzada: ${this.maxTile}`
      });
    }
  }

  _hasAvailableMoves() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        if (val === 0) return true;
        if (r + 1 < this.size && this.grid[r + 1][c] === val) return true;
        if (c + 1 < this.size && this.grid[r][c + 1] === val) return true;
      }
    }
    return false;
  }

  update(dt = 0) {
    this.animTime = (this.animTime || 0) + dt;
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#090714');
    grad.addColorStop(1, '#120f26');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Botones superiores: Deshacer y Tamaño de tablero
    ctx.fillStyle = this.previousState ? '#231c3d' : '#151226';
    ctx.strokeStyle = this.previousState ? 'rgba(0, 245, 212, 0.45)' : 'rgba(100, 116, 139, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(24, 12, 165, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.previousState ? '#00f5d4' : '#64748b';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↩ Deshacer (Z)', 106, 35);

    ctx.fillStyle = '#231c3d';
    ctx.strokeStyle = 'rgba(255, 190, 11, 0.45)';
    ctx.beginPath();
    ctx.roundRect(w - 204, 12, 180, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffbe0b';
    ctx.fillText(`Tablero: ${this.size}×${this.size}`, w - 114, 35);

    const boardSize = Math.min(w - 48, h - 84);
    const boardX = Math.floor((w - boardSize) / 2);
    const boardY = 62;
    const gap = 10;
    const cellSize = Math.floor((boardSize - gap * (this.size + 1)) / this.size);

    // Chasis del reactor numérico
    drawBeveledBlock(
      ctx,
      boardX,
      boardY,
      boardSize,
      boardSize,
      '#151129',
      'rgba(148, 163, 184, 0.16)',
      'rgba(0, 0, 0, 0.5)',
      { radius: 14, bevel: 4, border: 'rgba(56, 189, 248, 0.28)' }
    );

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        const x = boardX + gap + c * (cellSize + gap);
        const y = boardY + gap + r * (cellSize + gap);

        if (val === 0) {
          ctx.fillStyle = '#1f1938';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 10);
          ctx.fill();
          ctx.stroke();
          continue;
        }

        const style = TILE_COLORS[val] || { bg: '#ff0055', fg: '#ffffff' };
        if (val >= 128) {
          drawGlowCircle(ctx, x + cellSize / 2, y + cellSize / 2, cellSize * 0.65, `${style.bg}44`);
        }

        drawBeveledBlock(
          ctx,
          x,
          y,
          cellSize,
          cellSize,
          style.bg,
          'rgba(255, 255, 255, 0.34)',
          'rgba(0, 0, 0, 0.36)',
          { radius: 10, bevel: Math.max(3, cellSize * 0.08), gloss: true, border: 'rgba(255,255,255,0.16)' }
        );

        // Detalle circuito en esquinas de celda energética
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + 8, y + cellSize - 9, cellSize - 16, 2);

        ctx.fillStyle = style.fg;
        const fontSize = val >= 1024 ? Math.floor(cellSize * 0.3) : Math.floor(cellSize * 0.38);
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), x + cellSize / 2, y + cellSize / 2 + 1);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  destroy() {}
}
