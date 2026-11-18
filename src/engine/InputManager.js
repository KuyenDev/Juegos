/**
 * Gestor unificado de entradas: Teclado, Mouse, Gestos Táctiles (Swipe/Drag/Tap) y Botones Virtuales.
 * Garantiza eliminación total de event listeners en destroy().
 */
export class InputManager {
  constructor(targetElement, onActionCallback = null) {
    this.target = targetElement;
    this.onAction = onActionCallback;
    this.keys = new Set();
    this.virtualKeys = new Set();
    this.pointer = {
      x: 0.5, // normalizado 0..1
      y: 0.5,
      rawX: 0,
      rawY: 0,
      isDown: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0
    };
    this._boundListeners = [];
    this._bindEvents();
  }

  _addListener(el, type, handler, options = false) {
    el.addEventListener(type, handler, options);
    this._boundListeners.push({ el, type, handler, options });
  }

  _mapKeyToAction(code) {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        return 'up';
      case 'ArrowDown':
      case 'KeyS':
        return 'down';
      case 'ArrowLeft':
      case 'KeyA':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
        return 'right';
      case 'Space':
      case 'Enter':
      case 'KeyZ':
        return 'action';
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyC':
      case 'KeyX':
        return 'secondary';
      case 'Escape':
      case 'KeyP':
        return 'pause';
      case 'KeyR':
        return 'restart';
      default:
        return null;
    }
  }

  _bindEvents() {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const action = this._mapKeyToAction(e.code);
      if (action) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        const isRepeat = this.keys.has(action);
        this.keys.add(action);
        this.keys.add(e.code);
        this._emit({
          type: 'keydown',
          action,
          code: e.code,
          repeat: isRepeat
        });
      }
    };

    const onKeyUp = (e) => {
      const action = this._mapKeyToAction(e.code);
      if (action) {
        this.keys.delete(action);
      }
      this.keys.delete(e.code);
      if (action) {
        this._emit({
          type: 'keyup',
          action,
          code: e.code
        });
      }
    };

    this._addListener(window, 'keydown', onKeyDown, { passive: false });
    this._addListener(window, 'keyup', onKeyUp);

    if (!this.target) return;

    const updatePointerCoords = (clientX, clientY) => {
      const rect = this.target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.pointer.rawX = clientX - rect.left;
      this.pointer.rawY = clientY - rect.top;
      this.pointer.x = Math.max(0, Math.min(1, this.pointer.rawX / rect.width));
      this.pointer.y = Math.max(0, Math.min(1, this.pointer.rawY / rect.height));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, a, input, .hud-btn, .touch-btn')) return;
      updatePointerCoords(e.clientX, e.clientY);
      this.pointer.isDown = true;
      this.pointer.startX = e.clientX;
      this.pointer.startY = e.clientY;
      this.pointer.deltaX = 0;
      this.pointer.deltaY = 0;
      this._emit({
        type: 'pointerdown',
        action: 'tap',
        x: this.pointer.x,
        y: this.pointer.y,
        rawX: this.pointer.rawX,
        rawY: this.pointer.rawY,
        button: e.button || 0
      });
    };

    const onPointerMove = (e) => {
      updatePointerCoords(e.clientX, e.clientY);
      if (this.pointer.isDown) {
        this.pointer.deltaX = e.clientX - this.pointer.startX;
        this.pointer.deltaY = e.clientY - this.pointer.startY;
      }
      this._emit({
        type: 'pointermove',
        x: this.pointer.x,
        y: this.pointer.y,
        rawX: this.pointer.rawX,
        rawY: this.pointer.rawY,
        isDown: this.pointer.isDown,
        deltaX: this.pointer.deltaX,
        deltaY: this.pointer.deltaY
      });
    };

    const onPointerUp = (e) => {
      if (!this.pointer.isDown) return;
      this.pointer.isDown = false;
      const dx = e.clientX - this.pointer.startX;
      const dy = e.clientY - this.pointer.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) >= 26) {
        const swipeDir = absX > absY ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this._emit({
          type: 'swipe',
          action: swipeDir,
          direction: swipeDir,
          dx,
          dy
        });
      }

      this._emit({
        type: 'pointerup',
        x: this.pointer.x,
        y: this.pointer.y,
        rawX: this.pointer.rawX,
        rawY: this.pointer.rawY
      });
    };

    this._addListener(this.target, 'pointerdown', onPointerDown);
    this._addListener(window, 'pointermove', onPointerMove);
    this._addListener(window, 'pointerup', onPointerUp);
    this._addListener(this.target, 'contextmenu', (e) => e.preventDefault());
  }

  triggerVirtual(action, isDown = true) {
    if (isDown) {
      this.virtualKeys.add(action);
      this._emit({ type: 'virtualdown', action, repeat: false });
    } else {
      this.virtualKeys.delete(action);
      this._emit({ type: 'virtualup', action });
    }
  }

  isPressed(action) {
    return this.keys.has(action) || this.virtualKeys.has(action);
  }

  _emit(payload) {
    if (typeof this.onAction === 'function') {
      this.onAction(payload);
    }
  }

  destroy() {
    for (const { el, type, handler, options } of this._boundListeners) {
      el.removeEventListener(type, handler, options);
    }
    this._boundListeners = [];
    this.keys.clear();
    this.virtualKeys.clear();
  }
}
