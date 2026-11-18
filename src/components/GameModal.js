import { GameEngine } from '../engine/GameEngine.js';
import { AudioManager } from '../engine/AudioManager.js';
import { createScoreDisplay } from './ScoreDisplay.js';
import { createPauseMenu } from './PauseMenu.js';
import { createGameOverScreen } from './GameOverScreen.js';

/**
 * Vista de ejecución del videojuego a pantalla completa / modal.
 * Incluye HUD minimalista, botones de pausa/reinicio/biblioteca/pantalla completa,
 * controles táctiles contextuales para móviles y superposiciones de Pausa y Derrota.
 */
export class GameModal {
  constructor({ onExit, onSwitchRandomGame }) {
    this.onExit = onExit;
    this.onSwitchRandomGame = onSwitchRandomGame;
    this.root = null;
    this.engine = null;
    this.currentGameMeta = null;
  }

  async open(gameMeta) {
    this.close();
    this.currentGameMeta = gameMeta;

    this.root = document.createElement('section');
    this.root.className = 'game-view-shell';
    this.root.setAttribute('aria-label', `Jugando a ${gameMeta.name}`);

    const scoreDisplay = createScoreDisplay();

    // Barra superior minimalista
    const topHud = document.createElement('header');
    topHud.className = 'game-hud-bar';
    topHud.innerHTML = `
      <div class="hud-left">
        <button type="button" class="hud-btn back-btn" id="hud-exit-btn" title="Volver a la biblioteca">
          ⬅ <span class="hud-btn-text">Biblioteca</span>
        </button>
        <div class="hud-game-title-wrap">
          <strong class="hud-game-title">${gameMeta.name}</strong>
          <span class="hud-controls-hint">${gameMeta.controls?.desktop || ''}</span>
        </div>
      </div>
      <div class="hud-center" id="hud-score-mount"></div>
      <div class="hud-right">
        <button type="button" class="hud-btn" id="hud-music-btn" title="Activar/Desactivar música chiptune" aria-label="Música">
          ${AudioManager.musicEnabled ? '🎵' : '🎶✕'}
        </button>
        <button type="button" class="hud-btn" id="hud-mute-btn" title="Activar/Desactivar efectos de sonido" aria-label="Sonido">
          ${AudioManager.soundEnabled ? '🔊' : '🔇'}
        </button>
        <button type="button" class="hud-btn" id="hud-fullscreen-btn" title="Pantalla completa" aria-label="Pantalla completa">
          ⛶
        </button>
        <button type="button" class="hud-btn" id="hud-restart-btn" title="Reiniciar partida (R)">
          ↻ <span class="hud-btn-text">Reiniciar</span>
        </button>
        <button type="button" class="hud-btn pause-btn" id="hud-pause-btn" title="Pausar (P / Esc)">
          ⏸ <span class="hud-btn-text">Pausa</span>
        </button>
      </div>
    `;
    topHud.querySelector('#hud-score-mount').appendChild(scoreDisplay.element);

    // Escenario central del juego
    const stageArea = document.createElement('div');
    stageArea.className = 'game-stage-area';

    // Controles táctiles contextuales para dispositivos móviles y tablets
    const touchPad = this._createTouchControls(gameMeta);

    // Menú de Pausa y Pantalla de Derrota
    const pauseMenu = createPauseMenu({
      gameMeta,
      onResume: () => this.engine?.resume(),
      onRestart: () => {
        pauseMenu.hide();
        this.engine?.restart();
      },
      onExit: () => this.handleExit()
    });

    const gameOverScreen = createGameOverScreen({
      onPlayAgain: () => this.engine?.restart(),
      onBackToMenu: () => this.handleExit(),
      onPlayAnother: () => {
        if (this.onSwitchRandomGame) {
          this.onSwitchRandomGame(gameMeta.id);
        }
      }
    });

    this.root.appendChild(topHud);
    this.root.appendChild(stageArea);
    if (touchPad) {
      this.root.appendChild(touchPad);
    }
    this.root.appendChild(pauseMenu.element);
    this.root.appendChild(gameOverScreen.element);

    document.body.appendChild(this.root);
    document.body.classList.add('in-game-lock');

    // Instanciar motor y montar juego
    this.engine = new GameEngine({
      stageElement: stageArea,
      hudCallbacks: {
        onScoreChange: (s) => scoreDisplay.updateScore(s),
        onLevelChange: (lvl, metrics) => scoreDisplay.updateLevel(lvl, metrics),
        onStatusText: (txt) => scoreDisplay.updateStatusText(txt),
        onPauseChange: (paused) => {
          const pBtn = topHud.querySelector('#hud-pause-btn');
          if (pBtn) {
            pBtn.innerHTML = paused
              ? '▶ <span class="hud-btn-text">Reanudar</span>'
              : '⏸ <span class="hud-btn-text">Pausa</span>';
          }
          if (paused) {
            pauseMenu.show();
          } else {
            pauseMenu.hide();
          }
        },
        onRestart: () => {
          pauseMenu.hide();
          gameOverScreen.hide();
        },
        onGameOver: (summary) => {
          pauseMenu.hide();
          gameOverScreen.show(summary);
        }
      }
    });

    // Eventos del HUD
    topHud.querySelector('#hud-exit-btn').addEventListener('click', () => this.handleExit());
    topHud.querySelector('#hud-restart-btn').addEventListener('click', () => this.engine?.restart());
    topHud.querySelector('#hud-pause-btn').addEventListener('click', () => this.engine?.togglePause());

    const musicBtn = topHud.querySelector('#hud-music-btn');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        AudioManager.setMusicEnabled(!AudioManager.musicEnabled);
        musicBtn.textContent = AudioManager.musicEnabled ? '🎵' : '🎶✕';
      });
    }

    const muteBtn = topHud.querySelector('#hud-mute-btn');
    muteBtn.addEventListener('click', () => {
      AudioManager.setSoundEnabled(!AudioManager.soundEnabled);
      muteBtn.textContent = AudioManager.soundEnabled ? '🔊' : '🔇';
    });

    const fsBtn = topHud.querySelector('#hud-fullscreen-btn');
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        this.root.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    await this.engine.mountGame(gameMeta);
  }

  _createTouchControls(gameMeta) {
    const layout = gameMeta.touchLayout || 'dpad';
    const bar = document.createElement('div');
    bar.className = `touch-controls-bar layout-${layout}`;

    const bindBtn = (btn, action) => {
      const press = (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this.engine?.input?.triggerVirtual(action, true);
      };
      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        this.engine?.input?.triggerVirtual(action, false);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    };

    if (layout === 'dpad') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn" data-act="up" aria-label="Arriba">▲</button>
            <button type="button" class="touch-btn" data-act="down" aria-label="Abajo">▼</button>
          </div>
          <button type="button" class="touch-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn action-pill" data-act="action">ACCIÓN</button>
        </div>
      `;
    } else if (layout === 'dpad-dual') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn" data-act="up" aria-label="Arriba / Saltar">▲</button>
            <button type="button" class="touch-btn" data-act="down" aria-label="Abajo / Agachar">▼</button>
          </div>
          <button type="button" class="touch-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">ESP</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">DISPARO</button>
        </div>
      `;
    } else if (layout === 'horizontal-fire') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn wide" data-act="left" aria-label="Izquierda">◀ IZQ</button>
          <button type="button" class="touch-btn wide" data-act="right" aria-label="Derecha">DER ▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn fire-pill" data-act="action">🔥 DISPARAR</button>
        </div>
      `;
    } else if (layout === 'asteroids') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn" data-act="left">↺ ROT</button>
          <button type="button" class="touch-btn" data-act="up">🚀 IMPULSO</button>
          <button type="button" class="touch-btn" data-act="right">ROT ↻</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">⚡ HIPER</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">🔥 FUEGO</button>
        </div>
      `;
    } else if (layout === 'tetris') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn" data-act="left">◀</button>
          <button type="button" class="touch-btn" data-act="down">▼ BAJAR</button>
          <button type="button" class="touch-btn" data-act="right">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">GUARDAR</button>
          <button type="button" class="touch-btn" data-act="up">↻ ROTAR</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">⬇ CAER</button>
        </div>
      `;
    } else if (layout === 'horizontal-paddle') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn wide" data-act="left">◀ MOVER IZQ</button>
          <button type="button" class="touch-btn wide" data-act="right">MOVER DER ▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn fire-pill" data-act="action">🚀 LANZAR / LÁSER</button>
        </div>
      `;
    } else if (layout === 'vertical-paddle') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn wide" data-act="up">▲ SUBIR PALETA</button>
          <button type="button" class="touch-btn wide" data-act="down">▼ BAJAR PALETA</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">MODO</button>
        </div>
      `;
    } else if (layout === 'tap-only') {
      bar.innerHTML = `
        <div class="touch-single-wrap">
          <button type="button" class="touch-btn full-tap-btn" data-act="action">⚡ TOCAR / IMPULSAR</button>
        </div>
      `;
    } else {
      // 'board' para Buscaminas y Memoria (se controlan tocando el propio tablero)
      return null;
    }

    for (const btn of bar.querySelectorAll('[data-act]')) {
      bindBtn(btn, btn.dataset.act);
    }

    return bar;
  }

  handleExit() {
    this.close();
    if (this.onExit) {
      this.onExit();
    }
  }

  close() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    document.body.classList.remove('in-game-lock');
  }
}
