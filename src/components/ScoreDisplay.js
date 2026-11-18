/**
 * Componente modular de visualización de puntuación, nivel, velocidad y estado en el HUD.
 */
export function createScoreDisplay() {
  const wrap = document.createElement('div');
  wrap.className = 'hud-metrics-group';
  wrap.innerHTML = `
    <div class="hud-stat-pill">
      <span class="hud-stat-label">PUNTOS</span>
      <strong class="hud-stat-value" id="hud-score-val">0</strong>
    </div>
    <div class="hud-stat-pill">
      <span class="hud-stat-label">RÉCORD</span>
      <strong class="hud-stat-value accent-pink" id="hud-best-val">0</strong>
    </div>
    <div class="hud-stat-pill">
      <span class="hud-stat-label">NIVEL</span>
      <strong class="hud-stat-value accent-gold" id="hud-level-val">1</strong>
    </div>
    <div class="hud-stat-pill hud-speed-pill">
      <span class="hud-stat-label">VEL / ESTADO</span>
      <strong class="hud-stat-value" id="hud-status-val">1.0x</strong>
    </div>
  `;

  return {
    element: wrap,
    updateScore({ score, highScore, isNewRecord }) {
      const scoreEl = wrap.querySelector('#hud-score-val');
      const bestEl = wrap.querySelector('#hud-best-val');
      if (scoreEl) scoreEl.textContent = score.toLocaleString();
      if (bestEl) {
        bestEl.textContent = highScore.toLocaleString();
        bestEl.classList.toggle('new-record-glow', Boolean(isNewRecord));
      }
    },
    updateLevel(level, metrics = {}) {
      const lvlEl = wrap.querySelector('#hud-level-val');
      const statusEl = wrap.querySelector('#hud-status-val');
      if (lvlEl) lvlEl.textContent = String(level);
      if (statusEl && metrics.speedMultiplier) {
        statusEl.textContent = `${metrics.speedMultiplier}x`;
      }
    },
    updateStatusText(text) {
      const statusEl = wrap.querySelector('#hud-status-val');
      if (statusEl && text) {
        statusEl.textContent = text;
      }
    }
  };
}
