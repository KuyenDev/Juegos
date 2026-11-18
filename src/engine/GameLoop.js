/**
 * Bucle de animación central basado en requestAnimationFrame y deltaTime acotado.
 */
export class GameLoop {
  constructor(onUpdate, onRender) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.running = false;
    this.paused = false;
    this.rafId = null;
    this.lastTimestamp = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.running) {
      this.start();
      return;
    }
    if (this.paused) {
      this.paused = false;
      this.lastTimestamp = performance.now();
    }
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _tick(timestamp) {
    if (!this.running) return;
    const rawDelta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    // Limitar deltaTime a 50ms (20 FPS mín) para evitar saltos tras cambiar de pestaña
    const dt = Math.min(0.05, Math.max(0.0001, rawDelta));

    if (!this.paused) {
      if (typeof this.onUpdate === 'function') {
        this.onUpdate(dt);
      }
      if (typeof this.onRender === 'function') {
        this.onRender();
      }
    }

    if (this.running) {
      this.rafId = requestAnimationFrame(this._tick);
    }
  }
}
