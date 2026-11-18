/**
 * 10. NEURAL MATCH (Memory — Memoria Visual, Arcane Tech Card Table)
 * Tableros crecientes por nivel, contador de movimientos, combos por parejas consecutivas,
 * modo contrarreloj opcional y temáticas visuales originales.
 */
import {
  drawBeveledBlock,
  drawGlowCircle,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

const THEMES_SYMBOLS = [
  ['⚡', '🚀', '👾', '💎', '🔥', '🛡️', '👑', '🪐', '🔮', '🧬', '🎯', '☄️', '🛰️', '🤖', '🐉', '🌟', '🔑', '🌀'],
  ['▲', '◆', '●', '■', '★', '✦', '❖', '⬢', '⬟', '✚', '✖', '☯', '☸', '✵', '✴', '✸', '⬡', '◈']
];

const EMBLEM_COLORS = [
  '#facc15', '#38bdf8', '#f43f5e', '#22d3ee', '#fb923c', '#34d399',
  '#fde047', '#a855f7', '#c084fc', '#2dd4bf', '#ef4444', '#fbbf24',
  '#60a5fa', '#94a3b8', '#4ade80', '#fef08a', '#f59e0b', '#818cf8'
];

export default class MemoryGame {
  constructor(api) {
    this.api = api;
    this.cols = 4;
    this.rows = 3;
    this.cards = [];
    this.flipped = [];
    this.shockwaves = [];
    this.lockTimer = 0;
    this.moves = 0;
    this.matchesLeft = 0;
    this.combo = 0;
    this.timedMode = true;
    this.timeLeft = 60;
    this.cursor = 0;
    this.animTime = 0;
  }

  init() {
    this.restart();
  }

  start() {}

  restart() {
    this._setupLevel(1);
  }

  _setupLevel(level) {
    // Dimensiones progresivas con número par de cartas
    const layouts = [
      [4, 3], // 12 cartas
      [4, 4], // 16 cartas
      [5, 4], // 20 cartas
      [6, 4], // 24 cartas
      [6, 5], // 30 cartas
      [6, 6]  // 36 cartas
    ];
    const [c, r] = layouts[Math.min(layouts.length - 1, level - 1)];
    this.cols = c;
    this.rows = r;
    const totalCards = c * r;
    const pairCount = totalCards / 2;
    this.matchesLeft = pairCount;
    this.moves = 0;
    this.combo = 0;
    this.flipped = [];
    this.lockTimer = 0;
    this.cursor = 0;
    this.timeLeft = Math.max(42, pairCount * 6 - (level - 1) * 2);
    this._lastDisplayedSec = Math.ceil(this.timeLeft);

    const symbolsPool = THEMES_SYMBOLS[(level - 1) % THEMES_SYMBOLS.length];
    const deck = [];
    for (let i = 0; i < pairCount; i++) {
      const symIdx = i % symbolsPool.length;
      const entry = { sym: symbolsPool[symIdx], pairId: symIdx };
      deck.push(entry, { ...entry });
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.shockwaves = [];
    this.cards = deck.map((item, index) => ({
      index,
      symbol: item.sym,
      pairId: item.pairId,
      state: 'hidden' // 'hidden' | 'flipped' | 'matched'
    }));

    this._syncHud();
  }

  _syncHud() {
    if (this.timedMode) {
      this.api.updateStatusText(`⏱ ${Math.ceil(this.timeLeft)}s · Mov:${this.moves}`);
    } else {
      this.api.updateStatusText(`Movimientos: ${this.moves}`);
    }
  }

  handleInput(evt) {
    if (evt.type === 'pointerdown') {
      const px = evt.x * this.api.width;
      const py = evt.y * this.api.height;

      // Botón superior para activar/desactivar contrarreloj
      if (py < 52 && px > this.api.width - 240) {
        this.timedMode = !this.timedMode;
        this.api.audio.play('click');
        this._syncHud();
        return;
      }

      const { boardX, boardY, cardW, cardH, gap } = this._getLayout();
      for (let i = 0; i < this.cards.length; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const cx = boardX + col * (cardW + gap);
        const cy = boardY + row * (cardH + gap);
        if (px >= cx && px <= cx + cardW && py >= cy && py <= cy + cardH) {
          this.cursor = i;
          this._selectCard(i);
          break;
        }
      }
    } else if (evt.type === 'keydown' || evt.type === 'virtualdown') {
      const a = evt.action;
      if (a === 'left') this.cursor = (this.cursor - 1 + this.cards.length) % this.cards.length;
      else if (a === 'right') this.cursor = (this.cursor + 1) % this.cards.length;
      else if (a === 'up') this.cursor = (this.cursor - this.cols + this.cards.length) % this.cards.length;
      else if (a === 'down') this.cursor = (this.cursor + this.cols) % this.cards.length;
      else if (a === 'action') this._selectCard(this.cursor);
    }
  }

  _selectCard(index) {
    if (this.lockTimer > 0) return;
    const card = this.cards[index];
    if (!card || card.state !== 'hidden') return;

    card.state = 'flipped';
    this.flipped.push(card);
    this.api.audio.play('flip');

    if (this.flipped.length === 2) {
      this.moves++;
      const [first, second] = this.flipped;
      if (first.symbol === second.symbol) {
        first.state = 'matched';
        second.state = 'matched';
        this.flipped = [];
        this.matchesLeft--;
        this.combo++;
        const layout = this._getLayout();
        [first, second].forEach((cObj) => {
          const cx = layout.boardX + (cObj.index % this.cols) * (layout.cardW + layout.gap) + layout.cardW / 2;
          const cy = layout.boardY + Math.floor(cObj.index / this.cols) * (layout.cardH + layout.gap) + layout.cardH / 2;
          spawnShockwave(this.shockwaves, cx, cy, { color: '#00f5d4', maxRadius: layout.cardW * 0.65, life: 0.35 });
        });
        this.api.addScore(25 + this.combo * 10);
        this.api.audio.play('point');

        if (this.matchesLeft <= 0) {
          const nextLvl = this.api.level.level + 1;
          const timeBonus = this.timedMode ? Math.ceil(this.timeLeft) * 3 : 0;
          this.api.setLevel(nextLvl);
          this.api.addScore(100 + timeBonus);
          this.api.audio.play('levelUp');
          this._setupLevel(nextLvl);
        }
      } else {
        this.combo = 0;
        this.lockTimer = 0.65;
      }
      this._syncHud();
    }
  }

  update(dt) {
    this.animTime += dt;
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
    if (this.lockTimer > 0) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        for (const c of this.flipped) {
          if (c.state === 'flipped') c.state = 'hidden';
        }
        this.flipped = [];
      }
    }

    if (this.timedMode) {
      this.timeLeft -= dt;
      const curSec = Math.max(0, Math.ceil(this.timeLeft));
      if (curSec !== this._lastDisplayedSec) {
        this._lastDisplayedSec = curSec;
        this._syncHud();
      }
      if (this.timeLeft <= 0) {
        this.api.triggerGameOver({
          reason: 'Se agotó el tiempo de sincronización',
          extraStats: `Movimientos realizados: ${this.moves}`
        });
      }
    }
  }

  _getLayout() {
    const gap = 10;
    const availW = this.api.width - 40;
    const availH = this.api.height - 80;
    const cardW = Math.floor((availW - gap * (this.cols - 1)) / this.cols);
    const cardH = Math.floor((availH - gap * (this.rows - 1)) / this.rows);
    const size = Math.min(cardW, cardH, 110);
    const finalW = size;
    const finalH = size;
    const boardW = this.cols * finalW + (this.cols - 1) * gap;
    const boardH = this.rows * finalH + (this.rows - 1) * gap;
    const boardX = Math.floor((this.api.width - boardW) / 2);
    const boardY = 58 + Math.floor((availH - boardH) / 2);
    return { boardX, boardY, cardW: finalW, cardH: finalH, gap };
  }

  _drawCardEmblem(ctx, card, cx, cy, size) {
    const id = card.pairId ?? 0;
    const col = EMBLEM_COLORS[id % EMBLEM_COLORS.length];
    const r = size * 0.28;
    drawGlowCircle(ctx, cx, cy, r * 1.45, `${col}33`);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2.2;

    switch (id % 9) {
      case 0: // Rayo / Bolt
        ctx.beginPath();
        ctx.moveTo(r * 0.25, -r);
        ctx.lineTo(-r * 0.55, r * 0.08);
        ctx.lineTo(r * 0.05, r * 0.08);
        ctx.lineTo(-r * 0.25, r);
        ctx.lineTo(r * 0.55, -r * 0.08);
        ctx.lineTo(-r * 0.05, -r * 0.08);
        ctx.closePath();
        ctx.fill();
        break;
      case 1: // Cohete estelar
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.45, r * 0.35);
        ctx.lineTo(r * 0.75, r * 0.8);
        ctx.lineTo(0, r * 0.52);
        ctx.lineTo(-r * 0.75, r * 0.8);
        ctx.lineTo(-r * 0.45, r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -r * 0.15, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 2: // Corona real
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, r * 0.6);
        ctx.lineTo(-r * 0.95, -r * 0.45);
        ctx.lineTo(-r * 0.38, r * 0.05);
        ctx.lineTo(0, -r * 0.72);
        ctx.lineTo(r * 0.38, r * 0.05);
        ctx.lineTo(r * 0.95, -r * 0.45);
        ctx.lineTo(r * 0.85, r * 0.6);
        ctx.closePath();
        ctx.fill();
        break;
      case 3: // Gema diamante multifaceta
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.82, -r * 0.22);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.82, -r * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        break;
      case 4: // Escudo arcano
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.82, -r * 0.55);
        ctx.lineTo(r * 0.65, r * 0.35);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.65, r * 0.35);
        ctx.lineTo(-r * 0.82, -r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        break;
      case 5: // Estrella de 5 puntas
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 === 0 ? r : r * 0.44;
          const a = (k * Math.PI) / 5 - Math.PI / 2;
          if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 6: // Planeta anillado
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(-0.4);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.98, r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 7: // Núcleo atómico
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.rotate((k * Math.PI) / 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        break;
      default: // Reloj / Cruz de Mira / Hexágono con núcleo
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();

    // Etiqueta geométrica secundaria si hay >9 parejas para diferenciar pares únicos claramente
    if (id >= 9) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, Math.floor(size * 0.16))}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`+${id - 8}`, cx + size * 0.36, cy - size * 0.24);
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#090616');
    grad.addColorStop(1, '#160d2d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Barra superior informativa
    ctx.fillStyle = '#1f143b';
    ctx.strokeStyle = this.timedMode ? 'rgba(255, 190, 11, 0.45)' : 'rgba(0, 245, 212, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(w - 230, 12, 214, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.timedMode ? '#ffbe0b' : '#00f5d4';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.timedMode ? 'Reloj: ACTIVO (Tocar)' : 'Reloj: LIBRE (Tocar)', w - 123, 34);

    ctx.fillStyle = '#f2f5ff';
    ctx.textAlign = 'left';
    ctx.fillText(`Parejas restantes: ${this.matchesLeft} · Combo: x${Math.max(1, this.combo)}`, 18, 34);

    const { boardX, boardY, cardW, cardH, gap } = this._getLayout();

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const x = boardX + col * (cardW + gap);
      const y = boardY + row * (cardH + gap);

      const isFaceUp = card.state === 'flipped' || card.state === 'matched';
      const baseColor =
        card.state === 'matched'
          ? '#0d3b3e'
          : isFaceUp
          ? '#2b1b54'
          : '#191032';
      const borderCol =
        card.state === 'matched'
          ? '#00f5d4'
          : isFaceUp
          ? '#ff2a85'
          : i === this.cursor
          ? '#ffbe0b'
          : 'rgba(139, 92, 246, 0.45)';

      drawBeveledBlock(
        ctx,
        x,
        y,
        cardW,
        cardH,
        baseColor,
        'rgba(255, 255, 255, 0.22)',
        'rgba(0, 0, 0, 0.45)',
        { radius: 10, bevel: 3, gloss: isFaceUp, border: borderCol, borderWidth: i === this.cursor ? 3 : 1.8 }
      );

      if (isFaceUp) {
        this._drawCardEmblem(ctx, card, x + cardW / 2, y + cardH / 2, Math.min(cardW, cardH));
      } else {
        // Reverso arcano ornamental con rombo y nodos
        const cx = x + cardW / 2;
        const cy = y + cardH / 2;
        const dr = Math.min(cardW, cardH) * 0.26;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 7, y + 7, cardW - 14, cardH - 14);
        ctx.beginPath();
        ctx.moveTo(cx, cy - dr);
        ctx.lineTo(cx + dr, cy);
        ctx.lineTo(cx, cy + dr);
        ctx.lineTo(cx - dr, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(139, 92, 246, 0.55)';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);
  }

  destroy() {}
}
