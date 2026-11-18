import { APP_CONFIG } from '../config.js';
import { sanitizePositiveInt } from '../utils/sanitize.js';

const DEFAULT_SETTINGS = {
  playerName: 'Jugador 1',
  theme: 'dark',
  background: 'grid',
  avatarId: 'joystick',
  frameId: 'basic',
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,
  showTouchControls: 'auto', // 'auto' | 'always' | 'off'
  reducedMotion: false
};

const DEFAULT_PROFILE = {
  id: 'main',
  totalGlobalPoints: 0,
  totalGamesPlayed: 0,
  totalGamesWon: 0,
  totalPlayTimeSeconds: 0,
  highestLevelEver: 1,
  bestSingleScoreEver: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  favorites: [],
  recentGames: [],
  unlockedRewards: ['dark', 'arcade', 'light', 'joystick', 'alien', 'basic', 'grid', 'clean'],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

class StorageServiceClass {
  constructor() {
    this.db = null;
    this.memoryFallback = {
      profile: { ...DEFAULT_PROFILE },
      gameStats: {},
      achievements: {},
      history: []
    };
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        this._loadFallbackFromLocalStorage();
        this.initialized = true;
        resolve();
        return;
      }

      try {
        const request = indexedDB.open(APP_CONFIG.dbName, APP_CONFIG.dbVersion);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('gameStats')) {
            db.createObjectStore('gameStats', { keyPath: 'gameId' });
          }
          if (!db.objectStoreNames.contains('achievements')) {
            db.createObjectStore('achievements', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('history')) {
            const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = async (event) => {
          this.db = event.target.result;
          this.initialized = true;
          await this._ensureDefaultProfile();
          resolve();
        };

        request.onerror = () => {
          this._loadFallbackFromLocalStorage();
          this.initialized = true;
          resolve();
        };
      } catch {
        this._loadFallbackFromLocalStorage();
        this.initialized = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  _loadFallbackFromLocalStorage() {
    try {
      const raw = localStorage.getItem(`${APP_CONFIG.storagePrefix}idb_backup`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memoryFallback = {
          profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
          gameStats: parsed.gameStats || {},
          achievements: parsed.achievements || {},
          history: parsed.history || []
        };
      }
    } catch {
      // ignore storage errors
    }
  }

  _saveFallbackToLocalStorage() {
    try {
      localStorage.setItem(
        `${APP_CONFIG.storagePrefix}idb_backup`,
        JSON.stringify(this.memoryFallback)
      );
    } catch {
      // ignore quota errors
    }
  }

  async _ensureDefaultProfile() {
    const existing = await this._txGet('profile', 'main');
    if (!existing || !existing.id) {
      await this._txPut('profile', { ...DEFAULT_PROFILE });
    }
  }

  /* ==========================================================================
   * CONFIGURACIONES LIGERAS (LocalStorage)
   * ========================================================================== */
  getSettings() {
    try {
      const raw = localStorage.getItem(`${APP_CONFIG.storagePrefix}settings`);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(partial) {
    const merged = { ...this.getSettings(), ...partial };
    try {
      localStorage.setItem(`${APP_CONFIG.storagePrefix}settings`, JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  }

  /* ==========================================================================
   * OPERACIONES GENÉRICAS INDEXEDDB
   * ========================================================================== */
  _txGet(storeName, key) {
    if (!this.db) {
      if (storeName === 'profile') return Promise.resolve(this.memoryFallback.profile);
      return Promise.resolve(this.memoryFallback[storeName]?.[key] || null);
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  _txGetAll(storeName) {
    if (!this.db) {
      if (storeName === 'history') return Promise.resolve([...this.memoryFallback.history]);
      const map = this.memoryFallback[storeName] || {};
      return Promise.resolve(Object.values(map));
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  _txPut(storeName, value) {
    if (storeName === 'profile') {
      this.memoryFallback.profile = value;
    } else if (storeName === 'history') {
      this.memoryFallback.history.push(value);
      if (this.memoryFallback.history.length > 100) {
        this.memoryFallback.history.shift();
      }
    } else {
      const k = value.gameId || value.id;
      if (k) this.memoryFallback[storeName][k] = value;
    }
    this._saveFallbackToLocalStorage();

    if (!this.db) return Promise.resolve(value);

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(value);
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => resolve(value);
      } catch {
        resolve(value);
      }
    });
  }

  /* ==========================================================================
   * PERFIL, ESTADÍSTICAS POR JUEGO, LOGROS E HISTORIAL
   * ========================================================================== */
  async getProfile() {
    await this.init();
    const p = await this._txGet('profile', 'main');
    return { ...DEFAULT_PROFILE, ...(p || {}) };
  }

  async saveProfile(profileData) {
    await this.init();
    const updated = {
      ...DEFAULT_PROFILE,
      ...profileData,
      id: 'main',
      updatedAt: Date.now()
    };
    return this._txPut('profile', updated);
  }

  async getGameStats(gameId) {
    await this.init();
    const existing = await this._txGet('gameStats', gameId);
    return {
      gameId,
      highScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      maxLevel: 1,
      totalScoreAccumulated: 0,
      totalTimeSeconds: 0,
      bestTimeMs: null,
      lastPlayedAt: null,
      ...(existing || {})
    };
  }

  async getAllGameStats() {
    await this.init();
    const list = await this._txGetAll('gameStats');
    const map = {};
    for (const item of list) {
      map[item.gameId] = item;
    }
    return map;
  }

  async saveGameStats(gameId, statsData) {
    await this.init();
    const current = await this.getGameStats(gameId);
    const updated = {
      ...current,
      ...statsData,
      gameId,
      lastPlayedAt: Date.now()
    };
    return this._txPut('gameStats', updated);
  }

  async getUnlockedAchievements() {
    await this.init();
    const list = await this._txGetAll('achievements');
    const map = {};
    for (const item of list) {
      map[item.id] = item;
    }
    return map;
  }

  async unlockAchievement(id, meta = {}) {
    await this.init();
    const record = {
      id,
      unlockedAt: Date.now(),
      ...meta
    };
    return this._txPut('achievements', record);
  }

  async addHistoryEntry(entry) {
    await this.init();
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      ...entry
    };
    return this._txPut('history', record);
  }

  async getRecentHistory(limit = 25) {
    await this.init();
    const all = await this._txGetAll('history');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /* ==========================================================================
   * EXPORTAR, IMPORTAR Y RESTABLECER DATOS
   * ========================================================================== */
  async exportData() {
    await this.init();
    const [profile, gameStats, achievements, history] = await Promise.all([
      this.getProfile(),
      this.getAllGameStats(),
      this.getUnlockedAchievements(),
      this.getRecentHistory(100)
    ]);
    return JSON.stringify(
      {
        app: APP_CONFIG.appName,
        version: APP_CONFIG.version,
        exportedAt: new Date().toISOString(),
        settings: this.getSettings(),
        profile,
        gameStats,
        achievements,
        history
      },
      null,
      2
    );
  }

  async importData(jsonString) {
    await this.init();
    if (typeof jsonString !== 'string' || jsonString.length > 2_000_000) {
      throw new Error('El archivo de respaldo excede el tamaño permitido o no es texto válido.');
    }
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.profile || typeof parsed.profile !== 'object') {
      throw new Error('El archivo JSON no tiene un formato válido de ARCADE INFINITO.');
    }

    if (parsed.settings && typeof parsed.settings === 'object') {
      const s = parsed.settings;
      const validThemes = new Set(APP_CONFIG.themes.map((t) => t.id));
      const validBgs = new Set(APP_CONFIG.backgrounds.map((b) => b.id));
      const validAvatars = new Set(APP_CONFIG.avatars.map((a) => a.id));
      const validFrames = new Set(APP_CONFIG.frames.map((f) => f.id));
      this.saveSettings({
        playerName: String(s.playerName || 'Jugador 1').slice(0, 20),
        theme: validThemes.has(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
        background: validBgs.has(s.background) ? s.background : DEFAULT_SETTINGS.background,
        avatarId: validAvatars.has(s.avatarId) ? s.avatarId : DEFAULT_SETTINGS.avatarId,
        frameId: validFrames.has(s.frameId) ? s.frameId : DEFAULT_SETTINGS.frameId,
        soundEnabled: s.soundEnabled !== false,
        musicEnabled: s.musicEnabled !== false,
        volume: Math.max(0, Math.min(1, Number.isFinite(Number(s.volume)) ? Number(s.volume) : 0.7))
      });
    }

    const p = parsed.profile;
    await this.saveProfile({
      totalGlobalPoints: sanitizePositiveInt(p.totalGlobalPoints),
      totalGamesPlayed: sanitizePositiveInt(p.totalGamesPlayed),
      totalGamesWon: sanitizePositiveInt(p.totalGamesWon),
      totalPlayTimeSeconds: sanitizePositiveInt(p.totalPlayTimeSeconds),
      highestLevelEver: Math.max(1, sanitizePositiveInt(p.highestLevelEver, 1, 10000)),
      bestSingleScoreEver: sanitizePositiveInt(p.bestSingleScoreEver),
      currentWinStreak: sanitizePositiveInt(p.currentWinStreak),
      bestWinStreak: sanitizePositiveInt(p.bestWinStreak),
      favorites: Array.isArray(p.favorites) ? p.favorites.filter((id) => typeof id === 'string').slice(0, 60) : [],
      recentGames: Array.isArray(p.recentGames) ? p.recentGames.filter((id) => typeof id === 'string').slice(0, 12) : [],
      unlockedRewards: Array.isArray(p.unlockedRewards)
        ? Array.from(new Set([...DEFAULT_PROFILE.unlockedRewards, ...p.unlockedRewards.filter((id) => typeof id === 'string')]))
        : [...DEFAULT_PROFILE.unlockedRewards],
      createdAt: sanitizePositiveInt(p.createdAt, Date.now())
    });

    if (parsed.gameStats && typeof parsed.gameStats === 'object') {
      for (const [gameId, stat] of Object.entries(parsed.gameStats)) {
        if (!/^[a-z0-9_-]+$/i.test(gameId) || !stat || typeof stat !== 'object') continue;
        await this.saveGameStats(gameId, {
          highScore: sanitizePositiveInt(stat.highScore),
          gamesPlayed: sanitizePositiveInt(stat.gamesPlayed),
          gamesWon: sanitizePositiveInt(stat.gamesWon),
          maxLevel: Math.max(1, sanitizePositiveInt(stat.maxLevel, 1, 10000)),
          totalScoreAccumulated: sanitizePositiveInt(stat.totalScoreAccumulated),
          totalTimeSeconds: sanitizePositiveInt(stat.totalTimeSeconds),
          bestTimeMs: stat.bestTimeMs ? sanitizePositiveInt(stat.bestTimeMs, null) : null
        });
      }
    }

    if (parsed.achievements && typeof parsed.achievements === 'object') {
      for (const [achId, ach] of Object.entries(parsed.achievements)) {
        if (!/^[a-z0-9_-]+$/i.test(achId) || !ach || typeof ach !== 'object') continue;
        await this.unlockAchievement(achId, {
          unlockedAt: sanitizePositiveInt(ach.unlockedAt, Date.now())
        });
      }
    }

    return true;
  }

  async resetAllData() {
    await this.init();
    this.memoryFallback = {
      profile: { ...DEFAULT_PROFILE },
      gameStats: {},
      achievements: {},
      history: []
    };
    localStorage.removeItem(`${APP_CONFIG.storagePrefix}idb_backup`);
    localStorage.removeItem(`${APP_CONFIG.storagePrefix}settings`);

    if (this.db) {
      const stores = ['profile', 'gameStats', 'achievements', 'history'];
      await Promise.all(
        stores.map(
          (storeName) =>
            new Promise((resolve) => {
              try {
                const tx = this.db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
              } catch {
                resolve();
              }
            })
        )
      );
    }
    await this.saveProfile({ ...DEFAULT_PROFILE });
  }
}

export const StorageService = new StorageServiceClass();
