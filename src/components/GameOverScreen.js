/**
 * Pantalla de derrota o victoria final con celebración de récord personal y puntos ganados.
 */
export function createGameOverScreen({ onPlayAgain, onBackToMenu, onPlayAnother }) {
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay-backdrop hidden';
  overlay.id = 'gameover-overlay';

  return {
    element: overlay,
    show(summary) {
      const isNewRecord = Boolean(summary.isNewRecord);
      const unlockedList = summary.newlyUnlockedAchievements || [];

      overlay.innerHTML = `
        <div class="game-overlay-card gameover-card ${isNewRecord ? 'celebrate-record' : ''}" role="dialog" aria-modal="true">
          <span class="overlay-badge ${isNewRecord ? 'badge-record' : ''}">
            ${isNewRecord ? '🎉 ¡NUEVO RÉCORD PERSONAL!' : summary.won ? '🏆 ¡DESAFÍO COMPLETADO!' : 'FIN DE LA PARTIDA'}
          </span>
          <h2 class="overlay-title">${summary.reason || 'Partida Finalizada'}</h2>

          <div class="gameover-stats-grid">
            <div class="go-stat-box">
              <span class="go-stat-label">PUNTUACIÓN</span>
              <strong class="go-stat-value accent-cyan">${(summary.score || 0).toLocaleString()}</strong>
            </div>
            <div class="go-stat-box">
              <span class="go-stat-label">RÉCORD PERSONAL</span>
              <strong class="go-stat-value accent-pink">${(summary.highScore || 0).toLocaleString()}</strong>
            </div>
            <div class="go-stat-box">
              <span class="go-stat-label">NIVEL ALCANZADO</span>
              <strong class="go-stat-value accent-gold">Nivel ${summary.level || 1}</strong>
            </div>
            <div class="go-stat-box">
              <span class="go-stat-label">PUNTOS GLOBALES</span>
              <strong class="go-stat-value">+${summary.earnedGlobalPoints || 0} XP</strong>
            </div>
          </div>

          ${
            summary.extraStats
              ? `<p class="go-extra-stats">${summary.extraStats}</p>`
              : ''
          }

          ${
            unlockedList.length > 0
              ? `<div class="go-unlocked-achievements">
                  <span class="go-ach-heading">🏅 Logros Desbloqueados:</span>
                  ${unlockedList
                    .map(
                      (a) => `<span class="go-ach-chip">${a.icon} ${a.title} (+${a.rewardPoints} pts)</span>`
                    )
                    .join('')}
                </div>`
              : ''
          }

          <div class="overlay-actions">
            <button type="button" class="overlay-btn primary" id="go-retry-btn">↻ Volver a Intentarlo</button>
            <button type="button" class="overlay-btn secondary" id="go-random-btn">🎲 Jugar Otro Juego</button>
            <button type="button" class="overlay-btn ghost" id="go-menu-btn">🏠 Regresar al Menú</button>
          </div>
        </div>
      `;

      overlay.querySelector('#go-retry-btn').addEventListener('click', () => {
        this.hide();
        if (onPlayAgain) onPlayAgain();
      });
      overlay.querySelector('#go-random-btn').addEventListener('click', () => {
        this.hide();
        if (onPlayAnother) onPlayAnother();
      });
      overlay.querySelector('#go-menu-btn').addEventListener('click', () => {
        this.hide();
        if (onBackToMenu) onBackToMenu();
      });

      overlay.classList.remove('hidden');
    },
    hide() {
      overlay.classList.add('hidden');
    }
  };
}
