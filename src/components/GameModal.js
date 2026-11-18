import { GameEngine } from '../engine/GameEngine.js';
import { AudioManager } from '../engine/AudioManager.js';
import { createScoreDisplay } from './ScoreDisplay.js';
import { createPauseMenu } from './PauseMenu.js';
import { createGameOverScreen } from './GameOverScreen.js';

/**
 * Vista de ejecución del videojuego a pantalla completa / modal.
 * Incluye HUD minimalista, botones de pausa/reinicio/biblioteca/pantalla completa,
 * controles táctiles multitáctiles específicos por género, guía inicial adaptada al dispositivo
 * y superposiciones de Pausa y Derrota.
 */
export class GameModal {
  constructor({ onExit, onSwitchRandomGame }) {
    this.onExit = onExit;
    this.onSwitchRandomGame = onSwitchRandomGame;
    this.root = null;
    this.engine = null;
    this.currentGameMeta = null;
    this._resetTouchVisuals = null;
    this._hintTimer = null;
    this._hintEl = null;
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

    // Indicación no bloqueante de controles adaptada a escritorio o móvil
    const hintBanner = document.createElement('div');
    hintBanner.className = 'controls-onboarding-banner';
    hintBanner.setAttribute('aria-hidden', 'true');
    const orientTip =
      gameMeta.orientation === 'landscape'
        ? '<span class="hint-orient-tip">↻ Se recomienda orientación horizontal</span>'
        : gameMeta.orientation === 'portrait'
        ? '<span class="hint-orient-tip hint-orient-portrait">📱 Orientación vertical óptima</span>'
        : '';
    hintBanner.innerHTML = `
      <span class="hint-desktop">💻 ${gameMeta.controls?.desktop || 'Flechas / WASD + Espacio'}</span>
      <span class="hint-mobile">📱 ${gameMeta.controls?.mobile || 'Controles táctiles en pantalla'}</span>
      ${orientTip}
    `;
    this._hintEl = hintBanner;

    // Controles táctiles contextuales para dispositivos móviles y tablets
    const touchPad = this._createTouchControls(gameMeta);

    const blurActive = () => {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
      }
    };

    // Menú de Pausa y Pantalla de Derrota
    const pauseMenu = createPauseMenu({
      gameMeta,
      onResume: () => {
        blurActive();
        this.engine?.resume();
      },
      onRestart: () => {
        blurActive();
        pauseMenu.hide();
        this.engine?.restart();
      },
      onExit: () => this.handleExit()
    });

    const gameOverScreen = createGameOverScreen({
      onPlayAgain: () => {
        blurActive();
        this.engine?.restart();
      },
      onBackToMenu: () => this.handleExit(),
      onPlayAnother: () => {
        blurActive();
        if (this.onSwitchRandomGame) {
          this.onSwitchRandomGame(gameMeta.id);
        }
      }
    });

    this.root.appendChild(topHud);
    this.root.appendChild(stageArea);
    stageArea.appendChild(hintBanner);
    if (touchPad) {
      this.root.appendChild(touchPad);
    }
    this.root.appendChild(pauseMenu.element);
    this.root.appendChild(gameOverScreen.element);

    document.body.appendChild(this.root);
    document.body.classList.add('in-game-lock');

    const dismissHint = () => {
      if (this._hintEl) {
        this._hintEl.classList.add('fade-out');
      }
      if (this._hintTimer) {
        clearTimeout(this._hintTimer);
        this._hintTimer = null;
      }
    };
    this._hintTimer = setTimeout(dismissHint, 4200);

    // Instanciar motor y montar juego
    this.engine = new GameEngine({
      stageElement: stageArea,
      hudCallbacks: {
        onScoreChange: (s) => scoreDisplay.updateScore(s),
        onLevelChange: (lvl, metrics) => scoreDisplay.updateLevel(lvl, metrics),
        onStatusText: (txt) => scoreDisplay.updateStatusText(txt),
        onFirstInput: () => dismissHint(),
        onInputClear: () => {
          if (this._resetTouchVisuals) this._resetTouchVisuals();
        },
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

    // Eventos del HUD (con blur() para no secuestrar Espacio / Enter)
    topHud.querySelector('#hud-exit-btn').addEventListener('click', () => this.handleExit());
    topHud.querySelector('#hud-restart-btn').addEventListener('click', () => {
      blurActive();
      this.engine?.restart();
    });
    topHud.querySelector('#hud-pause-btn').addEventListener('click', () => {
      blurActive();
      this.engine?.togglePause();
    });

    const musicBtn = topHud.querySelector('#hud-music-btn');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        blurActive();
        AudioManager.setMusicEnabled(!AudioManager.musicEnabled);
        musicBtn.textContent = AudioManager.musicEnabled ? '🎵' : '🎶✕';
      });
    }

    const muteBtn = topHud.querySelector('#hud-mute-btn');
    muteBtn.addEventListener('click', () => {
      blurActive();
      AudioManager.setSoundEnabled(!AudioManager.soundEnabled);
      muteBtn.textContent = AudioManager.soundEnabled ? '🔊' : '🔇';
    });

