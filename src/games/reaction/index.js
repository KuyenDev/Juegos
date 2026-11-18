/**
 * 12. SYNAPSE REFLEX (Reaction Test — Juego de Reflejos, Bio-Neural Lab Interface)
 * Mide el tiempo de respuesta en milisegundos a lo largo de rondas progresivas.
 * Incluye señales puras, señuelos de color y objetivos de precisión en niveles avanzados.
 */
import {
  drawGlowCircle,
  spawnShockwave,
  updateAndDrawShockwaves
} from '../../engine/PixelSprites.js';

export default class ReactionTestGame {
  constructor(api) {
    this.api = api;
    this.state = 'waiting'; // 'waiting' | 'decoy' | 'signal' | 'result'
    this.timer = 0;
    this.signalElapsed = 0;
    this.round = 1;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.timesMs = [];
    this.lastTimeMs = null;
    this.feedbackMsg = '';
    this.targetCircle = null;
    this.shockwaves = [];
    this.animTime = 0;
  }

  init() {
    this.restart();
  }

  start() {}

  restart() {
    this.round = 1;
    this.strikes = 0;
    this.timesMs = [];
    this.lastTimeMs = null;
    this._startNextRound();
  }

  _startNextRound() {
    this.state = 'waiting';
    this.timer = 1.1 + Math.random() * 2.1;
    this.feedbackMsg = 'Espera a que el núcleo se vuelva VERDE NEÓN...';
    const lvl = this.api.level.level;

    // En niveles avanzados hay un objetivo específico donde pulsar
    if (lvl >= 2) {
      const r = Math.max(46, 86 - lvl * 3);
      this.targetCircle = {
        x: 140 + Math.random() * (this.api.width - 280),
        y: 150 + Math.random() * (this.api.height - 260),
        r
      };
    } else {
      this.targetCircle = {
        x: this.api.width / 2,
        y: this.api.height / 2,
        r: 95
      };
    }

    this._syncHud();
  }

  _syncHud() {
    const best = this.timesMs.length ? `${Math.min(...this.timesMs)}ms` : '--';
    this.api.updateStatusText(`Mejor: ${best} · ♥${this.maxStrikes - this.strikes}`);
  }

  handleInput(evt) {
    if (evt.type !== 'pointerdown' && evt.type !== 'keydown' && evt.type !== 'virtualdown') return;
    if (evt.repeat) return;
    if (evt.type === 'keydown' && evt.action !== 'action') return;

    if (this.state === 'waiting' || this.state === 'decoy') {
      // Reacción antes de tiempo
      this.strikes++;
      this.api.audio.play('explosion');
      this.feedbackMsg = '⚠️ ¡Demasiado pronto! Espera la señal verde.';
      this.state = 'result';
      this.timer = 1.2;
      this._syncHud();
      if (this.strikes >= this.maxStrikes) {
        this._finishSession('Demasiadas salidas en falso');
      }
      return;
    }

    if (this.state === 'signal') {
      // Si es clic con puntero en nivel >= 2, comprobar si acertó dentro del objetivo
      if (evt.type === 'pointerdown' && this.api.level.level >= 2 && this.targetCircle) {
        const px = evt.x * this.api.width;
        const py = evt.y * this.api.height;
        const dist = Math.hypot(px - this.targetCircle.x, py - this.targetCircle.y);
        if (dist > this.targetCircle.r + 18) {
          this.strikes++;
          this.api.audio.play('hit');
          this.feedbackMsg = '❌ Fallaste el objetivo luminoso';
          this.state = 'result';
          this.timer = 1.1;
          this._syncHud();
          if (this.strikes >= this.maxStrikes) {
            this._finishSession('Fallos de precisión acumulados');
          }
          return;
        }
      }

      const elapsedMs = Math.max(12, Math.round(this.signalElapsed * 1000));
      this.lastTimeMs = elapsedMs;
      this.timesMs.push(elapsedMs);

      const pts = Math.max(10, Math.round(450 - elapsedMs * 0.85));
      this.api.addScore(pts);
      this.api.advanceProgress(40);
      this.api.audio.play('point');

      this.feedbackMsg = `⚡ ¡${elapsedMs} ms! (+${pts} pts)`;
      this.state = 'result';
      this.timer = 1.15;
      this.round++;
      this._syncHud();
    } else if (this.state === 'result' && this.timer < 0.8) {
      this._startNextRound();
    }
  }

  _finishSession(reason) {
    const avg = this.timesMs.length
      ? Math.round(this.timesMs.reduce((a, b) => a + b, 0) / this.timesMs.length)
      : 0;
    const best = this.timesMs.length ? Math.min(...this.timesMs) : null;
    this.api.triggerGameOver({
      reason,
      bestTimeMs: best,
      extraStats: best
        ? `Mejor tiempo: ${best} ms · Promedio: ${avg} ms (${this.timesMs.length} aciertos)`
        : 'Sin aciertos registrados'
    });
  }

