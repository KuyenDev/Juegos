/**
 * 8. TETRO FLUX (Bloques Geométricos Apilables — Glossy Crystal Arcade Cabinet)
 * Tablero 10x20 con generador justo (7-bag), pieza fantasma, vista previa de siguiente pieza,
 * cámara de reserva (Hold), rotación con wall-kick y niveles infinitos.
 */
import {
  createCachedBackdrop,
  drawBeveledBlock,
  drawCachedBackdrop,
  spawnFXParticles,
  updateAndDrawFXParticles
} from '../../engine/PixelSprites.js';

const SHAPES = [
  { id: 'I', color: '#00f5d4', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  { id: 'O', color: '#ffbe0b', matrix: [[1,1],[1,1]] },
  { id: 'T', color: '#9b5de5', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  { id: 'S', color: '#00ff88', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  { id: 'Z', color: '#ff2a85', matrix: [[1,1,0],[0,1,1],[0,0,0]] },
  { id: 'J', color: '#00bbf9', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  { id: 'L', color: '#ff9e00', matrix: [[0,0,1],[1,1,1],[0,0,0]] }
];

export default class TetroFluxGame {
  constructor(api) {
    this.api = api;
    this.cols = 10;
    this.rows = 20;
    this.cell = 28;
    this.board = [];
    this.bag = [];
    this.current = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.dropTimer = 0;
    this.linesClearedTotal = 0;
    this.particles = [];
    this.backdrop = null;
  }

  init() {
    this.backdrop = createCachedBackdrop(this.api.width, this.api.height, (bctx, w, h) => {
      const grad = bctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#050814');
      grad.addColorStop(1, '#0d102b');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, w, h);

      // Rejilla decorativa exterior de gabinete
      bctx.strokeStyle = 'rgba(0, 245, 212, 0.04)';
      bctx.lineWidth = 1;
      for (let gx = 0; gx <= w; gx += 32) {
        bctx.beginPath();
        bctx.moveTo(gx, 0);
        bctx.lineTo(gx, h);
        bctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += 32) {
        bctx.beginPath();
        bctx.moveTo(0, gy);
        bctx.lineTo(w, gy);
        bctx.stroke();
      }
    });
    this.restart();
  }

  start() {}

  restart() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.bag = [];
    this.holdPiece = null;
    this.canHold = true;
    this.dropTimer = 0;
    this.lockDelay = 0;
    this.dasDir = 0;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.linesClearedTotal = 0;
    this.particles = [];
    this.nextPiece = this._drawFromBag();
    this._spawnNext();
    this.api.updateStatusText('Líneas: 0');
  }

  _drawFromBag() {
    if (this.bag.length === 0) {
      this.bag = SHAPES.map((s) => ({
        id: s.id,
        color: s.color,
        matrix: s.matrix.map((row) => [...row])
      }));
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  _spawnNext() {
    const piece = this.nextPiece || this._drawFromBag();
    this.nextPiece = this._drawFromBag();
    this.current = {
      ...piece,
      matrix: piece.matrix.map((r) => [...r]),
      x: Math.floor((this.cols - piece.matrix[0].length) / 2),
      y: 0
    };
    this.canHold = true;

    if (this._collides(this.current.matrix, this.current.x, this.current.y)) {
      this.api.triggerGameOver({
        reason: 'La torre geométrica alcanzó el límite superior',
        extraStats: `Líneas completadas: ${this.linesClearedTotal}`
      });
    }
  }

  _collides(matrix, offsetX, offsetY) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = offsetX + c;
        const ny = offsetY + r;
        if (nx < 0 || nx >= this.cols || ny >= this.rows) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  _rotateMatrix(mat) {
    const N = mat.length;
    const res = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        res[c][N - 1 - r] = mat[r][c];
      }
    }
    return res;
  }

  handleInput(evt) {
    if (!this.current) return;
    if (evt.type === 'keydown' || evt.type === 'virtualdown' || evt.type === 'swipe') {
      const a = evt.action;
      if (evt.repeat && ['action', 'up', 'secondary'].includes(a)) return;

      if (a === 'left') {
        if (!this._collides(this.current.matrix, this.current.x - 1, this.current.y)) {
          this.current.x--;
          this.api.audio.play('move');
        }
        this.dasDir = -1;
        this.dasTimer = 0;
        this.arrTimer = 0;
      } else if (a === 'right') {
        if (!this._collides(this.current.matrix, this.current.x + 1, this.current.y)) {
          this.current.x++;
          this.api.audio.play('move');
        }
        this.dasDir = 1;
        this.dasTimer = 0;
        this.arrTimer = 0;
      } else if (a === 'down') {
        if (!this._collides(this.current.matrix, this.current.x, this.current.y + 1)) {
          this.current.y++;
          this.dropTimer = 0;
          this.api.addScore(1, false);
        }
      } else if (a === 'up') {
        const rotated = this._rotateMatrix(this.current.matrix);
        // Wall-kick offsets
        for (const kick of [0, -1, 1, -2, 2]) {
          if (!this._collides(rotated, this.current.x + kick, this.current.y)) {
            this.current.matrix = rotated;
            this.current.x += kick;
            this.api.audio.play('flip');
            break;
          }
        }
      } else if (a === 'action') {
        // Caída instantánea (Hard Drop)
        let dropped = 0;
        while (!this._collides(this.current.matrix, this.current.x, this.current.y + 1)) {
          this.current.y++;
          dropped++;
        }
        this.api.addScore(dropped * 2, false);
        this.api.audio.play('hit');
        this._lockPiece();
      } else if (a === 'secondary' || evt.code === 'KeyC') {
        this._holdCurrentPiece();
      }
    }
  }

  _holdCurrentPiece() {
    if (!this.canHold || !this.current) return;
    const baseTemplate = SHAPES.find((s) => s.id === this.current.id);
    if (!this.holdPiece) {
      this.api.audio.play('click');
      this.holdPiece = baseTemplate;
      this._spawnNext();
      this.canHold = false;
    } else {
      const prevHold = this.holdPiece;
      const nextMat = prevHold.matrix.map((r) => [...r]);
      const nextX = Math.floor((this.cols - nextMat[0].length) / 2);
      if (this._collides(nextMat, nextX, 0)) {
        return; // Evitar superposición si la parte superior está bloqueada
      }
      this.api.audio.play('click');
      this.holdPiece = baseTemplate;
      this.current = {
        ...prevHold,
        matrix: nextMat,
        x: nextX,
        y: 0
      };
      this.canHold = false;
    }
  }

  update(dt) {
    updateAndDrawFXParticles(null, this.particles, dt, false);
    if (!this.current) return;
    const diff = this.api.getDifficulty();

    // Auto-desplazamiento lateral suave (DAS / ARR) al mantener pulsado Izq o Der
    const leftHeld = this.api.input.isPressed('left');
    const rightHeld = this.api.input.isPressed('right');
    const heldDir = leftHeld && !rightHeld ? -1 : rightHeld && !leftHeld ? 1 : 0;
    if (heldDir !== 0 && heldDir === this.dasDir) {
      this.dasTimer += dt;
      if (this.dasTimer >= 0.16) {
        this.arrTimer += dt;
        if (this.arrTimer >= 0.045) {
          this.arrTimer = 0;
          if (!this._collides(this.current.matrix, this.current.x + heldDir, this.current.y)) {
            this.current.x += heldDir;
            this.api.audio.play('move');
          }
        }
      }
    } else {
      this.dasDir = heldDir;
      this.dasTimer = 0;
      this.arrTimer = 0;
    }

    const softDrop = this.api.input.isPressed('down');
    const baseInterval = Math.max(0.11, 0.78 / diff.speedMultiplier);
    const dropInterval = softDrop ? Math.min(baseInterval, 0.048) : baseInterval;

    const onGround = this._collides(this.current.matrix, this.current.x, this.current.y + 1);
    if (onGround) {
      this.lockDelay = (this.lockDelay || 0) + dt;
      if (this.lockDelay >= 0.28) {
        this.lockDelay = 0;
        this.dropTimer = 0;
        this._lockPiece();
      }
      return;
    }

    this.lockDelay = 0;
    this.dropTimer += dt;
    if (this.dropTimer >= dropInterval) {
      this.dropTimer = 0;
      this.current.y++;
      if (softDrop) {
        this.api.addScore(1, false);
      }
    }
  }

  _lockPiece() {
    const { matrix, x, y, color } = this.current;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] && y + r >= 0 && y + r < this.rows) {
          this.board[y + r][x + c] = color;
        }
      }
    }

    // Comprobar líneas completas
    let cleared = 0;
    const cs = this.cell;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell !== null)) {
        spawnFXParticles(this.particles, 32 + (this.cols * cs) / 2, 48 + r * cs + cs / 2, 18, {
          colors: ['#00f5d4', '#ffbe0b', '#ff2a85', '#ffffff'],
          spread: 2.8,
          speedMin: 80,
          speedMax: 240,
          lifeMax: 0.45
        });
        this.board.splice(r, 1);
        this.board.unshift(Array(this.cols).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      const lineScores = [0, 40, 100, 300, 800];
      this.linesClearedTotal += cleared;
      this.api.addScore(lineScores[cleared] || 800);
      this.api.advanceProgress(cleared * 2.5);
      this.api.audio.play('point');
      this.api.updateStatusText(`Líneas: ${this.linesClearedTotal}`);
    }

    this._spawnNext();
  }

  _getGhostY() {
    let gy = this.current.y;
    while (!this._collides(this.current.matrix, this.current.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const cs = this.cell;
    const boardX = 32;
    const boardY = 48;
    const boardW = this.cols * cs;
    const boardH = this.rows * cs;

    if (!drawCachedBackdrop(ctx, this.backdrop, 0, 0, w, h)) {
      ctx.fillStyle = '#080b18';
      ctx.fillRect(0, 0, w, h);
    }

    // Marco metálico del tablero
    ctx.fillStyle = '#090e21';
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(boardX - 3, boardY - 3, boardW + 6, boardH + 6);
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX - 7, boardY - 7, boardW + 14, boardH + 14);

    // Rejilla
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let c = 1; c < this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(boardX + c * cs, boardY);
      ctx.lineTo(boardX + c * cs, boardY + boardH);
      ctx.stroke();
    }
    for (let r = 1; r < this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(boardX, boardY + r * cs);
      ctx.lineTo(boardX + boardW, boardY + r * cs);
      ctx.stroke();
    }

    // Bloques fijados
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const color = this.board[r][c];
        if (color) {
          this._drawCell(ctx, boardX + c * cs, boardY + r * cs, cs, color, 1);
        }
      }
    }

    if (this.current) {
      // Pieza fantasma como marco holo-wireframe
      const ghostY = this._getGhostY();
      const { matrix, x, color } = this.current;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const gx = boardX + (x + c) * cs;
            const gy = boardY + (ghostY + r) * cs;
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.roundRect(gx + 2, gy + 2, cs - 4, cs - 4, 3);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Pieza activa
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            this._drawCell(ctx, boardX + (x + c) * cs, boardY + (this.current.y + r) * cs, cs, color, 1);
          }
        }
      }
    }

    updateAndDrawFXParticles(ctx, this.particles, 0, true);

    // Paneles laterales: Siguiente y Reserva (Hold)
    const sideX = boardX + boardW + 26;
    this._drawMiniBox(ctx, sideX, boardY, 'SIGUIENTE', this.nextPiece);
    this._drawMiniBox(ctx, sideX, boardY + 150, 'RESERVA (C)', this.holdPiece);

    ctx.fillStyle = '#9aa5ce';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LÍNEAS: ${this.linesClearedTotal}`, sideX, boardY + 330);
    ctx.fillText(`NIVEL: ${this.api.level.level}`, sideX, boardY + 356);
  }

  _drawCell(ctx, px, py, size, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawBeveledBlock(
      ctx,
      px + 1,
      py + 1,
      size - 2,
      size - 2,
      color,
      'rgba(255,255,255,0.45)',
      'rgba(0,0,0,0.42)',
      { radius: 4, bevel: Math.max(2, size * 0.14), gloss: true, border: 'rgba(15, 23, 42, 0.5)' }
    );
    ctx.restore();
  }

  _drawMiniBox(ctx, x, y, label, piece) {
    ctx.fillStyle = '#131936';
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 148, 124, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f5d4';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 74, y + 22);

    if (!piece) return;
    const m = piece.matrix;
    const mini = 20;
    const startX = x + 74 - (m[0].length * mini) / 2;
    const startY = y + 68 - (m.length * mini) / 2;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (m[r][c]) {
          this._drawCell(ctx, startX + c * mini, startY + r * mini, mini, piece.color, 1);
        }
      }
    }
  }

  destroy() {}
}
