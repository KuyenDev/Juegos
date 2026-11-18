/**
 * Gestor de progresión de niveles infinitos.
 */
export class LevelManager {
  constructor({ baseTarget = 100, targetGrowth = 1.28, onLevelUp = null } = {}) {
    this.level = 1;
    this.progress = 0;
    this.baseTarget = baseTarget;
    this.targetGrowth = targetGrowth;
    this.target = baseTarget;
    this.onLevelUp = onLevelUp;
  }

  reset() {
    this.level = 1;
    this.progress = 0;
    this.target = this.baseTarget;
  }

  _computeTargetForLevel(lvl) {
    return Math.round(this.baseTarget * Math.pow(this.targetGrowth, Math.min(lvl - 1, 18)) + (lvl - 1) * (this.baseTarget * 0.35));
  }

  addProgress(amount = 1) {
    this.progress += amount;
    let leveledUp = false;
    while (this.progress >= this.target) {
      this.progress -= this.target;
      this.level += 1;
      this.target = this._computeTargetForLevel(this.level);
      leveledUp = true;
      if (typeof this.onLevelUp === 'function') {
        this.onLevelUp(this.level);
      }
    }
    return leveledUp;
  }

  setLevel(lvl) {
    this.level = Math.max(1, Math.floor(lvl));
    this.progress = 0;
    this.target = this._computeTargetForLevel(this.level);
  }
}
