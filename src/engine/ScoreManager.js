/**
 * Gestor de puntuación para la partida activa.
 */
export class ScoreManager {
  constructor(initialHighScore = 0, onUpdate = null) {
    this.score = 0;
    this.highScore = initialHighScore || 0;
    this.combo = 1;
    this.isNewRecord = false;
    this.onUpdate = onUpdate;
  }

  reset(highScore = this.highScore) {
    this.score = 0;
    this.highScore = Math.max(this.highScore, highScore || 0);
    this.combo = 1;
    this.isNewRecord = false;
    this._emit();
  }

  add(points, multiplier = 1) {
    const delta = Math.max(0, Math.round(points * multiplier));
    this.score += delta;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewRecord = true;
    }
    this._emit();
    return delta;
  }

  set(score) {
    this.score = Math.max(0, Math.round(score));
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewRecord = true;
    }
    this._emit();
  }

  _emit() {
    if (typeof this.onUpdate === 'function') {
      this.onUpdate({
        score: this.score,
        highScore: this.highScore,
        isNewRecord: this.isNewRecord
      });
    }
  }
}