    const fsBtn = topHud.querySelector('#hud-fullscreen-btn');
    fsBtn.addEventListener('click', () => {
      blurActive();
      if (!document.fullscreenElement) {
        this.root.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    await this.engine.mountGame(gameMeta);
    // Reinsertar el banner tras montar el canvas para que siempre quede encima del escenario
    if (hintBanner.parentNode !== stageArea) {
      stageArea.appendChild(hintBanner);
    } else {
      stageArea.appendChild(hintBanner);
    }
  }

  _createTouchControls(gameMeta) {
    const layout = gameMeta.touchLayout || 'dpad';
    if (layout === 'board') {
      this._resetTouchVisuals = null;
      return null;
    }

    const bar = document.createElement('div');
    bar.className = `touch-controls-bar layout-${layout}`;
    const btnStates = [];
    let joystickReset = null;
    let sliderReset = null;

    const bindBtn = (btn, action) => {
      const activeIds = new Set();
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pid = e.pointerId ?? 'mouse';
        if (activeIds.has(pid)) return;
        activeIds.add(pid);
        try {
          btn.setPointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
        btn.classList.add('pressed');
        this.engine?.input?.triggerVirtual(action, true, `btn:${action}:${pid}`);
      };
      const release = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pid = e.pointerId ?? 'mouse';
        if (!activeIds.has(pid)) return;
        activeIds.delete(pid);
        try {
          if (btn.hasPointerCapture?.(e.pointerId)) {
            btn.releasePointerCapture?.(e.pointerId);
          }
        } catch {
          // ignore
        }
        if (activeIds.size === 0) {
          btn.classList.remove('pressed');
        }
        this.engine?.input?.triggerVirtual(action, false, `btn:${action}:${pid}`);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);

      btnStates.push(() => {
        activeIds.clear();
        btn.classList.remove('pressed');
      });
    };

    if (layout === 'dpad') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn" data-act="up" aria-label="Arriba">▲</button>
            <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Abajo">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn action-pill" data-act="action">💣 BOMBA</button>
        </div>
      `;
    } else if (layout === 'dpad-only') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster dpad-centered">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn" data-act="up" aria-label="Arriba">▲</button>
            <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Abajo">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
      `;
    } else if (layout === 'dpad-undo') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn" data-act="up" aria-label="Arriba">▲</button>
            <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Abajo">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">↩ DESHACER</button>
        </div>
      `;
    } else if (layout === 'platform-action') {
      const isWestern = gameMeta.id === 'sunsetriders';
      const secLabel = isWestern ? '⚡ BARRER' : '💣 GRANADA';
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn compact-vert" data-act="up" aria-label="Apuntar Arriba">▲</button>
            <button type="button" class="touch-btn dir-btn compact-vert" data-act="down" aria-label="Agachar / Bajar">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">${secLabel}</button>
          <button type="button" class="touch-btn jump-pill" data-act="jump">🦘 SALTAR</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">🔥 DISPARO</button>
        </div>
      `;
    } else if (layout === 'platform-climb') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn" data-act="up" aria-label="Subir escalera">▲</button>
            <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Bajar escalera">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn action-pill" data-act="jump">🦘 SALTAR</button>
        </div>
      `;
    } else if (layout === 'joystick-dual') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <div class="touch-joystick-pad" role="application" aria-label="Joystick de movimiento">
            <div class="touch-joystick-ring"></div>
            <div class="touch-joystick-knob"></div>
          </div>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">⚡ NOVA</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">🔥 FUEGO</button>
        </div>
      `;

      const joyPad = bar.querySelector('.touch-joystick-pad');
      const joyKnob = bar.querySelector('.touch-joystick-knob');
      let joyPointerId = null;

      const updateJoystick = (clientX, clientY) => {
        const rect = joyPad.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = Math.max(18, rect.width * 0.36);
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.engine?.input?.setAnalog(dx / maxR, dy / maxR);
      };

      const releaseJoystick = (e) => {
        if (joyPointerId === null || (e && e.pointerId !== undefined && e.pointerId !== joyPointerId)) return;
        try {
          if (joyPad.hasPointerCapture?.(joyPointerId)) {
            joyPad.releasePointerCapture?.(joyPointerId);
          }
        } catch {
          // ignore
        }
        joyPointerId = null;
        joyPad.classList.remove('active');
        joyKnob.style.transform = 'translate(0px, 0px)';
        this.engine?.input?.setAnalog(0, 0);
      };

