import { StorageService } from './StorageService.js';
import { APP_CONFIG } from '../config.js';

export const ACHIEVEMENTS_CATALOG = [
  {
    id: 'first_play',
    title: 'Primera Moneda',
    description: 'Juega tu primera partida en cualquier minijuego.',
    icon: '🪙',
    rewardPoints: 25,
    check: (ctx) => ctx.profile.totalGamesPlayed >= 1
  },
  {
    id: 'first_win',
    title: 'Primera Victoria',
    description: 'Supera un desafío o avanza de nivel por primera vez.',
    icon: '🏆',
    rewardPoints: 50,
    check: (ctx) => ctx.profile.totalGamesWon >= 1 || ctx.lastMatch?.level >= 2 || ctx.lastMatch?.won
  },
  {
    id: 'plays_10',
    title: 'Habitual del Salón',
    description: 'Completa 10 partidas en el arcade.',
    icon: '🕹️',
    rewardPoints: 75,
    check: (ctx) => ctx.profile.totalGamesPlayed >= 10
  },
  {
    id: 'plays_100',
    title: 'Veterano Incansable',
    description: 'Completa 100 partidas en total.',
    icon: '🔥',
    rewardPoints: 300,
    check: (ctx) => ctx.profile.totalGamesPlayed >= 100
  },
  {
    id: 'score_100',
    title: 'Centuria Arcade',
    description: 'Consigue al menos 100 puntos en una partida o en el marcador global.',
    icon: '💯',
    rewardPoints: 40,
    check: (ctx) => (ctx.lastMatch?.score || 0) >= 100 || ctx.profile.totalGlobalPoints >= 100
  },
  {
    id: 'score_1000',
    title: 'Millar Eléctrico',
    description: 'Alcanza 1.000 puntos en una partida o en puntos globales.',
    icon: '⚡',
    rewardPoints: 120,
    check: (ctx) => (ctx.lastMatch?.score || 0) >= 1000 || ctx.profile.totalGlobalPoints >= 1000
  },
  {
    id: 'level_10',
    title: 'Ascenso Nivel 10',
    description: 'Alcanza el nivel 10 en cualquier juego (desbloquea tema Fósforo Verde).',
    icon: '🚀',
    rewardPoints: 150,
    unlocksReward: 'emerald',
    check: (ctx) => ctx.profile.highestLevelEver >= 10 || (ctx.lastMatch?.level || 1) >= 10
  },
  {
    id: 'level_25',
    title: 'Más Allá del Límite (Nivel 25)',
    description: 'Alcanza el nivel 25 en cualquier juego.',
    icon: '🌌',
    rewardPoints: 350,
    unlocksReward: 'crimson',
    check: (ctx) => ctx.profile.highestLevelEver >= 25 || (ctx.lastMatch?.level || 1) >= 25
  },
  {
    id: 'beat_record',
    title: 'Rompiendo Límites',
    description: 'Supera tu propio récord personal en un juego.',
    icon: '📈',
    rewardPoints: 60,
    check: (ctx) => Boolean(ctx.lastMatch?.isNewRecord && ctx.lastMatch?.previousHighScore > 0)
  },
  {
    id: 'five_games',
    title: 'Explorador Polivalente',
    description: 'Juega al menos a 5 juegos diferentes de la colección.',
    icon: '🧭',
    rewardPoints: 100,
    check: (ctx) => {
      const playedCount = Object.values(ctx.allStats || {}).filter((s) => s.gamesPlayed > 0).length;
      return playedCount >= 5;
    }
  },
  {
    id: 'all_twelve_games',
    title: 'Maestro del Catálogo',
    description: 'Juega al menos 12 videojuegos distintos de ARCADE INFINITO.',
    icon: '👑',
    rewardPoints: 250,
    check: (ctx) => {
      const playedCount = Object.values(ctx.allStats || {}).filter((s) => s.gamesPlayed > 0).length;
      return playedCount >= 12;
    }
  },
  {
    id: 'all_seventeen_games',
    title: 'Leyenda Arcade Total',
    description: 'Prueba los 17 minijuegos del catálogo completo.',
    icon: '🌟',
    rewardPoints: 400,
    check: (ctx) => {
      const playedCount = Object.values(ctx.allStats || {}).filter((s) => s.gamesPlayed > 0).length;
      return playedCount >= 17;
    }
  },
  {
    id: 'win_streak_3',
    title: 'Racha Imparable',
    description: 'Consigue una racha de 3 victorias o niveles superados consecutivos.',
    icon: '☄️',
    rewardPoints: 110,
    check: (ctx) => ctx.profile.bestWinStreak >= 3 || ctx.profile.currentWinStreak >= 3
  }
];

class AchievementServiceClass {
  constructor() {
    this.listeners = new Set();
  }

  onUnlock(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(achievement) {
    for (const cb of this.listeners) {
      try {
        cb(achievement);
      } catch {
        // ignore listener error
      }
    }
  }

  async evaluate(lastMatch = null) {
    const [profile, allStats, unlockedMap] = await Promise.all([
      StorageService.getProfile(),
      StorageService.getAllGameStats(),
      StorageService.getUnlockedAchievements()
    ]);

    const newlyUnlocked = [];
    let bonusPoints = 0;
    const unlockedRewards = new Set(profile.unlockedRewards || []);

    const ctx = { profile, allStats, lastMatch };

    for (const ach of ACHIEVEMENTS_CATALOG) {
      if (!unlockedMap[ach.id] && ach.check(ctx)) {
        await StorageService.unlockAchievement(ach.id, {
          title: ach.title,
          rewardPoints: ach.rewardPoints
        });
        newlyUnlocked.push(ach);
        bonusPoints += ach.rewardPoints || 0;
        if (ach.unlocksReward) {
          unlockedRewards.add(ach.unlocksReward);
        }
      }
    }

    // Desbloquear cosméticos basados en puntos totales
    const totalPointsAfter = (profile.totalGlobalPoints || 0) + bonusPoints;
    for (const item of [
      ...APP_CONFIG.themes,
      ...APP_CONFIG.avatars,
      ...APP_CONFIG.frames,
      ...APP_CONFIG.backgrounds
    ]) {
      if (totalPointsAfter >= (item.requiredPoints || 0)) {
        unlockedRewards.add(item.id);
      }
    }

    if (newlyUnlocked.length > 0 || unlockedRewards.size !== (profile.unlockedRewards || []).length) {
      await StorageService.saveProfile({
        ...profile,
        totalGlobalPoints: totalPointsAfter,
        unlockedRewards: Array.from(unlockedRewards)
      });
    }

    for (const ach of newlyUnlocked) {
      this._notify(ach);
    }

    return newlyUnlocked;
  }

  async getAllWithStatus() {
    const unlockedMap = await StorageService.getUnlockedAchievements();
    return ACHIEVEMENTS_CATALOG.map((ach) => ({
      ...ach,
      unlocked: Boolean(unlockedMap[ach.id]),
      unlockedAt: unlockedMap[ach.id]?.unlockedAt || null
    }));
  }
}

export const AchievementService = new AchievementServiceClass();
