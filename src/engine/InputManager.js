/**
 * Gestor unificado de entradas: Teclado, Mouse, Gestos Táctiles (Swipe/Drag/Tap),
 * Joystick Analógico y Botones Virtuales Multitáctiles.
 * Garantiza eliminación total de event listeners en destroy() y limpieza en clearAll().
 */
export class InputManager {
  constructor(targetElement, onActionCallback = null, options = {}) {
    this.target = targetElement;
    this.onAction = onActionCallback;
    this.onClear = typeof options.onClear === 'function' ? options.onClear : null;
    this.isInteractiveActive =
      typeof options.isInteractiveActive === 'function' ? options.isInteractiveActive : () => true;

    this.keys = new Set();
    this.virtualKeys = new Set();
    this.actionKeySets = new Map();
    this.virtualActionSources = new Map();
    this.activeCanvasPointers = new Map();
    this.analog = { x: 0, y: 0 };

    this.lastInputSource = 'keyboard';
    this.keyboardPriorityUntil = 0;
    this.lastIdleMouse = null;

    this.pointer = {
      x: 0.5, // normalizado 0..1
      y: 0.5,
      rawX: 0,
      rawY: 0,
      isDown: false,
      pointerType: 'mouse',
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

  _mapKeyToAction(code, key = '') {
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
      case 'KeyM':
        return 'mode';
      case 'Escape':
      case 'KeyP':
        return 'pause';
      case 'KeyR':
        return 'restart';
      default:
        break;
    }

    const k = typeof key === 'string' ? key.toLowerCase() : '';
    switch (k) {
      case 'arrowup':
      case 'w':
        return 'up';
      case 'arrowdown':
      case 's':
        return 'down';
      case 'arrowleft':
      case 'a':
        return 'left';
      case 'arrowright':
      case 'd':
        return 'right';
      case ' ':
      case 'spacebar':
      case 'enter':
      case 'z':
        return 'action';
      case 'shift':
      case 'c':
      case 'x':
        return 'secondary';
      case 'm':
        return 'mode';
      case 'escape':
      case 'p':
        return 'pause';
      case 'r':
        return 'restart';
      default:
        return null;
    }
  }

  _syncLegacySets() {
    this.keys.clear();
    for (const [act, set] of this.actionKeySets.entries()) {
      if (set.size > 0) {
        this.keys.add(act);
        for (const tok of set) this.keys.add(tok);
      }
    }
    this.virtualKeys.clear();
    for (const [act, set] of this.virtualActionSources.entries()) {
      if (set.size > 0) this.virtualKeys.add(act);
    }
  }

  _bindEvents() {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const action = this._mapKeyToAction(e.code, e.key);
      if (!action) return;

      // Evitar desplazamiento de ventana o re-activación accidental de botones del HUD con Enter/Espacio durante partida
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      } else if ((e.code === 'Enter' || e.key === 'Enter') && this.isInteractiveActive()) {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
          document.activeElement.blur();
        }
        e.preventDefault();
      }

      const token = e.code || e.key || action;
      let set = this.actionKeySets.get(action);
      if (!set) {
        set = new Set();
        this.actionKeySets.set(action, set);
      }
      const isRepeat = set.has(token) || Boolean(e.repeat);
      set.add(token);
      this._syncLegacySets();

      if (['up', 'down', 'left', 'right', 'action', 'secondary'].includes(action)) {
        this.lastInputSource = 'keyboard';
        this.keyboardPriorityUntil = performance.now() + 900;
      }

