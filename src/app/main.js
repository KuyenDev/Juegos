import { APP_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';
import { StatisticsService } from '../services/StatisticsService.js';
import { AchievementService } from '../services/AchievementService.js';
import { AudioManager } from '../engine/AudioManager.js';
import { GameRegistry } from '../engine/GameRegistry.js';
import { renderHeader } from '../components/Header.js';
import { renderGameGrid } from '../components/GameGrid.js';
import { GameModal } from '../components/GameModal.js';
import { openStatsModal } from '../components/StatsModal.js';
import { openSettingsModal } from '../components/Settings.js';
import { Router } from './router.js';
import { NavigationUI } from './navigation.js';

class ArcadeApp {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.deferredInstallPrompt = null;
    this.gameModal = null;
    this.router = null;
  }

  async init() {
    document.title = `${APP_CONFIG.appName} — Minijuegos Clásicos Offline`;
    await StorageService.init();
    NavigationUI.applyThemeAndBackground();
    AudioManager.syncFromSettings();

    // Escuchar logros desbloqueados para mostrar notificación y sonido
    AchievementService.onUnlock((ach) => {
      AudioManager.play('achievement');
      NavigationUI.showAchievementToast(ach);
    });

    // Actualizar vista principal cuando cambien estadísticas o favoritos sin recrear cabecera
    StatisticsService.subscribe(() => {
      if (!this.gameModal?.root) {
        this.updateGridOnly();
      }
    });

    // Eventos de red online/offline
    window.addEventListener('online', () => this._updateNetworkPill());
    window.addEventListener('offline', () => this._updateNetworkPill());

    // Capturar evento de instalación PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (!this.gameModal?.root) {
        this.renderHome();
      }
    });

    this.gameModal = new GameModal({
      onExit: () => {
        this.router.navigateToHome();
      },
      onSwitchRandomGame: (excludeId) => {
        this.playRandomGame(excludeId);
      }
    });

    this.router = new Router(async (route) => {
      if (route.view === 'game' && route.gameId) {
        const gameMeta = GameRegistry.getById(route.gameId);
        if (gameMeta) {
          if (!this.appContainer.children.length) {
            await this.renderHome();
          }
          await this.gameModal.open(gameMeta);
          return;
        }
      }
      this.gameModal.close();
      await this.renderHome();
    });

    this.router.init();
    this._registerServiceWorker();
  }

  _updateNetworkPill() {
    const pill = document.getElementById('network-status-pill');
    if (!pill) return;
    const isOffline = navigator.onLine === false;
    pill.className = `status-pill ${isOffline ? 'offline' : 'online'}`;
    pill.textContent = isOffline ? '⚡ MODO OFFLINE ACTIVO' : '✓ LISTO SIN INTERNET';
  }

  async renderHome() {
    if (!this.appContainer) return;

    const [profile, allGameStats] = await Promise.all([
      StorageService.getProfile(),
      StorageService.getAllGameStats()
    ]);

    const allGames = GameRegistry.getAll();
    const filteredGames = GameRegistry.filter({
      category: this.activeCategory,
      query: this.searchQuery,
      favorites: profile.favorites || []
    });

    // Preservar foco del buscador si estaba activo
    const hadSearchFocus = document.activeElement?.id === 'game-search-input';
    const cursorPos = hadSearchFocus ? document.activeElement.selectionStart : null;

    this.appContainer.innerHTML = '';

    const headerEl = renderHeader({
      profile,
      searchQuery: this.searchQuery,
      canInstallPWA: Boolean(this.deferredInstallPrompt),
      onSearch: (val) => {
        this.searchQuery = val;
        this.updateGridOnly();
      },
      onOpenStats: (tab) => {
        AudioManager.play('click');
        openStatsModal({
          initialTab: tab,
          onProfileUpdated: () => {
            NavigationUI.applyThemeAndBackground();
            this.renderHome();
          }
        });
      },
      onOpenSettings: () => {
        AudioManager.play('click');
        openSettingsModal({
          deferredPrompt: this.deferredInstallPrompt,
          onTriggerInstallPrompt: () => this._triggerInstallPrompt(),
          onSettingsChanged: () => {
            NavigationUI.applyThemeAndBackground();
            this.renderHome();
          }
        });
      },
      onOpenInstallGuide: () => {
        AudioManager.play('click');
        if (this.deferredInstallPrompt) {
          this._triggerInstallPrompt();
        } else {
          openSettingsModal({
            initialSection: 'install',
            deferredPrompt: this.deferredInstallPrompt,
            onSettingsChanged: () => {
              NavigationUI.applyThemeAndBackground();
              this.renderHome();
            }
          });
        }
      }
    });

    const mainEl = renderGameGrid({
      allGames,
      filteredGames,
      activeCategory: this.activeCategory,
      searchQuery: this.searchQuery,
      profile,
      allGameStats,
      onSelectCategory: (catId) => {
        AudioManager.play('click');
        this.activeCategory = catId;
        if (catId !== 'all' && this.searchQuery) {
          this.searchQuery = '';
        }
        this.updateGridOnly();
      },
      onPlayGame: (gameId) => {
        this.router.navigateToGame(gameId);
      },
      onToggleFavorite: async (gameId) => {
        AudioManager.play('click');
        await StatisticsService.toggleFavorite(gameId);
      },
      onPlayRandom: () => {
        this.playRandomGame();
      }
    });

    const footerEl = document.createElement('footer');
    footerEl.className = 'arcade-footer';
    footerEl.innerHTML = `
      <p>
        <strong>${APP_CONFIG.appName}</strong> v${APP_CONFIG.version} · ${allGames.length} Videojuegos Clásicos Originales con Banda Sonora Chiptune 8-Bits · 100% Funcional Offline (PWA + IndexedDB)
      </p>
    `;

    this.appContainer.appendChild(headerEl);
    this.appContainer.appendChild(mainEl);
    this.appContainer.appendChild(footerEl);
  }

  async updateGridOnly() {
    if (!this.appContainer) return;
    const [profile, allGameStats] = await Promise.all([
      StorageService.getProfile(),
      StorageService.getAllGameStats()
    ]);
    const allGames = GameRegistry.getAll();
    const filteredGames = GameRegistry.filter({
      category: this.activeCategory,
      query: this.searchQuery,
      favorites: profile.favorites || []
    });
    const newMain = renderGameGrid({
      allGames,
      filteredGames,
      activeCategory: this.activeCategory,
      searchQuery: this.searchQuery,
      profile,
      allGameStats,
      onSelectCategory: (catId) => {
        AudioManager.play('click');
        this.activeCategory = catId;
        this.updateGridOnly();
      },
      onPlayGame: (gameId) => {
        this.router.navigateToGame(gameId);
      },
      onToggleFavorite: async (gameId) => {
        AudioManager.play('click');
        await StatisticsService.toggleFavorite(gameId);
      },
      onPlayRandom: () => {
        this.playRandomGame();
      }
    });
    const oldMain = this.appContainer.querySelector('.arcade-main');
    if (oldMain) {
      oldMain.replaceWith(newMain);
    }
    const ptsEl = this.appContainer.querySelector('.profile-chip-pts');
    if (ptsEl) {
      ptsEl.textContent = `★ ${(profile.totalGlobalPoints || 0).toLocaleString()} pts`;
    }
  }

  playRandomGame(excludeId = null) {
    const candidates = GameRegistry.getAll().filter((g) => g.id !== excludeId);
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.router.navigateToGame(pick.id);
  }

  async _triggerInstallPrompt() {
    if (!this.deferredInstallPrompt) return;
    this.deferredInstallPrompt.prompt();
    await this.deferredInstallPrompt.userChoice.catch(() => {});
    this.deferredInstallPrompt = null;
    this.renderHome();
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
      });
    }
  }
}

const app = new ArcadeApp();
app.init();
