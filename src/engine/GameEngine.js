import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { ScoreManager } from './ScoreManager.js';
import { LevelManager } from './LevelManager.js';
import { DifficultyManager } from './DifficultyManager.js';
import { AudioManager } from './AudioManager.js';
import { StorageService } from '../services/StorageService.js';
import { StatisticsService } from '../services/StatisticsService.js';

/**
 * Motor central de ejecución de minijuegos.
 * Gestiona ciclo de vida, Canvas/DOM, ResizeObserver, entradas, pausa, victoria/derrota
 * y liberación estricta de recursos al salir del juego.
 */
export class GameEngine {
  constructor({ stageElement, hudCallbacks = {} }) {
    this.stageElement = stageElement;
    this.hudCallbacks = hudCallbacks;
    this.currentGameMeta = null;
    this.gameInstance = null;
    this.canvas = null;
    this.ctx = null;
    this.domContainer = null;
    this.loop = null;
    this.input = null;
    this.scoreManager = null;
    this.levelManager = null;
    this.difficultyManager = null;
    this.resizeObserver = null;
    this.sessionStartTime = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.logicalWidth = 800;
    this.logicalHeight = 600;
    this._visibilityHandler = null;
    this._mountToken = 0;
  }

  async mountGame(gameMeta) {
    this.destroy();
    const token = ++this._mountToken;
    this.currentGameMeta = gameMeta;
    this.isGameOver = false;
    this.isPaused = false;
    this.sessionStartTime = performance.now();

    this.stageElement.innerHTML = '';

    // Dimensiones lógicas recomendadas según orientación del juego
    if (gameMeta.aspectRatio) {
      this.logicalWidth = gameMeta.aspectRatio.width;
      this.logicalHeight = gameMeta.aspectRatio.height;
    } else if (gameMeta.orientation === 'portrait') {
      this.logicalWidth = 480;
      this.logicalHeight = 720;
    } else {
      this.logicalWidth = 800;
      this.logicalHeight = 560;
    }

    // Crear contenedor responsive inmediatamente sin esperar transacciones de IDB
    this.viewportWrapper = document.createElement('div');
    this.viewportWrapper.className = 'engine-viewport';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'engine-canvas';
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;
    this.ctx = this.canvas.getContext('2d');

    this.domContainer = document.createElement('div');
    this.domContainer.className = 'engine-dom-overlay';

    this.viewportWrapper.appendChild(this.canvas);
    this.viewportWrapper.appendChild(this.domContainer);
    this.stageElement.appendChild(this.viewportWrapper);

    const savedStats = await StorageService.getGameStats(gameMeta.id);
    if (token !== this._mountToken) return;
    StatisticsService.markGameOpened(gameMeta.id).catch(() => {});

    // Inicializar subsistemas
    this.scoreManager = new ScoreManager(savedStats.highScore || 0, (scoreState) => {
      if (this.hudCallbacks.onScoreChange) {
        this.hudCallbacks.onScoreChange(scoreState);
      }
    });

    this.difficultyManager = new DifficultyManager(gameMeta.difficultyConfig || {});

    this.levelManager = new LevelManager({
      baseTarget: gameMeta.baseLevelTarget || 100,
      targetGrowth: gameMeta.levelGrowth || 1.25,
      onLevelUp: (newLevel) => {
        this.difficultyManager.setLevel(newLevel);
        AudioManager.play('levelUp');
        if (this.hudCallbacks.onLevelChange) {
          this.hudCallbacks.onLevelChange(newLevel, this.difficultyManager.getMetrics());
        }
        if (this.gameInstance && typeof this.gameInstance.onLevelUp === 'function') {
          this.gameInstance.onLevelUp(newLevel, this.difficultyManager.getMetrics());
        }
      }
    });

    this.input = new InputManager(
      this.viewportWrapper,
      (evt) => {
        if (evt.type === 'keydown' && !evt.repeat) {
          if (evt.action === 'pause') {
            this.togglePause();
            return;
          }
          if (evt.action === 'restart' && this.isGameOver) {
            this.restart();
            return;
          }
        }
        if (this.isPaused || this.isGameOver) return;
        if (this.hudCallbacks.onFirstInput) {
          this.hudCallbacks.onFirstInput(evt);
        }
        if (this.gameInstance && typeof this.gameInstance.handleInput === 'function') {
          this.gameInstance.handleInput(evt);
        }
      },
      {
        isInteractiveActive: () => !this.isPaused && !this.isGameOver,
        onClear: () => {
          if (this.hudCallbacks.onInputClear) {
            this.hudCallbacks.onInputClear();
          }
        }
      }
    );

    // Instanciar módulo del juego
    const GameClass = await gameMeta.loadModule();
    if (token !== this._mountToken) return;
    this.gameInstance = new GameClass(this._createGameAPI());

    this._setupResizeObserver();
    this._fitViewport();

    // Sincronizar HUD inicial antes de init/start para respetar el estado personalizado del juego
    this.scoreManager._emit();
    if (this.hudCallbacks.onLevelChange) {
      this.hudCallbacks.onLevelChange(this.levelManager.level, this.difficultyManager.getMetrics());
    }

    if (typeof this.gameInstance.init === 'function') {
      await this.gameInstance.init();
    }
    if (typeof this.gameInstance.start === 'function') {
      this.gameInstance.start();
    }

    AudioManager.play('start');
    AudioManager.startMusic(gameMeta.musicTrack || gameMeta.id);

    this.loop = new GameLoop(
      (dt) => {
        if (!this.isPaused && !this.isGameOver && this.gameInstance) {
          if (typeof this.gameInstance.update === 'function') {
            this.gameInstance.update(dt);
          }
        }
      },
      () => {
        if (this.gameInstance && typeof this.gameInstance.render === 'function') {
          this.gameInstance.render(this.ctx);
        }
      }
    );
    this.loop.start();

    this._visibilityHandler = () => {
      if (document.hidden && !this.isPaused && !this.isGameOver) {
        this.pause();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  _createGameAPI() {
    const self = this;
    return {
      get width() {
        return self.logicalWidth;
      },
      get height() {
        return self.logicalHeight;
      },
      canvas: this.canvas,
      ctx: this.ctx,
      domContainer: this.domContainer,
      input: this.input,
      audio: AudioManager,
      score: this.scoreManager,
      level: this.levelManager,
      difficulty: this.difficultyManager,
      addScore: (pts, applyDifficultyMultiplier = true) => {
        const mult = applyDifficultyMultiplier
          ? this.difficultyManager.getMetrics().scoreMultiplier
          : 1;
        return this.scoreManager.add(pts, mult);
      },
      setScore: (pts) => this.scoreManager.set(pts),
      advanceProgress: (amount = 1) => this.levelManager.addProgress(amount),
      setLevel: (lvl) => {
        this.levelManager.setLevel(lvl);
        const metrics = this.difficultyManager.setLevel(lvl);
        if (this.hudCallbacks.onLevelChange) {
          this.hudCallbacks.onLevelChange(lvl, metrics);
        }
      },
      getDifficulty: () => this.difficultyManager.getMetrics(),
      updateStatusText: (text) => {
        if (this.hudCallbacks.onStatusText) {
          this.hudCallbacks.onStatusText(text);
        }
      },
      triggerGameOver: (options = {}) => {
        this.handleGameOver(options);
      }
    };
  }

  _setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this._fitViewport();
      });
      this.resizeObserver.observe(this.stageElement);
    }
    this._windowResizeListener = () => this._fitViewport();
    window.addEventListener('resize', this._windowResizeListener);
    window.addEventListener('orientationchange', this._windowResizeListener);
  }

  _fitViewport() {
    if (!this.stageElement || !this.viewportWrapper || !this.canvas) return;
    const rect = this.stageElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const availW = Math.max(120, rect.width - 8);
    const availH = Math.max(120, rect.height - 8);
    const targetRatio = this.logicalWidth / this.logicalHeight;
    const currentRatio = availW / availH;

    let displayW;
    let displayH;
    if (currentRatio > targetRatio) {
      displayH = availH;
      displayW = Math.floor(displayH * targetRatio);
    } else {
      displayW = availW;
      displayH = Math.floor(displayW / targetRatio);
    }

    this.viewportWrapper.style.width = `${displayW}px`;
    this.viewportWrapper.style.height = `${displayH}px`;

    if (this.gameInstance && typeof this.gameInstance.onResize === 'function') {
      this.gameInstance.onResize(displayW, displayH);
    }
  }

  pause() {
    if (this.isGameOver || this.isPaused) return;
    this.isPaused = true;
    this.input?.clearAll();
    AudioManager.pauseMusic();
    if (this.loop) this.loop.pause();
    if (this.gameInstance && typeof this.gameInstance.pause === 'function') {
      this.gameInstance.pause();
    }
    if (this.hudCallbacks.onPauseChange) {
      this.hudCallbacks.onPauseChange(true);
    }
  }

  resume() {
    if (this.isGameOver || !this.isPaused) return;
    this.isPaused = false;
    this.input?.clearAll();
    AudioManager.resumeMusic();
    if (this.loop) this.loop.resume();
    if (this.gameInstance && typeof this.gameInstance.resume === 'function') {
      this.gameInstance.resume();
    }
    if (this.hudCallbacks.onPauseChange) {
      this.hudCallbacks.onPauseChange(false);
    }
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  restart() {
    if (!this.gameInstance) return;
    this.isGameOver = false;
    this.isPaused = false;
    this.input?.clearAll();
    this.sessionStartTime = performance.now();
    this.scoreManager.reset(this.scoreManager.highScore);
    this.levelManager.reset();
    this.difficultyManager.setLevel(1);

    if (this.hudCallbacks.onLevelChange) {
      this.hudCallbacks.onLevelChange(1, this.difficultyManager.getMetrics());
    }
    if (this.hudCallbacks.onPauseChange) {
      this.hudCallbacks.onPauseChange(false);
    }
    if (this.hudCallbacks.onRestart) {
      this.hudCallbacks.onRestart();
    }

    if (typeof this.gameInstance.restart === 'function') {
      this.gameInstance.restart();
    } else if (typeof this.gameInstance.start === 'function') {
      this.gameInstance.start();
    }

    AudioManager.play('start');
    AudioManager.startMusic(this.currentGameMeta?.musicTrack || this.currentGameMeta?.id);
    if (this.loop) {
      this.loop.resume();
    }
  }

  async handleGameOver(options = {}) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.input?.clearAll();
    if (this.loop) {
      this.loop.pause();
    }
    AudioManager.pauseMusic();
    AudioManager.play(options.won ? 'levelUp' : 'gameOver');

    const durationSeconds = Math.max(1, Math.round((performance.now() - this.sessionStartTime) / 1000));
    const finalScore = typeof options.score === 'number' ? options.score : this.scoreManager.score;
    const finalLevel = typeof options.level === 'number' ? options.level : this.levelManager.level;

    const summary = await StatisticsService.recordMatchResult({
      gameId: this.currentGameMeta.id,
      score: finalScore,
      level: finalLevel,
      durationSeconds,
      won: Boolean(options.won),
      bestTimeMs: options.bestTimeMs || null
    });

    this.scoreManager.highScore = Math.max(this.scoreManager.highScore, summary.highScore);

    if (this.hudCallbacks.onGameOver) {
      this.hudCallbacks.onGameOver({
        ...summary,
        reason: options.reason || 'Fin de la partida',
        extraStats: options.extraStats || null
      });
    }
  }

  destroy() {
    this._mountToken++;
    AudioManager.stopMusic();
    if (this.loop) {
      this.loop.stop();
      this.loop = null;
    }
    if (this.input) {
      this.input.destroy();
      this.input = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this._windowResizeListener) {
      window.removeEventListener('resize', this._windowResizeListener);
      window.removeEventListener('orientationchange', this._windowResizeListener);
      this._windowResizeListener = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this.gameInstance && typeof this.gameInstance.destroy === 'function') {
      try {
        this.gameInstance.destroy();
      } catch {
        // ignore cleanup error
      }
    }
    this.gameInstance = null;
    if (this.stageElement) {
      this.stageElement.innerHTML = '';
    }
  }
}
