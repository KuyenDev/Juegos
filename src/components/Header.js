import { APP_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { escapeHTML } from '../utils/sanitize.js';

export function renderHeader({
  profile,
  searchQuery = '',
  onSearch,
  onOpenStats,
  onOpenSettings,
  onOpenInstallGuide,
  canInstallPWA = false
}) {
  const settings = StorageService.getSettings();
  const avatarObj =
    APP_CONFIG.avatars.find((a) => a.id === settings.avatarId) || APP_CONFIG.avatars[0];
  const frameObj =
    APP_CONFIG.frames.find((f) => f.id === settings.frameId) || APP_CONFIG.frames[0];
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  const header = document.createElement('header');
  header.className = 'arcade-header';
  header.innerHTML = `
    <div class="header-brand" role="banner">
      <div class="brand-logo" aria-hidden="true">
        <img src="./assets/icons/icon.svg" alt="" width="42" height="42" />
      </div>
      <div class="brand-titles">
        <div class="brand-title-row">
          <h1 class="brand-name">${APP_CONFIG.appName}</h1>
          <span class="status-pill ${isOffline ? 'offline' : 'online'}" id="network-status-pill">
            ${isOffline ? '⚡ MODO OFFLINE ACTIVO' : '✓ LISTO SIN INTERNET'}
          </span>
        </div>
        <p class="brand-tagline">${APP_CONFIG.tagline}</p>
      </div>
    </div>

    <div class="header-search-wrap">
      <label for="game-search-input" class="sr-only">Buscar juegos</label>
      <div class="search-box">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input
          id="game-search-input"
          type="search"
          class="search-input"
          placeholder="Buscar por nombre o categoría (ej. Snake, Lógica, Naves)..."
          value="${escapeHTML(searchQuery)}"
          autocomplete="off"
        />
        ${
          searchQuery
            ? '<button type="button" class="search-clear-btn" id="clear-search-btn" aria-label="Limpiar búsqueda">✕</button>'
            : ''
        }
      </div>
    </div>

    <div class="header-actions">
      <button type="button" class="profile-chip" id="open-profile-btn" title="Ver perfil, récords y logros">
        <span class="avatar-badge ${frameObj.cssClass}">${avatarObj.icon}</span>
        <span class="profile-chip-info">
          <strong class="profile-chip-name">${escapeHTML(settings.playerName || 'Jugador 1')}</strong>
          <span class="profile-chip-pts">★ ${(profile.totalGlobalPoints || 0).toLocaleString()} pts</span>
        </span>
      </button>

      <button type="button" class="icon-action-btn" id="open-stats-btn" title="Estadísticas y Logros" aria-label="Estadísticas y Logros">
        🏆 <span class="btn-label-desktop">Logros</span>
      </button>

      <button type="button" class="icon-action-btn" id="open-settings-btn" title="Configuración y Datos" aria-label="Configuración">
        ⚙️ <span class="btn-label-desktop">Ajustes</span>
      </button>

      <button type="button" class="icon-action-btn install-btn ${canInstallPWA ? 'pulse' : ''}" id="open-install-btn" title="Instalar aplicación para jugar offline">
        📲 <span class="btn-label-desktop">${canInstallPWA ? 'Instalar App' : 'App Offline'}</span>
      </button>
    </div>
  `;

  const input = header.querySelector('#game-search-input');
  input.addEventListener('input', (e) => {
    if (onSearch) onSearch(e.target.value);
  });

  const clearBtn = header.querySelector('#clear-search-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      if (onSearch) onSearch('');
      input.focus();
    });
  }

  header.querySelector('#open-profile-btn').addEventListener('click', () => {
    if (onOpenStats) onOpenStats('profile');
  });
  header.querySelector('#open-stats-btn').addEventListener('click', () => {
    if (onOpenStats) onOpenStats('achievements');
  });
  header.querySelector('#open-settings-btn').addEventListener('click', () => {
    if (onOpenSettings) onOpenSettings();
  });
  header.querySelector('#open-install-btn').addEventListener('click', () => {
    if (onOpenInstallGuide) onOpenInstallGuide();
  });

  return header;
}