      joyPad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        joyPointerId = e.pointerId ?? 1;
        try {
          joyPad.setPointerCapture?.(joyPointerId);
        } catch {
          // ignore
        }
        joyPad.classList.add('active');
        updateJoystick(e.clientX, e.clientY);
      });
      joyPad.addEventListener('pointermove', (e) => {
        if (joyPointerId === null || (e.pointerId ?? 1) !== joyPointerId) return;
        e.preventDefault();
        updateJoystick(e.clientX, e.clientY);
      });
      joyPad.addEventListener('pointerup', releaseJoystick);
      joyPad.addEventListener('pointercancel', releaseJoystick);
      joyPad.addEventListener('lostpointercapture', releaseJoystick);

      joystickReset = () => {
        joyPointerId = null;
        joyPad.classList.remove('active');
        joyKnob.style.transform = 'translate(0px, 0px)';
      };
    } else if (layout === 'dpad-dual') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn dir-btn" data-act="up" aria-label="Arriba / Saltar">▲</button>
            <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Abajo / Agachar">▼</button>
          </div>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
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
          <button type="button" class="touch-btn" data-act="up">🚀 IMP</button>
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
          <button type="button" class="touch-btn dir-btn" data-act="left" aria-label="Izquierda">◀</button>
          <button type="button" class="touch-btn dir-btn" data-act="down" aria-label="Bajar rápido">▼</button>
          <button type="button" class="touch-btn dir-btn" data-act="right" aria-label="Derecha">▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">HOLD</button>
          <button type="button" class="touch-btn" data-act="up">↻ ROTAR</button>
          <button type="button" class="touch-btn fire-pill" data-act="action">⬇ CAER</button>
        </div>
      `;
    } else if (layout === 'horizontal-paddle') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <button type="button" class="touch-btn wide" data-act="left">◀ IZQ</button>
          <button type="button" class="touch-btn wide" data-act="right">DER ▶</button>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn fire-pill" data-act="action">🚀 LANZAR / LÁSER</button>
        </div>
      `;
    } else if (layout === 'vertical-paddle') {
      bar.innerHTML = `
        <div class="touch-dpad-cluster">
          <div class="touch-vertical-track" role="slider" aria-label="Deslizador vertical de paleta">
            <span class="track-label">DESLIZA ↕</span>
            <div class="touch-vertical-thumb"></div>
          </div>
          <div class="touch-dpad-vert">
            <button type="button" class="touch-btn" data-act="up" aria-label="Subir paleta">▲ SUBIR</button>
            <button type="button" class="touch-btn" data-act="down" aria-label="Bajar paleta">▼ BAJAR</button>
          </div>
        </div>
        <div class="touch-action-cluster">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">MODO</button>
        </div>
      `;

      const track = bar.querySelector('.touch-vertical-track');
      const thumb = bar.querySelector('.touch-vertical-thumb');
      let trackPid = null;

      const updateSlider = (clientY) => {
        const rect = track.getBoundingClientRect();
        if (!rect.height) return;
        const pad = 10;
        const norm = Math.max(0, Math.min(1, (clientY - rect.top - pad) / Math.max(1, rect.height - pad * 2)));
        thumb.style.top = `${Math.round(norm * Math.max(0, rect.height - 26))}px`;
        this.engine?.input?.emitCustom({ type: 'paddletrack', y: norm });
      };

      const endTrack = (e) => {
        if (trackPid === null || (e && e.pointerId !== undefined && e.pointerId !== trackPid)) return;
        try {
          if (track.hasPointerCapture?.(trackPid)) track.releasePointerCapture?.(trackPid);
        } catch {
          // ignore
        }
        trackPid = null;
        track.classList.remove('active');
      };

      track.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        trackPid = e.pointerId ?? 1;
        try {
          track.setPointerCapture?.(trackPid);
        } catch {
          // ignore
        }
        track.classList.add('active');
        updateSlider(e.clientY);
      });
      track.addEventListener('pointermove', (e) => {
        if (trackPid === null || (e.pointerId ?? 1) !== trackPid) return;
        e.preventDefault();
        updateSlider(e.clientY);
      });
      track.addEventListener('pointerup', endTrack);
      track.addEventListener('pointercancel', endTrack);
      track.addEventListener('lostpointercapture', endTrack);

      sliderReset = () => {
        trackPid = null;
        track.classList.remove('active');
      };
    } else if (layout === 'tap-pulse') {
      bar.innerHTML = `
        <div class="touch-single-wrap">
          <button type="button" class="touch-btn secondary-pill" data-act="secondary">✈ NAVE</button>
          <button type="button" class="touch-btn full-tap-btn" data-act="action">⚡ IMPULSAR VUELO</button>
        </div>
      `;
    } else {
      bar.innerHTML = `
        <div class="touch-single-wrap">
          <button type="button" class="touch-btn full-tap-btn" data-act="action">⚡ TOCAR / IMPULSAR</button>
        </div>
      `;
    }

    for (const btn of bar.querySelectorAll('[data-act]')) {
      bindBtn(btn, btn.dataset.act);
    }

    this._resetTouchVisuals = () => {
      for (const fn of btnStates) fn();
      if (joystickReset) joystickReset();
      if (sliderReset) sliderReset();
    };

    return bar;
  }

  handleExit() {
    this.close();
    if (this.onExit) {
      this.onExit();
    }
  }

  close() {
    if (this._hintTimer) {
      clearTimeout(this._hintTimer);
      this._hintTimer = null;
    }
    this._hintEl = null;
    this._resetTouchVisuals = null;

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