  update(dt) {
    this.animTime += dt;
    updateAndDrawShockwaves(null, this.shockwaves, dt, false);
    if (this.state === 'waiting') {
      this.timer -= dt;
      if (this.timer <= 0) {
        // En niveles >= 3 puede aparecer un señuelo ámbar antes del verde
        if (this.api.level.level >= 3 && Math.random() < 0.35) {
          this.state = 'decoy';
          this.timer = 0.65;
          this.feedbackMsg = '¡CUIDADO! Señuelo Ámbar — NO TOQUES';
          this.api.audio.play('flip');
        } else {
          this._triggerGreenSignal();
        }
      }
    } else if (this.state === 'decoy') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'waiting';
        this.timer = 0.5 + Math.random() * 0.9;
        this.feedbackMsg = 'Espera el pulso VERDE...';
      }
    } else if (this.state === 'signal') {
      const maxWindow = Math.max(0.55, 1.4 - this.api.level.level * 0.05);
      this.signalElapsed += dt;
      if (this.signalElapsed > maxWindow) {
        this.strikes++;
        this.api.audio.play('explosion');
        this.feedbackMsg = '⌛ ¡Demasiado lento!';
        this.state = 'result';
        this.timer = 1.2;
        this._syncHud();
        if (this.strikes >= this.maxStrikes) {
          this._finishSession('Tiempo de respuesta excedido');
        }
      }
    } else if (this.state === 'result') {
      this.timer -= dt;
      if (this.timer <= 0 && this.strikes < this.maxStrikes) {
        this._startNextRound();
      }
    }
  }

  _triggerGreenSignal() {
    this.state = 'signal';
    this.signalElapsed = 0;
    this.feedbackMsg = '⚡ ¡AHORA! ¡PULSA YA!';
    const tc = this.targetCircle || { x: this.api.width / 2, y: this.api.height / 2, r: 90 };
    spawnShockwave(this.shockwaves, tc.x, tc.y, { color: '#00ff88', startRadius: tc.r * 0.5, maxRadius: tc.r * 1.75, life: 0.35, lineWidth: 4 });
    this.api.audio.play('pickup');
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;

    let bgTop = '#070b1a';
    let bgBot = '#0f172a';
    if (this.state === 'signal') {
      bgTop = '#042619';
      bgBot = '#064e3b';
    } else if (this.state === 'decoy') {
      bgTop = '#2a1604';
      bgBot = '#451a03';
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bgTop);
    grad.addColorStop(1, bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Retícula científica de laboratorio neural y anillos de radar
    const tc = this.targetCircle || { x: w / 2, y: h / 2, r: 90 };
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, tc.y);
    ctx.lineTo(w, tc.y);
    ctx.moveTo(tc.x, 0);
    ctx.lineTo(tc.x, h);
    ctx.stroke();
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, tc.r + ring * 36, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Estadísticas superiores
    const avg = this.timesMs.length
      ? Math.round(this.timesMs.reduce((a, b) => a + b, 0) / this.timesMs.length)
      : '--';
    const best = this.timesMs.length ? Math.min(...this.timesMs) : '--';

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Ronda ${this.round} · Mejor: ${best} ms · Promedio: ${avg} ms · Intentos: ${this.maxStrikes - this.strikes}`,
      w / 2,
      38
    );

    // Reactor bio-iris central o objetivo de precisión
    const circleColor =
      this.state === 'signal'
        ? '#00ff88'
        : this.state === 'decoy'
        ? '#ffbe0b'
        : this.state === 'result'
        ? '#38bdf8'
        : '#f43f5e';

    drawGlowCircle(ctx, tc.x, tc.y, tc.r * 1.45, `${circleColor}44`);

    // Anillo exterior segmentado giratorio de lentes
    ctx.save();
    ctx.translate(tc.x, tc.y);
    ctx.rotate(this.animTime * (this.state === 'signal' ? 3.5 : 0.8));
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = 4;
    for (let s = 0; s < 4; s++) {
      const a0 = (s * Math.PI) / 2 + 0.14;
      const a1 = a0 + Math.PI / 2 - 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, tc.r + 7, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    // Núcleo del reactor iris
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(tc.x, tc.y, tc.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = circleColor;
    ctx.beginPath();
    ctx.arc(tc.x, tc.y, tc.r * 0.84, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Brillo especular en lente
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(tc.x - tc.r * 0.24, tc.y - tc.r * 0.24, tc.r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#07101c';
    ctx.font = `bold ${Math.max(15, Math.floor(tc.r * 0.24))}px system-ui, sans-serif`;
    ctx.fillText(
      this.state === 'signal'
        ? '¡PULSA!'
        : this.state === 'decoy'
        ? '¡SEÑUELO!'
        : this.state === 'waiting'
        ? 'ESPERA'
        : `${this.lastTimeMs || '--'} ms`,
      tc.x,
      tc.y + 6
    );

    updateAndDrawShockwaves(ctx, this.shockwaves, 0, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(this.feedbackMsg, w / 2, h - 38);
  }

  destroy() {}
}
