import { StorageService } from './StorageService.js';
import { AchievementService } from './AchievementService.js';

class StatisticsServiceClass {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _emitChange() {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        // ignore
      }
    }
  }

  async markGameOpened(gameId) {
    const profile = await StorageService.getProfile();
    const recent = [gameId, ...(profile.recentGames || []).filter((id) => id !== gameId)].slice(0, 6);
    await StorageService.saveProfile({
      ...profile,
      recentGames: recent
    });
    this._emitChange();
  }

  async toggleFavorite(gameId) {
    const profile = await StorageService.getProfile();
    const favs = new Set(profile.favorites || []);
    if (favs.has(gameId)) {
      favs.delete(gameId);
    } else {
      favs.add(gameId);
    }
    const updated = await StorageService.saveProfile({
      ...profile,
      favorites: Array.from(favs)
    });
    this._emitChange();
    return updated.favorites.includes(gameId);
  }

  /**
   * Registra el resultado de una partida finalizada o reiniciada con puntos.
   * @param {Object} result
   * @param {string} result.gameId
   * @param {number} result.score
   * @param {number} result.level
   * @param {number} result.durationSeconds
   * @param {boolean} [result.won]
   * @param {number} [result.bestTimeMs] - Opcional para juegos de tiempo (Memory, Reaction, Minesweeper)
   */
  async recordMatchResult({
    gameId,
    score = 0,
    level = 1,
    durationSeconds = 1,
    won = false,
    bestTimeMs = null
  }) {
    const cleanScore = Math.max(0, Math.round(score));
    const cleanLevel = Math.max(1, Math.round(level));
    const cleanDuration = Math.max(1, Math.round(durationSeconds));

    const [profile, gameStat] = await Promise.all([
      StorageService.getProfile(),
      StorageService.getGameStats(gameId)
    ]);

    const previousHighScore = gameStat.highScore || 0;
    const isNewRecord = cleanScore > previousHighScore;
    const newHighScore = Math.max(previousHighScore, cleanScore);

    let newBestTimeMs = gameStat.bestTimeMs;
    if (typeof bestTimeMs === 'number' && bestTimeMs > 0) {
      newBestTimeMs = newBestTimeMs ? Math.min(newBestTimeMs, bestTimeMs) : bestTimeMs;
    }

    const consideredWin = Boolean(won || cleanLevel >= 2 || isNewRecord);
    const updatedGameStat = await StorageService.saveGameStats(gameId, {
      highScore: newHighScore,
      gamesPlayed: (gameStat.gamesPlayed || 0) + 1,
      gamesWon: (gameStat.gamesWon || 0) + (consideredWin ? 1 : 0),
      maxLevel: Math.max(gameStat.maxLevel || 1, cleanLevel),
      totalScoreAccumulated: (gameStat.totalScoreAccumulated || 0) + cleanScore,
      totalTimeSeconds: (gameStat.totalTimeSeconds || 0) + cleanDuration,
      bestTimeMs: newBestTimeMs
    });

    // Economía equilibrada de puntos globales: normalizada por escala de puntuación del género
    // para que juegos de puntajes altos (ej. 2048) y juegos por puntos unitarios (ej. Flappy) progresen de forma justa
    const normalizedScoreXP = Math.round(Math.sqrt(cleanScore) * 3.8);
    const earnedGlobalPoints = Math.max(
      8,
      Math.min(280, normalizedScoreXP) + (cleanLevel - 1) * 18 + (isNewRecord && cleanScore > 0 ? 35 : 0)
    );

    const newStreak = consideredWin ? (profile.currentWinStreak || 0) + 1 : 0;
    const bestStreak = Math.max(profile.bestWinStreak || 0, newStreak);

    await StorageService.saveProfile({
      ...profile,
      totalGlobalPoints: (profile.totalGlobalPoints || 0) + earnedGlobalPoints,
      totalGamesPlayed: (profile.totalGamesPlayed || 0) + 1,
      totalGamesWon: (profile.totalGamesWon || 0) + (consideredWin ? 1 : 0),
      totalPlayTimeSeconds: (profile.totalPlayTimeSeconds || 0) + cleanDuration,
      highestLevelEver: Math.max(profile.highestLevelEver || 1, cleanLevel),
      bestSingleScoreEver: Math.max(profile.bestSingleScoreEver || 0, cleanScore),
      currentWinStreak: newStreak,
      bestWinStreak: bestStreak
    });

    const matchRecord = {
      gameId,
      score: cleanScore,
      level: cleanLevel,
      durationSeconds: cleanDuration,
      won: consideredWin,
      isNewRecord,
      previousHighScore,
      earnedGlobalPoints
    };

    await StorageService.addHistoryEntry(matchRecord);
    const newlyUnlockedAchievements = await AchievementService.evaluate(matchRecord);

    this._emitChange();

    return {
      ...matchRecord,
      highScore: newHighScore,
      gameStat: updatedGameStat,
      newlyUnlockedAchievements
    };
  }

  async getDashboardSummary() {
    const [profile, allGameStats, achievements, recentHistory] = await Promise.all([
      StorageService.getProfile(),
      StorageService.getAllGameStats(),
      AchievementService.getAllWithStatus(),
      StorageService.getRecentHistory(15)
    ]);

    return {
      profile,
      allGameStats,
      achievements,
      recentHistory
    };
  }
}

export const StatisticsService = new StatisticsServiceClass();
