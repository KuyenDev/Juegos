/**
 * Superposición de menú de pausa dentro del juego activo.
 */
export function createPauseMenu({ gameMeta, onResume, onRestart, onExit }) {
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay-backdrop hidden';
  overlay.id = 'pause-menu-overlay';
  overlay.innerHTML = `
    <div class="game-overlay-card pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <span class="overlay-badge">PARTIDA EN PAUSA</span>
      <h2 id="pause-title" class="overlay-title">${gameMeta.name}</h2>
      <p class="overlay-subtitle">${gameMeta.subtitle || ''}</p>

      <div class="controls-guide-box">
        <div class="control-row">
          <span class="control-device">💻 Teclado / Ratón:</span>
          <p>${gameMeta.controls?.desktop || 'Flechas / WASD + Espacio'}</p>
        </div>
        <div class="control-row">
          <span class="control-device">📱 Pantalla Táctil:</span>
          <p>${gameMeta.controls?.mobile || 'Controles táctiles en pantalla o gestos'}</p>
        </div>
      </div>

      <div class="overlay-actions">
        <button type="button" class="overlay-btn primary" id="pause-resume-btn">▶ Continuar Partida</button>
        <button type="button" class="overlay-btn secondary" id="pause-restart-btn">↻ Reiniciar Nivel 1</button>
        <button type="button" class="overlay-btn ghost" id="pause-exit-btn">⬅ Volver a la Biblioteca</button>
      </div>
    </div>
  `;

  overlay.querySelector('#pause-resume-btn').addEventListener('click', onResume);
  overlay.querySelector('#pause-restart-btn').addEventListener('click', onRestart);
  overlay.querySelector('#pause-exit-btn').addEventListener('click', onExit);

  return {
    element: overlay,
    show() {
      overlay.classList.remove('hidden');
    },
    hide() {
      overlay.classList.add('hidden');
    }
  };
}
