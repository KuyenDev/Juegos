import { APP_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { AudioManager } from '../engine/AudioManager.js';

/**
 * Modal de Configuración, Sonido, Temas, Exportación/Importación JSON y Guía de Instalación PWA.
 */
export async function openSettingsModal({
  onSettingsChanged,
  deferredPrompt = null,
  onTriggerInstallPrompt = null,
  initialSection = 'general'
} = {}) {
  const existing = document.getElementById('settings-modal-backdrop');
  if (existing) existing.remove();

  const profile = await StorageService.getProfile();
  const settings = StorageService.getSettings();
  const unlockedSet = new Set(profile.unlockedRewards || []);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'settings-modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-header">
        <h2 id="settings-title" class="modal-title">⚙️ Configuración y Datos Locales</h2>
        <button type="button" class="modal-close-btn" id="close-settings-btn" aria-label="Cerrar">✕</button>
      </div>

      <div class="modal-body settings-body">
        <section class="settings-block">
          <h3>🔊 Sonido y Experiencia</h3>
          <div class="setting-row">
            <label for="volume-slider">Volumen maestro (<span id="vol-pct">${Math.round((settings.volume ?? 0.7) * 100)}%</span>)</label>
            <input id="volume-slider" type="range" min="0" max="1" step="0.05" value="${settings.volume ?? 0.7}" />
          </div>
          <div class="setting-row">
            <span>Efectos de sonido arcade (SFX)</span>
            <input id="sfx-toggle" type="checkbox" class="toggle-checkbox" ${settings.soundEnabled !== false ? 'checked' : ''} />
          </div>
          <div class="setting-row">
            <span>Música sintetizada de fondo</span>
            <input id="music-toggle" type="checkbox" class="toggle-checkbox" ${settings.musicEnabled ? 'checked' : ''} />
          </div>
        </section>

        <section class="settings-block">
          <h3>🎨 Tema Visual y Fondo</h3>
          <div class="setting-row">
            <label for="theme-select">Tema de color:</label>
            <select id="theme-select" class="select-input">
              ${APP_CONFIG.themes
                .map((th) => {
                  const unlocked =
                    th.unlockedByDefault ||
                    unlockedSet.has(th.id) ||
                    (profile.totalGlobalPoints || 0) >= th.requiredPoints;
                  return `<option value="${th.id}" ${settings.theme === th.id ? 'selected' : ''} ${unlocked ? '' : 'disabled'}>
                    ${th.name} ${unlocked ? '' : `(Bloqueado: ${th.requiredPoints} pts)`}
                  </option>`;
                })
                .join('')}
            </select>
          </div>
          <div class="setting-row">
            <label for="bg-select">Estilo de fondo:</label>
            <select id="bg-select" class="select-input">
              ${APP_CONFIG.backgrounds
                .map((bg) => {
                  const unlocked =
                    unlockedSet.has(bg.id) ||
                    (profile.totalGlobalPoints || 0) >= bg.requiredPoints;
                  return `<option value="${bg.id}" ${settings.background === bg.id ? 'selected' : ''} ${unlocked ? '' : 'disabled'}>
                    ${bg.name} ${unlocked ? '' : `(${bg.requiredPoints} pts)`}
                  </option>`;
                })
                .join('')}
            </select>
          </div>
        </section>

        <section class="settings-block ${initialSection === 'install' ? 'highlight-block' : ''}">
          <h3>📲 Instalación como Aplicación Offline (PWA)</h3>
          <p class="settings-help">
            <strong>${APP_CONFIG.appName}</strong> almacena todos los juegos, sonidos y gráficos en tu dispositivo tras la primera carga para que puedas jugar en modo avión o sin cobertura.
          </p>
          ${
            deferredPrompt
              ? `<button type="button" class="overlay-btn primary" id="pwa-direct-install-btn">📲 Instalar Aplicación Ahora</button>`
              : `<div class="pwa-instructions">
                  <p>• <strong>Android / Chrome / Edge:</strong> Pulsa el menú del navegador (⋮) o el icono en la barra de direcciones y elige <em>"Instalar aplicación"</em> o <em>"Añadir a pantalla de inicio"</em>.</p>
                  <p>• <strong>iPhone / iPad (Safari):</strong> Pulsa el botón <em>Compartir</em> (□↑) y selecciona <em>"Añadir a la pantalla de inicio"</em>.</p>
                </div>`
          }
        </section>

        <section class="settings-block">
          <h3>💾 Copia de Seguridad Local (JSON)</h3>
          <p class="settings-help">
            Tus récords, logros y estadísticas se guardan localmente en IndexedDB. Puedes exportarlos a un archivo JSON o restaurarlos en otro dispositivo.
          </p>
          <div class="backup-actions-row">
            <button type="button" class="overlay-btn secondary small" id="export-json-btn">⬇ Exportar Progreso (.json)</button>
            <label class="overlay-btn secondary small file-label">
              ⬆ Importar Progreso (.json)
              <input type="file" id="import-json-input" accept="application/json,.json" hidden />
            </label>
          </div>
          <p id="backup-feedback" class="backup-feedback"></p>
        </section>

        <section class="settings-block danger-zone">
          <h3>⚠️ Zona de Restablecimiento</h3>
          <button type="button" class="overlay-btn danger small" id="reset-all-btn">🗑️ Borrar todas las estadísticas y récords</button>
        </section>
      </div>
    </div>
  `;

  backdrop.querySelector('#close-settings-btn').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const volSlider = backdrop.querySelector('#volume-slider');
  const volPct = backdrop.querySelector('#vol-pct');
  volSlider.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    volPct.textContent = `${Math.round(v * 100)}%`;
    AudioManager.setVolume(v);
    AudioManager.play('click');
  });

  backdrop.querySelector('#sfx-toggle').addEventListener('change', (e) => {
    AudioManager.setSoundEnabled(e.target.checked);
    if (e.target.checked) AudioManager.play('point');
  });

  backdrop.querySelector('#music-toggle').addEventListener('change', (e) => {
    AudioManager.setMusicEnabled(e.target.checked);
  });

  backdrop.querySelector('#theme-select').addEventListener('change', (e) => {
    StorageService.saveSettings({ theme: e.target.value });
    if (onSettingsChanged) onSettingsChanged();
  });

  backdrop.querySelector('#bg-select').addEventListener('change', (e) => {
    StorageService.saveSettings({ background: e.target.value });
    if (onSettingsChanged) onSettingsChanged();
  });

  const installBtn = backdrop.querySelector('#pwa-direct-install-btn');
  if (installBtn && onTriggerInstallPrompt) {
    installBtn.addEventListener('click', async () => {
      await onTriggerInstallPrompt();
      backdrop.remove();
    });
  }

  const feedbackEl = backdrop.querySelector('#backup-feedback');

  backdrop.querySelector('#export-json-btn').addEventListener('click', async () => {
    try {
      const json = await StorageService.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arcade-infinito-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      feedbackEl.textContent = '✓ Archivo de respaldo exportado correctamente.';
      feedbackEl.className = 'backup-feedback success';
    } catch (err) {
      feedbackEl.textContent = `Error al exportar: ${err.message}`;
      feedbackEl.className = 'backup-feedback error';
    }
  });

  backdrop.querySelector('#import-json-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await StorageService.importData(text);
      AudioManager.syncFromSettings();
      feedbackEl.textContent = '✓ Progreso importado con éxito.';
      feedbackEl.className = 'backup-feedback success';
      if (onSettingsChanged) onSettingsChanged();
    } catch (err) {
      feedbackEl.textContent = `Error al importar: ${err.message}`;
      feedbackEl.className = 'backup-feedback error';
    }
  });

  backdrop.querySelector('#reset-all-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.confirm !== 'true') {
      btn.dataset.confirm = 'true';
      btn.textContent = '⚠️ Pulsa de nuevo para confirmar el borrado total';
      return;
    }
    await StorageService.resetAllData();
    AudioManager.syncFromSettings();
    if (onSettingsChanged) onSettingsChanged();
    backdrop.remove();
  });

  document.body.appendChild(backdrop);
}