      this._emit({
        type: 'keydown',
        action,
        code: e.code || e.key,
        key: e.key,
        repeat: isRepeat
      });
    };

    const onKeyUp = (e) => {
      const action = this._mapKeyToAction(e.code, e.key);
      if (!action) return;
      const token = e.code || e.key || action;
      const set = this.actionKeySets.get(action);
      if (set) {
        set.delete(token);
        if (set.size === 0) {
          this.actionKeySets.delete(action);
        }
      }
      this._syncLegacySets();

      this._emit({
        type: 'keyup',
        action,
        code: e.code || e.key,
        key: e.key
      });
    };

    const onBlur = () => {
      this.clearAll();
    };

    this._addListener(window, 'keydown', onKeyDown, { passive: false });
    this._addListener(window, 'keyup', onKeyUp);
    this._addListener(window, 'blur', onBlur);

    if (!this.target) return;

    const computeCoords = (clientX, clientY) => {
      const rect = this.target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return { rawX: 0, rawY: 0, x: 0.5, y: 0.5, insideTarget: false, width: 1, height: 1 };
      }
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const insideTarget =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      return {
        rawX,
        rawY,
        x: Math.max(0, Math.min(1, rawX / rect.width)),
        y: Math.max(0, Math.min(1, rawY / rect.height)),
        insideTarget,
        width: rect.width,
        height: rect.height
      };
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, a, input, .hud-btn, .touch-btn, .touch-controls-bar')) return;
      if (typeof e.preventDefault === 'function' && e.pointerType !== 'mouse') {
        e.preventDefault();
      }
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
      }

      const coords = computeCoords(e.clientX, e.clientY);
      const pid = e.pointerId ?? 1;
      try {
        this.target.setPointerCapture?.(pid);
      } catch {
        // ignore synthetic pointerId failures
      }

      this.activeCanvasPointers.set(pid, {
        x: coords.x,
        y: coords.y,
        rawX: coords.rawX,
        rawY: coords.rawY,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        pointerType: e.pointerType || 'mouse',
        button: e.button || 0,
        swipeFired: false
      });

      this.pointer.rawX = coords.rawX;
      this.pointer.rawY = coords.rawY;
      this.pointer.x = coords.x;
      this.pointer.y = coords.y;
      this.pointer.isDown = true;
      this.pointer.pointerType = e.pointerType || 'mouse';
      this.pointer.startX = e.clientX;
      this.pointer.startY = e.clientY;
      this.pointer.deltaX = 0;
      this.pointer.deltaY = 0;
      this.lastInputSource = 'pointer';
      this.keyboardPriorityUntil = 0;

      this._emit({
        type: 'pointerdown',
        action: 'tap',
        pointerId: pid,
        pointerType: this.pointer.pointerType,
        insideTarget: coords.insideTarget,
        x: coords.x,
        y: coords.y,
        rawX: coords.rawX,
        rawY: coords.rawY,
        button: e.button || 0
      });
    };

    const onPointerMove = (e) => {
      const coords = computeCoords(e.clientX, e.clientY);
      const pid = e.pointerId ?? 1;
      const tracked = this.activeCanvasPointers.get(pid);
      const pType = e.pointerType || (tracked ? tracked.pointerType : 'mouse');

      if (tracked) {
        const dxFrame = (e.clientX - tracked.lastX) / coords.width;
        const dyFrame = (e.clientY - tracked.lastY) / coords.height;
        const deltaX = e.clientX - tracked.startX;
        const deltaY = e.clientY - tracked.startY;
        tracked.lastX = e.clientX;
        tracked.lastY = e.clientY;
        tracked.x = coords.x;
        tracked.y = coords.y;

        this.pointer.rawX = coords.rawX;
        this.pointer.rawY = coords.rawY;
        this.pointer.x = coords.x;
        this.pointer.y = coords.y;
        this.pointer.isDown = true;
        this.pointer.pointerType = pType;
        this.pointer.deltaX = deltaX;
        this.pointer.deltaY = deltaY;
        this.lastInputSource = 'pointer';

        if (!tracked.swipeFired && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 24) {
          tracked.swipeFired = true;
          const swipeDir =
            Math.abs(deltaX) > Math.abs(deltaY)
              ? deltaX > 0
                ? 'right'
                : 'left'
              : deltaY > 0
              ? 'down'
              : 'up';
          this._emit({
            type: 'swipe',
            action: swipeDir,
            direction: swipeDir,
            dx: deltaX,
            dy: deltaY
          });
        }

        this._emit({
          type: 'pointermove',
          pointerId: pid,
          pointerType: pType,
          insideTarget: coords.insideTarget,
          moved: true,
          x: coords.x,
          y: coords.y,
          rawX: coords.rawX,
          rawY: coords.rawY,
          dxNorm: dxFrame,
          dyNorm: dyFrame,
          isDown: true,
          deltaX,
          deltaY
        });
        return;
      }

      // Hover pasivo con mouse: solo actualizar cuando está dentro del canvas y no hay prioridad de teclado activa
      if (this.activeCanvasPointers.size === 0 && pType === 'mouse' && coords.insideTarget) {
        const prev = this.lastIdleMouse;
        const dist = prev ? Math.hypot(e.clientX - prev.x, e.clientY - prev.y) : 99;
        this.lastIdleMouse = { x: e.clientX, y: e.clientY };

        const now = performance.now();
        if (now < this.keyboardPriorityUntil && dist < 10) {
          return;
        }
        if (dist < 2.5) {
          return;
        }
        this.keyboardPriorityUntil = 0;
        this.lastInputSource = 'pointer';
        this.pointer.rawX = coords.rawX;
        this.pointer.rawY = coords.rawY;
        this.pointer.x = coords.x;
        this.pointer.y = coords.y;
        this.pointer.pointerType = 'mouse';

        this._emit({
          type: 'pointermove',
          pointerId: pid,
          pointerType: 'mouse',
          insideTarget: true,
          moved: true,
          x: coords.x,
          y: coords.y,
          rawX: coords.rawX,
          rawY: coords.rawY,
          dxNorm: 0,
          dyNorm: 0,
          isDown: false,
          deltaX: 0,
          deltaY: 0
        });
      }
    };

    const releasePointer = (e, canceled = false) => {
      const pid = e.pointerId ?? 1;
      const tracked = this.activeCanvasPointers.get(pid);
      if (!tracked) return;

      this.activeCanvasPointers.delete(pid);
      try {
        if (this.target.hasPointerCapture?.(pid)) {
          this.target.releasePointerCapture?.(pid);
        }
      } catch {
        // ignore
      }

      const coords = computeCoords(e.clientX ?? tracked.lastX, e.clientY ?? tracked.lastY);
      const dx = (e.clientX ?? tracked.lastX) - tracked.startX;
      const dy = (e.clientY ?? tracked.lastY) - tracked.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dragDistance = Math.hypot(dx, dy);

      this.pointer.isDown = this.activeCanvasPointers.size > 0;
      this.pointer.rawX = coords.rawX;
      this.pointer.rawY = coords.rawY;
      this.pointer.x = coords.x;
      this.pointer.y = coords.y;

      if (!canceled && !tracked.swipeFired && Math.max(absX, absY) >= 24) {
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
        pointerId: pid,
        pointerType: tracked.pointerType,
        canceled,
        dragDistance,
        x: coords.x,
        y: coords.y,
        rawX: coords.rawX,
        rawY: coords.rawY
      });
    };

    this._addListener(this.target, 'pointerdown', onPointerDown);
    this._addListener(window, 'pointermove', onPointerMove);
    this._addListener(window, 'pointerup', (e) => releasePointer(e, false));
    this._addListener(window, 'pointercancel', (e) => releasePointer(e, true));
    this._addListener(this.target, 'lostpointercapture', (e) => releasePointer(e, true));
    this._addListener(this.target, 'contextmenu', (e) => e.preventDefault());
  }

  triggerVirtual(action, isDown = true, sourceId = 'default') {
    let set = this.virtualActionSources.get(action);
    if (isDown) {
      if (!set) {
        set = new Set();
        this.virtualActionSources.set(action, set);
      }
      const alreadyPressed = set.size > 0;
      set.add(sourceId);
      this._syncLegacySets();
      if (!alreadyPressed) {
        this.keyboardPriorityUntil = 0;
        this._emit({ type: 'virtualdown', action, repeat: false, sourceId });
      }
    } else {
      if (set) {
        set.delete(sourceId);
        if (set.size === 0) {
          this.virtualActionSources.delete(action);
        }
      }
      this._syncLegacySets();
      if (!set || set.size === 0) {
        this._emit({ type: 'virtualup', action, sourceId });
      }
    }
  }

  setAnalog(ax = 0, ay = 0) {
    const mag = Math.hypot(ax, ay);
    if (mag > 1) {
      this.analog.x = ax / mag;
      this.analog.y = ay / mag;
    } else {
      this.analog.x = Math.abs(ax) < 0.08 ? 0 : ax;
      this.analog.y = Math.abs(ay) < 0.08 ? 0 : ay;
    }
  }

  emitCustom(payload) {
    this._emit(payload);
  }

  isCanvasDragging() {
    return this.activeCanvasPointers.size > 0;
  }

  isPressed(action) {
    const kSet = this.actionKeySets.get(action);
    const vSet = this.virtualActionSources.get(action);
    return Boolean((kSet && kSet.size > 0) || (vSet && vSet.size > 0));
  }

  clearAll() {
    this.actionKeySets.clear();
    this.virtualActionSources.clear();
    this.activeCanvasPointers.clear();
    this.analog.x = 0;
    this.analog.y = 0;
    this.pointer.isDown = false;
    this._syncLegacySets();
    if (this.onClear) {
      this.onClear();
    }
  }

  _emit(payload) {
    if (typeof this.onAction === 'function') {
      this.onAction(payload);
    }
  }

  destroy() {
    this.clearAll();
    for (const { el, type, handler, options } of this._boundListeners) {
      el.removeEventListener(type, handler, options);
    }
    this._boundListeners = [];
  }
}
