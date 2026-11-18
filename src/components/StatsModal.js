import { APP_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { StatisticsService } from '../services/StatisticsService.js';
import { GameRegistry } from '../engine/GameRegistry.js';
import { escapeHTML } from '../utils/sanitize.js';

/**
 * Modal de Perfil del Jugador, Estadísticas detalladas por juego, Logros y Recompensas Cosméticas.
 */
export async function openStatsModal({ initialTab = 'profile', onProfileUpdated } = {}) {
  const existing = document.getElementById('stats-modal-backdrop');
  if (existing) existing.remove();

  const summary = await StatisticsService.getDashboardSummary();
  const { profile, allGameStats, achievements } = summary;
  const settings = StorageService.getSettings();
  const allGames = GameRegistry.getAll();
  const unlockedSet = new Set(profile.unlockedRewards || []);

  const formatTime = (secs = 0) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins < 60) return `${mins}m ${remSecs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'stats-modal-backdrop';

  const renderContent = (tab) => {
    const currentSettings = StorageService.getSettings();
    const avatarObj =
      APP_CONFIG.avatars.find((a) => a.id === currentSettings.avatarId) || APP_CONFIG.avatars[0];
    const frameObj =
      APP_CONFIG.frames.find((f) => f.id === currentSettings.frameId) || APP_CONFIG.frames[0];
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    backdrop.innerHTML = `
      <div class="modal-dialog large-dialog" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="avatar-badge large ${frameObj.cssClass}">${avatarObj.icon}</span>
            <div>
              <h2 id="stats-modal-title" class="modal-title">${escapeHTML(currentSettings.playerName || 'Jugador 1')}</h2>
              <p class="modal-subtitle">★ ${(profile.totalGlobalPoints || 0).toLocaleString()} Puntos Globales · ${unlockedCount}/${achievements.length} Logros</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="close-stats-modal" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-tabs">
          <button type="button" class="modal-tab-btn ${tab === 'profile' ? 'active' : ''}" data-tab="profile">📊 Estadísticas y Récords</button>
          <button type="button" class="modal-tab-btn ${tab === 'achievements' ? 'active' : ''}" data-tab="achievements">🏆 Logros (${unlockedCount}/${achievements.length})</button>
          <button type="button" class="modal-tab-btn ${tab === 'rewards' ? 'active' : ''}" data-tab="rewards">🎨 Recompensas y Perfil</button>
        </div>

        <div class="modal-body">
          ${
            tab === 'profile'
              ? `
            <div class="stats-overview-cards">
              <div class="stat-overview-box">
                <span>Puntos Totales</span>
                <strong class="accent-cyan">${(profile.totalGlobalPoints || 0).toLocaleString()}</strong>
              </div>
              <div class="stat-overview-box">
                <span>Partidas Jugadas</span>
                <strong>${profile.totalGamesPlayed || 0}</strong>
              </div>
              <div class="stat-overview-box">
                <span>Partidas Superadas</span>
                <strong class="accent-gold">${profile.totalGamesWon || 0}</strong>
              </div>
              <div class="stat-overview-box">
                <span>Mejor Racha</span>
                <strong class="accent-pink">${profile.bestWinStreak || 0} 🔥</strong>
              </div>
              <div class="stat-overview-box">
                <span>Nivel Máximo</span>
                <strong>Nivel ${profile.highestLevelEver || 1}</strong>
              </div>
              <div class="stat-overview-box">
                <span>Tiempo de Juego</span>
                <strong>${formatTime(profile.totalPlayTimeSeconds || 0)}</strong>
              </div>
            </div>

            <h3 class="sub-heading">Récords Individuales por Juego</h3>
            <div class="records-table-wrap">
              <table class="records-table">
                <thead>
                  <tr>
                    <th>Juego</th>
                    <th>Mejor Puntuación</th>
                    <th>Nivel Máx</th>
                    <th>Partidas</th>
                    <th>Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  ${allGames
                    .map((g) => {
                      const st = allGameStats[g.id] || {};
                      return `
                        <tr>
                          <td><strong>${g.name}</strong> <span class="muted-text">(${g.subtitle})</span></td>
                          <td class="accent-cyan"><strong>${(st.highScore || 0).toLocaleString()} pts</strong></td>
                          <td>Nvl ${st.maxLevel || 1}</td>
                          <td>${st.gamesPlayed || 0} (${st.gamesWon || 0} V)</td>
                          <td>${formatTime(st.totalTimeSeconds || 0)}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
              : ''
          }

          ${
            tab === 'achievements'
              ? `
            <div class="achievements-grid">
              ${achievements
                .map(
                  (ach) => `
                <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
                  <div class="ach-icon">${ach.icon}</div>
                  <div class="ach-info">
                    <div class="ach-title-row">
                      <h4>${ach.title}</h4>
                      <span class="ach-pts">+${ach.rewardPoints} pts</span>
                    </div>
                    <p>${ach.description}</p>
                    <span class="ach-status">
                      ${
                        ach.unlocked
                          ? '✓ Desbloqueado'
                          : '🔒 Bloqueado'
                      }
                    </span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }

          ${
            tab === 'rewards'
              ? `
            <div class="rewards-section">
              <div class="form-group">
                <label for="player-name-input">Nombre del Jugador Local:</label>
                <div class="inline-input-row">
                  <input id="player-name-input" type="text" maxlength="20" class="text-input" value="${escapeHTML(currentSettings.playerName || 'Jugador 1')}" />
                  <button type="button" class="overlay-btn primary small" id="save-name-btn">Guardar Nombre</button>
                </div>
              </div>

              <h3 class="sub-heading">Iconos de Perfil (Desbloqueables con Puntos Globales)</h3>
              <div class="cosmetics-grid">
                ${APP_CONFIG.avatars
                  .map((av) => {
                    const unlocked =
                      unlockedSet.has(av.id) ||
                      (profile.totalGlobalPoints || 0) >= av.requiredPoints;
                    const active = currentSettings.avatarId === av.id;
                    return `
                      <button type="button" class="cosmetic-option ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-avatar="${av.id}" ${unlocked ? '' : 'disabled'}>
                        <span class="cosmetic-preview">${av.icon}</span>
                        <strong>${av.name}</strong>
                        <small>${unlocked ? (active ? 'En uso' : 'Disponible') : `Requiere ${av.requiredPoints} pts`}</small>
                      </button>
                    `;
                  })
                  .join('')}
              </div>

              <h3 class="sub-heading">Marcos de Perfil</h3>
              <div class="cosmetics-grid">
                ${APP_CONFIG.frames
                  .map((fr) => {
                    const unlocked =
                      unlockedSet.has(fr.id) ||
                      (profile.totalGlobalPoints || 0) >= fr.requiredPoints;
                    const active = currentSettings.frameId === fr.id;
                    return `
                      <button type="button" class="cosmetic-option ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-frame="${fr.id}" ${unlocked ? '' : 'disabled'}>
                        <span class="avatar-badge ${fr.cssClass}">🕹️</span>
                        <strong>${fr.name}</strong>
                        <small>${unlocked ? (active ? 'En uso' : 'Disponible') : `Requiere ${fr.requiredPoints} pts`}</small>
                      </button>
                    `;
                  })
                  .join('')}
              </div>

              <h3 class="sub-heading">Temas Visuales de la Plataforma</h3>
              <div class="cosmetics-grid">
                ${APP_CONFIG.themes
                  .map((th) => {
                    const unlocked =
                      th.unlockedByDefault ||
                      unlockedSet.has(th.id) ||
                      (profile.totalGlobalPoints || 0) >= th.requiredPoints;
                    const active = currentSettings.theme === th.id;
                    return `
                      <button type="button" class="cosmetic-option ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-theme-pick="${th.id}" ${unlocked ? '' : 'disabled'}>
                        <span class="theme-swatch" style="background:${th.colors.bgPrimary};border-color:${th.colors.accentPrimary}"></span>
                        <strong>${th.name}</strong>
                        <small>${unlocked ? (active ? 'Activo' : 'Activar') : `Requiere ${th.requiredPoints} pts`}</small>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    backdrop.querySelector('#close-stats-modal').addEventListener('click', () => backdrop.remove());
    for (const tBtn of backdrop.querySelectorAll('[data-tab]')) {
      tBtn.addEventListener('click', () => renderContent(tBtn.dataset.tab));
    }

    const saveNameBtn = backdrop.querySelector('#save-name-btn');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => {
        const val = backdrop.querySelector('#player-name-input').value.trim() || 'Jugador 1';
        StorageService.saveSettings({ playerName: val });
        renderContent('rewards');
        if (onProfileUpdated) onProfileUpdated();
      });
    }

    for (const avBtn of backdrop.querySelectorAll('[data-avatar]')) {
      avBtn.addEventListener('click', () => {
        StorageService.saveSettings({ avatarId: avBtn.dataset.avatar });
        renderContent('rewards');
        if (onProfileUpdated) onProfileUpdated();
      });
    }

    for (const frBtn of backdrop.querySelectorAll('[data-frame]')) {
      frBtn.addEventListener('click', () => {
        StorageService.saveSettings({ frameId: frBtn.dataset.frame });
        renderContent('rewards');
        if (onProfileUpdated) onProfileUpdated();
      });
    }

    for (const thBtn of backdrop.querySelectorAll('[data-theme-pick]')) {
      thBtn.addEventListener('click', () => {
        StorageService.saveSettings({ theme: thBtn.dataset.themePick });
        renderContent('rewards');
        if (onProfileUpdated) onProfileUpdated();
      });
    }
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  renderContent(initialTab);
  document.body.appendChild(backdrop);
}
