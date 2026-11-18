/**
 * Sistema de Dificultad Infinita.
 * Calcula curvas de dificultad progresivas con límites asintóticos, momentos de alivio
 * y semillas de variación procedural para que ningún nivel se sienta idéntico ni imposible.
 */
export class DifficultyManager {
  constructor(config = {}) {
    this.baseSpeed = config.baseSpeed || 1;
    this.maxSpeedMultiplier = config.maxSpeedMultiplier || 2.85;
    this.growthRate = config.growthRate || 0.14;
    this.reliefEvery = config.reliefEvery || 5; // Cada N niveles hay un ligero respiro de velocidad con evento bonus
    this.level = 1;
  }

  setLevel(level) {
    this.level = Math.max(1, Math.floor(level));
    return this.getMetrics();
  }

  getMetrics(levelOverride = this.level) {
    const lvl = Math.max(1, Math.floor(levelOverride));
    const isReliefWave = lvl > 1 && lvl % this.reliefEvery === 0;
    const isBossOrSpecialWave = lvl > 1 && lvl % 5 === 0;

    // Curva asintótica suave: 1 + (max - 1) * (1 - e^(-k * (lvl - 1)))
    const rawProgress = 1 - Math.exp(-this.growthRate * (lvl - 1));
    let speedMultiplier = 1 + (this.maxSpeedMultiplier - 1) * rawProgress;

    if (isReliefWave) {
      // Momento ocasional de alivio (-12% velocidad respecto a la curva, pero mayor recompensa)
      speedMultiplier = Math.max(1.05, speedMultiplier * 0.88);
    }

    const densityMultiplier = 1 + Math.min(1.6, Math.log2(lvl) * 0.32);
    const scoreMultiplier = Number((1 + (lvl - 1) * 0.15).toFixed(2));
    const patternIndex = (lvl - 1) % 8;

    return {
      level: lvl,
      speed: Number((this.baseSpeed * speedMultiplier).toFixed(3)),
      speedMultiplier: Number(speedMultiplier.toFixed(2)),
      densityMultiplier: Number(densityMultiplier.toFixed(2)),
      scoreMultiplier,
      isReliefWave,
      isBossOrSpecialWave,
      patternIndex,
      hazardChance: Math.min(0.65, 0.08 + (lvl - 1) * 0.035),
      aiPrecision: Math.min(0.94, 0.54 + (1 - Math.exp(-0.12 * (lvl - 1))) * 0.4)
    };
  }
}
