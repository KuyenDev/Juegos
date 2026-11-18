/**
 * 9. QUANTUM MINES (Minesweeper — Buscaminas Táctico, Tactical Sci-Fi Console)
 * Primer clic siempre seguro, progresión infinita de tableros con densidad creciente,
 * selector de dificultad y botón táctil para alternar entre Descubrir y Poner Bandera.
 */
import {
  drawBeveledBlock,
  drawGlowCircle
} from '../../engine/PixelSprites.js';

export default class MinesweeperGame {
  constructor(api) {
    this.api = api;
    this.cols = 9;
    this.rows = 9;
    this.mineCount = 10;
    this.cells = [];
    this.firstClick = true;
    this.flagMode = false;
    this.flagsPlaced = 0;
    this.revealedCount = 0;
    this.preset = 'campaign'; // 'campaign' | 'easy' | 'medium' | 'hard'
    this.animTime = 0;
  }

  init() {
    this.restart();
  }

  start() {}

  restart() {
    this._setupBoardForLevel(this.preset === 'campaign' ? this.api.level.level : 1);
  }

  _setupBoardForLevel(level) {
    if (this.preset === 'easy') {
      this.cols = 8;
      this.rows = 8;
      this.mineCount = 9;
    } else if (this.preset === 'medium') {
      this.cols = 11;
      this.rows = 11;
      this.mineCount = 20;
    } else if (this.preset === 'hard') {
      this.cols = 14;
      this.rows = 14;
      this.mineCount = 36;
    } else {
      // Campaña infinita: crece gradualmente desde 8x8 hasta 15x15
      const size = Math.min(15, 8 + Math.floor((level - 1) / 2));
      this.cols = size;
      this.rows = size;
      const density = Math.min(0.21, 0.12 + (level - 1) * 0.008);
      this.mineCount = Math.max(8, Math.round(size * size * density));
    }

    this.firstClick = true;
    this.flagsPlaced = 0;
    this.revealedCount = 0;
    this.cells = [];

    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          r,
          c,
          mine: false,
          revealed: false,
          flagged: false,
          neighbors: 0
        });
      }
      this.cells.push(row);
    }

    this._syncHud();
  }

  _syncHud() {
    this.api.updateStatusText(`💣 ${Math.max(0, this.mineCount - this.flagsPlaced)}`);
  }

  _placeMinesSafe(safeR, safeC) {
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        candidates.push(this.cells[r][c]);
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const actualMines = Math.min(this.mineCount, candidates.length);
    for (let i = 0; i < actualMines; i++) {
      candidates[i].mine = true;
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].mine) continue;
        let count = 0;
        this._forEachNeighbor(r, c, (nb) => {
          if (nb.mine) count++;
        });
        this.cells[r][c].neighbors = count;
      }
    }
  }

  _forEachNeighbor(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          fn(this.cells[nr][nc]);
        }
      }
    }
  }

  handleInput(evt) {
    if (evt.type !== 'pointerdown') return;

    const px = evt.x * this.api.width;
    const py = evt.y * this.api.height;

    // Barra superior de controles del tablero (Y < 56)
    if (py < 56) {
      if (px < 230) {
        this.flagMode = !this.flagMode;
        this.api.audio.play('click');
      } else if (px > 380) {
        const modes = ['campaign', 'easy', 'medium', 'hard'];
        const idx = (modes.indexOf(this.preset) + 1) % modes.length;
        this.preset = modes[idx];
        this.api.audio.play('click');
        this.restart();
      }
      return;
    }

    const { boardX, boardY, cellSize } = this._getBoardGeometry();
    const col = Math.floor((px - boardX) / cellSize);
    const row = Math.floor((py - boardY) / cellSize);

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;

    const isRightClick = evt.button === 2 || this.flagMode;
    if (isRightClick) {
      this._toggleFlag(row, col);
    } else if (this.cells[row][col].revealed && this.cells[row][col].neighbors > 0) {
      this._chordReveal(row, col);
    } else {
      this._revealCell(row, col);
    }
  }

  _chordReveal(r, c) {
    const center = this.cells[r][c];
    if (!center.revealed || center.neighbors === 0) return;
    let adjFlags = 0;
    this._forEachNeighbor(r, c, (nb) => {
      if (nb.flagged) adjFlags++;
    });
    if (adjFlags !== center.neighbors) return;

    const toOpen = [];
    this._forEachNeighbor(r, c, (nb) => {
      if (!nb.revealed && !nb.flagged) toOpen.push(nb);
    });
    for (const nb of toOpen) {
      this._revealCell(nb.r, nb.c);
    }
  }

  _toggleFlag(r, c) {
    const cell = this.cells[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.flagsPlaced += cell.flagged ? 1 : -1;
    this.api.audio.play('flip');
    this._syncHud();
  }

  _revealCell(r, c) {
    const cell = this.cells[r][c];
    if (cell.flagged || cell.revealed) return;

    if (this.firstClick) {
      this.firstClick = false;
      this._placeMinesSafe(r, c);
    }

    if (cell.mine) {
      // Revelar todas las minas y terminar partida
      for (const row of this.cells) {
        for (const item of row) {
          if (item.mine) item.revealed = true;
        }
      }
      this.api.triggerGameOver({ reason: 'Detonaste una anomalía cuántica' });
      return;
    }

    // Flood fill para celdas sin minas vecinas
    const stack = [cell];
    while (stack.length > 0) {
      const curr = stack.pop();
      if (curr.revealed || curr.flagged) continue;
      curr.revealed = true;
      this.revealedCount++;
      this.api.addScore(5);

      if (curr.neighbors === 0) {
        this._forEachNeighbor(curr.r, curr.c, (nb) => {
          if (!nb.revealed && !nb.mine) stack.push(nb);
        });
      }
    }

    this.api.audio.play('move');

    // Comprobar si se despejó todo el tablero seguro
    const totalSafe = this.rows * this.cols - this.mineCount;
    if (this.revealedCount >= totalSafe) {
      const nextLvl = this.api.level.level + 1;
      this.api.setLevel(nextLvl);
      this.api.addScore(150);
      this.api.audio.play('levelUp');
      this._setupBoardForLevel(nextLvl);
    }
  }

  _getBoardGeometry() {
    const availW = this.api.width - 32;
    const availH = this.api.height - 76;
    const cellSize = Math.floor(Math.min(availW / this.cols, availH / this.rows));
    const boardW = cellSize * this.cols;
    const boardH = cellSize * this.rows;
    const boardX = Math.floor((this.api.width - boardW) / 2);
    const boardY = 62 + Math.floor((availH - boardH) / 2);
    return { boardX, boardY, cellSize, boardW, boardH };
  }

  update(dt = 0) {
    this.animTime += dt;
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#070e1b');
    grad.addColorStop(1, '#0d182d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Barra de herramientas superior táctica
    ctx.fillStyle = this.flagMode ? '#be123c' : '#16243d';
    ctx.strokeStyle = this.flagMode ? '#fb7185' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(16, 12, 210, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.flagMode ? 'MODO BANDERA ACTIVO' : 'MODO DESCUBRIR (Tocar)', 121, 35);

    const presetLabels = {
      campaign: `Campaña Infinita (${this.cols}×${this.rows})`,
      easy: 'Fácil (8×8)',
      medium: 'Medio (11×11)',
      hard: 'Experto (14×14)'
    };
    ctx.fillStyle = '#16243d';
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
    ctx.beginPath();
    ctx.roundRect(w - 246, 12, 230, 36, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#00f5d4';
    ctx.fillText(presetLabels[this.preset], w - 131, 35);

    const { boardX, boardY, cellSize, boardW, boardH } = this._getBoardGeometry();
    // Chasis metálico del tablero
    ctx.fillStyle = '#0a1222';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boardX - 6, boardY - 6, boardW + 12, boardH + 12, 10);
    ctx.fill();
    ctx.stroke();

    const numColors = ['', '#38bdf8', '#34d399', '#facc15', '#fb923c', '#f43f5e', '#a855f7', '#e2e8f0', '#fb7185'];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const x = boardX + c * cellSize;
        const y = boardY + r * cellSize;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        if (cell.revealed) {
          ctx.fillStyle = cell.mine ? '#3b0a20' : '#0f172a';
          ctx.strokeStyle = cell.mine ? '#f43f5e' : 'rgba(51, 65, 85, 0.75)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3, 4);
          ctx.fill();
          ctx.stroke();

          if (cell.mine) {
            // Mina Cuántica con púas y núcleo energético
            const mr = cellSize * 0.24;
            drawGlowCircle(ctx, cx, cy, mr * 1.8, 'rgba(244, 63, 94, 0.45)');
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = Math.max(1.8, cellSize * 0.06);
            ctx.beginPath();
            for (let a = 0; a < 4; a++) {
              const ang = (a * Math.PI) / 4;
              ctx.moveTo(cx - Math.cos(ang) * mr * 1.45, cy - Math.sin(ang) * mr * 1.45);
              ctx.lineTo(cx + Math.cos(ang) * mr * 1.45, cy + Math.sin(ang) * mr * 1.45);
            }
            ctx.stroke();
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(cx, cy, mr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(cx, cy, mr * 0.48, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - mr * 0.25, cy - mr * 0.25, Math.max(1.2, mr * 0.2), 0, Math.PI * 2);
            ctx.fill();
          } else if (cell.neighbors > 0) {
            ctx.fillStyle = numColors[cell.neighbors] || '#fff';
            ctx.font = `bold ${Math.floor(cellSize * 0.54)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.neighbors), cx, cy + 1);
          }
        } else {
          // Casilla blindada 3D biselada
          drawBeveledBlock(
            ctx,
            x + 1.5,
            y + 1.5,
            cellSize - 3,
            cellSize - 3,
            '#1e3a5f',
            'rgba(186, 230, 253, 0.28)',
            'rgba(2, 6, 23, 0.55)',
            { radius: 4, bevel: Math.max(2, cellSize * 0.1) }
          );

          if (cell.flagged) {
            // Banderín táctico vectorial limpio (independiente de fuentes/emojis del SO)
            const s = cellSize * 0.34;
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(cx - s * 0.55, cy + s * 0.55, s * 1.1, Math.max(2, cellSize * 0.08));
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - s * 0.25, cy - s * 0.8, Math.max(2, cellSize * 0.08), s * 1.45);
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.15, cy - s * 0.8);
            ctx.lineTo(cx + s * 0.8, cy - s * 0.35);
            ctx.lineTo(cx - s * 0.15, cy + s * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(cx - s * 0.2, cy - s * 0.85, Math.max(1.5, cellSize * 0.06), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  destroy() {}
}
