#!/usr/bin/env python3
"""
Auditoría interactiva completa de controles, multi-touch, ciclo de vida y UX responsive
para ARCADE INFINITO (Pruebas A-F de la Sección 12) ejecutada sobre WebKit2 4.1 real.
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


def ensure_server(port=8080):
    url = f"http://localhost:{port}/"
    try:
        with urllib.request.urlopen(url, timeout=3) as r:
            assert r.status == 200
    except Exception as e:
        raise RuntimeError(f"Servidor HTTP no accesible en {url}: {e}")


def run_webkit_js_test(port, url_path, js_code, initial_size=(1366, 768), timeout_s=45):
    os.environ["WEBKIT_DISABLE_COMPOSITING_MODE"] = "1"
    import gi
    gi.require_version("Gtk", "3.0")
    gi.require_version("WebKit2", "4.1")
    from gi.repository import Gtk, WebKit2, GLib

    loop = GLib.MainLoop()
    win = Gtk.OffscreenWindow()
    win.set_default_size(*initial_size)
    ctx = WebKit2.WebContext.new_ephemeral()
    webview = WebKit2.WebView.new_with_context(ctx)
    settings = webview.get_settings()
    settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
    win.add(webview)
    win.show_all()

    holder = {"result": None, "timed_out": False}

    def eval_sync(script):
        box = {}
        def cb(v, r, _):
            try:
                box["val"] = v.run_javascript_finish(r).get_js_value().to_string()
            except Exception as err:
                box["err"] = str(err)
        webview.run_javascript(script, None, cb, None)
        while "val" not in box and "err" not in box:
            Gtk.main_iteration()
        if "err" in box:
            raise RuntimeError(f"JS error: {box['err']}")
        return box["val"]

    def poll():
        webview.run_javascript("window.__auditResult || ''", None, on_poll, None)
        return False

    def on_poll(view, res, _):
        try:
            val = view.run_javascript_finish(res).get_js_value().to_string()
        except Exception as err:
            holder["result"] = {"ok": False, "error": str(err)}
            loop.quit()
            return
        if val:
            holder["result"] = json.loads(val)
            loop.quit()
        elif not holder["timed_out"]:
            GLib.timeout_add(120, poll)

    def start_test():
        webview.run_javascript(js_code, None, None, None)
        GLib.timeout_add(120, poll)
        return False

    def on_load(view, event):
        if event == WebKit2.LoadEvent.FINISHED:
            GLib.timeout_add(350, start_test)

    def on_timeout():
        holder["timed_out"] = True
        try:
            st = eval_sync("window.__auditStage || 'unknown'")
        except Exception:
            st = "eval-failed"
        holder["result"] = {"ok": False, "error": f"Timeout after {timeout_s}s at stage={st}"}
        loop.quit()
        return False

    webview.connect("load-changed", on_load)
    webview.load_uri(f"http://localhost:{port}{url_path}")
    tid = GLib.timeout_add_seconds(timeout_s, on_timeout)
    loop.run()
    GLib.source_remove(tid) if not holder["timed_out"] else None
    win.destroy()
    while Gtk.events_pending():
        Gtk.main_iteration()
    return holder["result"]


def run_responsive_probe(port=8080):
    """
    Prueba F: Verifica las 8 resoluciones de referencia + 2 horizontales móviles
    directamente sobre un WebKit2.WebView en Gtk.Fixed (redimensionado exacto en ancho/alto)
    + prueba rotación dinámica 390x844 -> 844x390 e interacción táctil DOM real en móvil.
    """
    os.environ["WEBKIT_DISABLE_COMPOSITING_MODE"] = "1"
    import gi
    import time
    gi.require_version("Gtk", "3.0")
    gi.require_version("WebKit2", "4.1")
    from gi.repository import Gtk, WebKit2, GLib

    resolutions = [
        (320, 568),
        (360, 800),
        (390, 844),
        (430, 932),
        (768, 1024),
        (1024, 768),
        (1366, 768),
        (1920, 1080),
        (568, 320),  # landscape movil compacto
        (844, 390),  # landscape movil estandar
    ]
    games_to_probe = ["pong", "metalslug", "shmup", "donkeykong", "tetris"]

    report = {"resolutions": {}, "mobileDomTouch": None, "orientationPreserve": None, "errors": []}
    ctx = WebKit2.WebContext.new_ephemeral()
    loop = GLib.MainLoop()
    win = Gtk.OffscreenWindow()
    win.set_default_size(1920, 1080)
    fixed = Gtk.Fixed()
    webview = WebKit2.WebView.new_with_context(ctx)
    settings = webview.get_settings()
    settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
    webview.set_size_request(390, 844)
    fixed.put(webview, 0, 0)
    win.add(fixed)
    win.show_all()

    def eval_sync(script):
        box = {}
        def cb(v, r, _):
            try:
                box["val"] = v.run_javascript_finish(r).get_js_value().to_string()
            except Exception as err:
                box["err"] = str(err)
        webview.run_javascript(script, None, cb, None)
        while "val" not in box and "err" not in box:
            Gtk.main_iteration()
        if "err" in box:
            raise RuntimeError(f"eval_sync error: {box['err']}")
        return box["val"]

    def pump(ms=80):
        done = {"ok": False}
        GLib.timeout_add(ms, lambda: (done.__setitem__("ok", True), False)[-1])
        while not done["ok"]:
            Gtk.main_iteration()

    def wait_js(expr, timeout_ms=3000):
        deadline = time.monotonic() + timeout_ms / 1000.0
        while time.monotonic() < deadline:
            if eval_sync(f"Boolean({expr}) ? '1' : '0'") == "1":
                return True
            pump(25)
        return False

    def set_viewport(rw, rh):
        webview.set_size_request(rw, rh)
        while Gtk.events_pending():
            Gtk.main_iteration()
        pump(120)

    def execute():
        try:
            pump(250)
            wait_js("document.querySelectorAll('.game-card').length === 17", 3000)
            eval_sync("""
              window.__respErrs = [];
              window.addEventListener('error', e => window.__respErrs.push(String(e.error || e.message)));
              window.addEventListener('unhandledrejection', e => window.__respErrs.push(String(e.reason)));
              'ok';
            """)

            for gid in games_to_probe:
                set_viewport(390, 844)
                eval_sync(f"document.querySelector('.game-card[data-game-id=\"{gid}\"]').click(); 'clicked';")
                wait_js("document.querySelector('.engine-canvas') && document.querySelector('.game-stage-area .controls-onboarding-banner')", 3000)
                pump(100)
                for (rw, rh) in resolutions:
                    set_viewport(rw, rh)
                    raw = eval_sync("""
                    (() => {
                      const doc = document.documentElement;
                      const shell = document.querySelector('.game-view-shell');
                      const canvas = document.querySelector('.engine-canvas');
                      const bar = document.querySelector('.touch-controls-bar');
                      const barStyle = bar ? getComputedStyle(bar) : null;
                      const barVisible = Boolean(bar && barStyle.display !== 'none');
                      const touchBtns = Array.from(document.querySelectorAll('.touch-btn, .touch-joystick-pad, .touch-vertical-track'))
                        .filter(el => {
                          const s = getComputedStyle(el);
                          return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
                        })
                        .map(el => {
                          const r = el.getBoundingClientRect();
                          let role = 'dir';
                          if (el.classList.contains('action-pill') || el.classList.contains('fire-pill') || el.classList.contains('jump-pill') || el.classList.contains('full-tap-btn') || el.classList.contains('wide')) role = 'primary';
                          else if (el.classList.contains('secondary-pill')) role = 'secondary';
                          else if (el.classList.contains('compact-vert')) role = 'compact';
                          else if (el.classList.contains('touch-joystick-pad') || el.classList.contains('touch-vertical-track')) role = 'analog';
                          return {
                            cls: el.className,
                            act: el.dataset.act || '',
                            role,
                            x: r.left, y: r.top, w: r.width, h: r.height,
                            right: r.right, bottom: r.bottom
                          };
                        });

                      let overlaps = [];
                      for (let i = 0; i < touchBtns.length; i++) {
                        for (let j = i + 1; j < touchBtns.length; j++) {
                          const a = touchBtns[i], b = touchBtns[j];
                          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
                          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
                          if (ix > 2 && iy > 2) overlaps.push([a.act || a.cls, b.act || b.cls, ix, iy]);
                        }
                      }

                      const outOfBounds = touchBtns.filter(b =>
                        b.x < -1 || b.y < -1 || b.right > window.innerWidth + 1 || b.bottom > window.innerHeight + 1
                      );
                      const minOf = (roles) => {
                        const arr = touchBtns.filter(b => roles.includes(b.role));
                        if (!arr.length) return null;
                        return Math.round(arr.reduce((m, b) => Math.min(m, b.w, b.h), 999));
                      };
                      const cRect = canvas ? canvas.getBoundingClientRect() : null;
                      const shellRect = shell ? shell.getBoundingClientRect() : null;

                      return JSON.stringify({
                        iw: window.innerWidth,
                        ih: window.innerHeight,
                        sw: doc.scrollWidth,
                        shellSw: shell ? shell.scrollWidth : 0,
                        shellSh: shell ? shell.scrollHeight : 0,
                        shellW: shellRect ? Math.round(shellRect.width) : 0,
                        shellH: shellRect ? Math.round(shellRect.height) : 0,
                        canvasW: cRect ? Math.round(cRect.width) : 0,
                        canvasH: cRect ? Math.round(cRect.height) : 0,
                        barVisible,
                        btnCount: touchBtns.length,
                        minPrimary: minOf(['primary', 'analog']),
                        minDir: minOf(['dir']),
                        minCompactOrSec: minOf(['compact', 'secondary']),
                        overlaps,
                        outOfBoundsCount: outOfBounds.length,
                        outOfBounds
                      });
                    })();
                    """)
                    m = json.loads(raw)
                    key = f"{gid}@{rw}x{rh}"
                    issues = []
                    if abs(m["iw"] - rw) > 2 or abs(m["ih"] - rh) > 2:
                        issues.append(f"viewport mismatch expected {rw}x{rh}, got {m['iw']}x{m['ih']}")
                    if m["sw"] > m["iw"] + 1 or m["shellSw"] > m["iw"] + 1:
                        issues.append(f"horizontal overflow sw={m['sw']}, shellSw={m['shellSw']} > iw={m['iw']}")
                    if m["shellSh"] > m["ih"] + 2 or m["shellH"] > m["ih"] + 2:
                        issues.append(f"game shell overflow shellSh={m['shellSh']}, shellH={m['shellH']} > ih={m['ih']}")
                    if m["canvasW"] < 120 or m["canvasH"] < 120:
                        issues.append(f"canvas too small {m['canvasW']}x{m['canvasH']}")
                    if rw <= 900:
                        if not m["barVisible"]:
                            issues.append("touch bar hidden on <=900px viewport")
                        if m["outOfBoundsCount"] > 0:
                            issues.append(f"touch controls out of viewport: {m['outOfBounds']}")
                        if m["overlaps"]:
                            issues.append(f"touch buttons overlap: {m['overlaps']}")
                        compact_vp = (rw <= 350 or rh <= 500)
                        exp_prim = 46 if compact_vp else 50
                        exp_dir = 42 if compact_vp else 46
                        exp_sec = 38 if compact_vp else 44
                        if m["minPrimary"] is not None and m["minPrimary"] < exp_prim:
                            issues.append(f"primary touch target small min={m['minPrimary']} < {exp_prim}")
                        if m["minDir"] is not None and m["minDir"] < exp_dir:
                            issues.append(f"dir touch target small min={m['minDir']} < {exp_dir}")
                        if m["minCompactOrSec"] is not None and m["minCompactOrSec"] < exp_sec:
                            issues.append(f"secondary/compact touch target small min={m['minCompactOrSec']} < {exp_sec}")
                    report["resolutions"][key] = {"metrics": m, "issues": issues}
                    if issues:
                        report["errors"].append(f"{key}: {'; '.join(issues)}")

                eval_sync("document.getElementById('hud-exit-btn').click(); 'exited';")
                wait_js("!document.querySelector('.game-view-shell')", 2000)

            # Prueba táctil DOM real en móvil 390x844 (Pong vertical track + Shmup joystick+fuego simultáneos)
            set_viewport(390, 844)
            eval_sync("document.querySelector('.game-card[data-game-id=\"pong\"]').click(); 'open';")
            wait_js("document.querySelector('.touch-vertical-track') && document.querySelector('.engine-canvas')", 3000)
            pump(140)
            pong_touch_ok = eval_sync("""
            (() => {
              const canvas = document.querySelector('.engine-canvas');
              const track = document.querySelector('.touch-vertical-track');
              const before = canvas.toDataURL();
              const r = track.getBoundingClientRect();
              track.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height*0.15, bubbles: true }));
              track.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height*0.85, bubbles: true }));
              track.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', buttons: 0, clientX: r.left + r.width/2, clientY: r.top + r.height*0.85, bubbles: true }));
              return JSON.stringify({ before });
            })()
            """)
            pump(140)
            pong_after = eval_sync("document.querySelector('.engine-canvas').toDataURL()")
            pong_changed = (pong_after != json.loads(pong_touch_ok)["before"])
            eval_sync("document.getElementById('hud-exit-btn').click(); 'exit';")
            wait_js("!document.querySelector('.game-view-shell')", 2000)

            eval_sync("document.querySelector('.game-card[data-game-id=\"shmup\"]').click(); 'open';")
            wait_js("document.querySelector('.touch-joystick-pad') && document.querySelector('.engine-canvas')", 3000)
            pump(140)
            shmup_before = eval_sync("""
            (() => {
              const canvas = document.querySelector('.engine-canvas');
              const joy = document.querySelector('.touch-joystick-pad');
              const fire = document.querySelector('.touch-btn[data-act=\"action\"]');
              const jr = joy.getBoundingClientRect();
              const fr = fire.getBoundingClientRect();
              const before = canvas.toDataURL();
              joy.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 11, pointerType: 'touch', buttons: 1, clientX: jr.left + jr.width/2, clientY: jr.top + jr.height/2, bubbles: true }));
              joy.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, pointerType: 'touch', buttons: 1, clientX: jr.left + jr.width*0.9, clientY: jr.top + jr.height*0.25, bubbles: true }));
              fire.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 12, pointerType: 'touch', buttons: 1, clientX: fr.left + fr.width/2, clientY: fr.top + fr.height/2, bubbles: true }));
              return JSON.stringify({ before, firePressed: fire.classList.contains('pressed'), joyActive: joy.classList.contains('active') });
            })()
            """)
            pump(160)
            shmup_after = eval_sync("""
            (() => {
              const joy = document.querySelector('.touch-joystick-pad');
              const fire = document.querySelector('.touch-btn[data-act=\"action\"]');
              const canvas = document.querySelector('.engine-canvas');
              const after = canvas.toDataURL();
              joy.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, pointerType: 'touch', buttons: 0, bubbles: true }));
              fire.dispatchEvent(new PointerEvent('pointerup', { pointerId: 12, pointerType: 'touch', buttons: 0, bubbles: true }));
              return JSON.stringify({ after, releasedClean: !fire.classList.contains('pressed') && !joy.classList.contains('active') });
            })()
            """)
            sb = json.loads(shmup_before)
            sa = json.loads(shmup_after)
            eval_sync("document.getElementById('hud-exit-btn').click(); 'exit';")
            wait_js("!document.querySelector('.game-view-shell')", 2000)

            mobile_ok = (
                pong_changed
                and sb["firePressed"]
                and sb["joyActive"]
                and sa["releasedClean"]
                and sa["after"] != sb["before"]
            )
            report["mobileDomTouch"] = {
                "ok": mobile_ok,
                "pongChanged": pong_changed,
                "shmupSimultaneous": sb["firePressed"] and sb["joyActive"] and (sa["after"] != sb["before"]),
                "releasedClean": sa["releasedClean"]
            }
            if not mobile_ok:
                report["errors"].append(f"mobileDomTouch failed: {report['mobileDomTouch']}")

            # Prueba dinámica de cambio de orientación (390x844 -> 844x390 en vivo sin perder partida)
            set_viewport(390, 844)
            eval_sync("document.querySelector('.game-card[data-game-id=\"pong\"]').click(); 'open-pong';")
            wait_js("document.querySelector('.engine-canvas') && document.querySelector('.game-stage-area .controls-onboarding-banner')", 3000)
            pump(120)
            eval_sync("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true })); 'in';")
            pump(60)
            before_rot = json.loads(eval_sync("""
              JSON.stringify({
                title: document.querySelector('.hud-game-title')?.textContent || '',
                bannerDismissed: document.querySelector('.controls-onboarding-banner')?.classList.contains('fade-out') || false
              })
            """))
            set_viewport(844, 390)
            pump(120)
            after_rot = json.loads(eval_sync("""
              JSON.stringify({
                title: document.querySelector('.hud-game-title')?.textContent || '',
                canvasW: Math.round(document.querySelector('.engine-canvas')?.getBoundingClientRect().width || 0),
                canvasH: Math.round(document.querySelector('.engine-canvas')?.getBoundingClientRect().height || 0),
                iw: window.innerWidth,
                ih: window.innerHeight,
                errCount: (window.__respErrs || []).length
              })
            """))
            eval_sync("document.getElementById('hud-exit-btn').click(); 'exited';")
            ok_rot = (
                before_rot["title"] == "Hyper Pong"
                and after_rot["title"] == "Hyper Pong"
                and before_rot["bannerDismissed"] is True
                and after_rot["canvasW"] >= 120
                and after_rot["canvasH"] >= 120
                and abs(after_rot["iw"] - 844) <= 2
                and abs(after_rot["ih"] - 390) <= 2
                and after_rot["errCount"] == 0
            )
            report["orientationPreserve"] = {"ok": ok_rot, "before": before_rot, "after": after_rot}
            if not ok_rot:
                report["errors"].append(f"Orientation switch issue: {report['orientationPreserve']}")

        except Exception as exc:
            report["errors"].append(str(exc))
        finally:
            loop.quit()
        return False

    done_flag = {"finished": False}
    def on_timeout():
        if not done_flag["finished"]:
            report["errors"].append("Timeout in run_responsive_probe")
            loop.quit()
        return False

    webview.connect("load-changed", lambda v, e: GLib.timeout_add(200, execute) if e == WebKit2.LoadEvent.FINISHED else None)
    webview.load_uri(f"http://localhost:{port}/")
    tid = GLib.timeout_add_seconds(55, on_timeout)
    loop.run()
    done_flag["finished"] = True
    GLib.source_remove(tid) if GLib.main_context_default().find_source_by_id(tid) else None
    win.destroy()
    return report


JS_ENGINE_AND_E2E_AUDIT = r"""
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const results = { tests: {}, errors: [] };
  const pageErrors = [];
  window.__auditStage = 'init';
  window.addEventListener('error', e => pageErrors.push('window.error: ' + (e.error?.stack || e.message)));
  window.addEventListener('unhandledrejection', e => pageErrors.push('unhandledrejection: ' + (e.reason?.stack || e.reason)));

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  try {
  // Helper: mount real DOM canvas + real InputManager + GameClass cleanly inside headless WebKit2
  const { InputManager } = await import('./src/engine/InputManager.js');
  const { AudioManager } = await import('./src/engine/AudioManager.js');
  const { DifficultyManager } = await import('./src/engine/DifficultyManager.js');
  const { ScoreManager } = await import('./src/engine/ScoreManager.js');
  const { LevelManager } = await import('./src/engine/LevelManager.js');
  const { CollisionManager } = await import('./src/engine/CollisionManager.js');
  const { GameRegistry } = await import('./src/engine/GameRegistry.js');

  async function mountGameHarness(gameId, wOverride = null, hOverride = null) {
    const meta = GameRegistry.getById(gameId);
    const w = wOverride ?? meta.aspectRatio.width;
    const h = hOverride ?? meta.aspectRatio.height;
    const mod = await import(`./src/games/${gameId}/index.js`);
    const GameClass = mod.default;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:600px;z-index:99999;pointer-events:auto;';
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = `width:${w}px;height:${h}px;display:block;`;
    host.appendChild(canvas);
    document.body.appendChild(host);
    const ctx = canvas.getContext('2d');

    let firstInputCount = 0;
    let gameOverCalls = 0;
    let game = null;
    const diffMgr = new DifficultyManager(meta.difficultyConfig || {});
    const scoreMgr = new ScoreManager(0);
    const lvlMgr = new LevelManager({
      baseTarget: meta.baseLevelTarget || 100,
      targetGrowth: meta.levelGrowth || 1.25,
      onLevelUp(lvl) { diffMgr.setLevel(lvl); }
    });
    const input = new InputManager(
      canvas,
      (evt) => {
        firstInputCount++;
        game?.handleInput?.(evt);
      },
      {
        onClear: () => { game?.handleInput?.({ type: 'clear' }); }
      }
    );
    const api = {
      width: w,
      height: h,
      canvas,
      ctx,
      domContainer: host,
      input,
      audio: AudioManager,
      score: scoreMgr,
      level: lvlMgr,
      difficulty: diffMgr,
      collision: CollisionManager,
      setScore: (s) => scoreMgr.set(s),
      addScore: (d, mult = true) => scoreMgr.add(d, mult ? diffMgr.getMetrics().scoreMultiplier : 1),
      advanceProgress: (amt = 1) => lvlMgr.addProgress(amt),
      setLevel: (lv) => { lvlMgr.setLevel(lv); diffMgr.setLevel(lv); },
      getDifficulty: () => diffMgr.getMetrics(),
      updateStatusText: () => {},
      setStatus: () => {},
      triggerGameOver: () => { gameOverCalls++; },
      gameOver: () => { gameOverCalls++; }
    };
    game = new GameClass(api);
    game.init();
    const step = (frames = 10, dt = 1 / 60) => {
      for (let i = 0; i < frames; i++) {
        game.update(dt);
        game.render(ctx);
      }
    };
    const key = (type, keyName, code, repeat = false) => {
      window.dispatchEvent(new KeyboardEvent(type, { key: keyName, code, repeat, bubbles: true, cancelable: true }));
    };
    const ptr = (target, type, opts = {}) => {
      const r = target.getBoundingClientRect();
      const nx = opts.nx ?? 0.5;
      const ny = opts.ny ?? 0.5;
      target.dispatchEvent(new PointerEvent(type, {
        pointerId: opts.pointerId ?? 1,
        pointerType: opts.pointerType ?? 'touch',
        button: opts.button ?? 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : (opts.buttons ?? 1),
        clientX: r.left + r.width * nx,
        clientY: r.top + r.height * ny,
        bubbles: true,
        cancelable: true
      }));
    };
    const cleanup = () => {
      input.destroy();
      host.remove();
    };
    return {
      game, input, canvas, step, key, ptr, cleanup,
      getScore: () => scoreMgr.score,
      getFirstInputCount: () => firstInputCount,
      getGameOverCalls: () => gameOverCalls
    };
  }

    // =========================================================
    // PRUEBA A: PONG EXHAUSTIVO (Teclado + Hover + Pausa + Reinicio + Táctil)
    // =========================================================
    window.__auditStage = 'Prueba A';
    {
      const h = await mountGameHarness('pong', 720, 480);
      const { game, input, canvas, step, key, ptr } = h;
      const startY = game.player.y;

      // 1. Mantener ArrowUp -> debe subir de forma continua hasta topar límite superior (12)
      key('keydown', 'ArrowUp', 'ArrowUp');
      step(18, 1/60);
      const yAfterUp = game.player.y;
      assert(yAfterUp < startY - 30, `Pong ArrowUp did not move up smoothly: ${startY} -> ${yAfterUp}`);

      // Mantener hasta el borde superior
      step(120, 1/60);
      assert(game.player.y === 12, `Pong top clamp expected 12, got ${game.player.y}`);

      // 2. Soltar ArrowUp -> debe detenerse y NO regresar ni moverse con hover pasivo de mouse
      key('keyup', 'ArrowUp', 'ArrowUp');
      step(10, 1/60);
      const yStopped = game.player.y;
      window.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 9, pointerType: 'mouse', buttons: 0, clientX: 300, clientY: 440, bubbles: true
      }));
      ptr(canvas, 'pointermove', { pointerId: 9, pointerType: 'mouse', buttons: 0, nx: 0.3, ny: 0.9 });
      step(10, 1/60);
      assert(game.player.y === yStopped, `Pong mouse hover snapped paddle! ${yStopped} -> ${game.player.y}`);

      // 3. Mantener ArrowDown -> debe bajar de forma continua hasta topar límite inferior
      key('keydown', 'ArrowDown', 'ArrowDown');
      step(25, 1/60);
      const yMidDown = game.player.y;
      assert(yMidDown > yStopped + 40, `Pong ArrowDown did not move down: ${yStopped} -> ${yMidDown}`);
      step(140, 1/60);
      const expectedBottom = h.game.api.height - game.player.h - 12;
      assert(game.player.y === expectedBottom, `Pong bottom clamp expected ${expectedBottom}, got ${game.player.y}`);
      key('keyup', 'ArrowDown', 'ArrowDown');

      // 4. Probar W y S
      const yBeforeW = game.player.y;
      key('keydown', 'w', 'KeyW');
      step(20, 1/60);
      assert(game.player.y < yBeforeW - 30, `Pong KeyW failed: ${yBeforeW} -> ${game.player.y}`);
      key('keyup', 'w', 'KeyW');
      const yAfterW = game.player.y;
      key('keydown', 's', 'KeyS');
      step(20, 1/60);
      assert(game.player.y > yAfterW + 30, `Pong KeyS failed: ${yAfterW} -> ${game.player.y}`);
      key('keyup', 's', 'KeyS');

      // 5. Probar tecla M (cambio de modo)
      const modeBefore = game.mode;
      key('keydown', 'm', 'KeyM');
      key('keyup', 'm', 'KeyM');
      assert(game.mode !== modeBefore, `Pong KeyM mode switch failed: stayed ${modeBefore}`);

      // 6. Probar pausa / blur -> clearAll() limpia teclas pegadas y reanudación responde normal
      key('keydown', 'ArrowUp', 'ArrowUp');
      assert(input.isPressed('up'), 'up should be held before pause');
      input.clearAll();
      assert(!input.isPressed('up'), 'up remained stuck after clearAll');
      const yFrozen = game.player.y;
      step(10, 1/60);
      assert(game.player.y === yFrozen, 'paddle drifted after clearAll');
      key('keyup', 'ArrowUp', 'ArrowUp');
      // Desde el borde inferior, ArrowUp debe responder inmediatamente tras clearAll()
      key('keydown', 'ArrowUp', 'ArrowUp');
      step(15, 1/60);
      assert(game.player.y < yFrozen - 20, `paddle did not respond to ArrowUp after clearAll: ${yFrozen} -> ${game.player.y}`);
      key('keyup', 'ArrowUp', 'ArrowUp');

      // 7. Reinicio -> recupera posición inicial y responde otra vez
      game.restart();
      assert(Math.abs(game.player.y - startY) < 0.01, 'Pong restart did not reset player.y');
      key('keydown', 'ArrowUp', 'ArrowUp');
      step(15, 1/60);
      assert(game.player.y < startY - 20, 'Pong failed after restart');
      key('keyup', 'ArrowUp', 'ArrowUp');

      // 8. Control táctil virtual (botón up/down + slider paddletrack + arrastre táctil directo en canvas)
      const yBeforeTouch = game.player.y;
      input.triggerVirtual('down', true, 'btn-down');
      step(15, 1/60);
      const yTouchBtn = game.player.y;
      assert(yTouchBtn > yBeforeTouch + 20, `Pong virtual down button did not move paddle down: ${yBeforeTouch} -> ${yTouchBtn}`);
      input.triggerVirtual('down', false, 'btn-down');

      input.emitCustom({ type: 'paddletrack', y: 0.15 });
      assert(game.player.y < 140, `Pong paddletrack 0.15 failed: y=${game.player.y}`);
      input.emitCustom({ type: 'paddletrack', y: 0.85 });
      assert(game.player.y > 260, `Pong paddletrack 0.85 failed: y=${game.player.y}`);

      ptr(canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', nx: 0.25, ny: 0.2 });
      ptr(canvas, 'pointermove', { pointerId: 2, pointerType: 'touch', nx: 0.25, ny: 0.55 });
      const yCanvasDragMid = game.player.y;
      ptr(canvas, 'pointermove', { pointerId: 2, pointerType: 'touch', nx: 0.25, ny: 0.22 });
      const yCanvasDragUp = game.player.y;
      ptr(canvas, 'pointerup', { pointerId: 2, pointerType: 'touch', nx: 0.25, ny: 0.22 });
      assert(yCanvasDragUp < yCanvasDragMid - 30, `Pong canvas touch drag failed: mid=${yCanvasDragMid} up=${yCanvasDragUp}`);

      h.cleanup();
      results.tests['Prueba A - Pong Teclado/Hover/Pausa/Táctil'] = 'APROBADO';
    }

    // =========================================================
    // PRUEBA B: PLATAFORMAS Y ACCIÓN MULTI-TOUCH
    // =========================================================
    window.__auditStage = 'Prueba B';
    {
      // B1. Iron Commando (metalslug): correr + saltar + disparar simultáneos
      const ms = await mountGameHarness('metalslug', 640, 400);
      const x0 = ms.game.player.x;
      const bullets0 = ms.game.bullets.length;
      ms.input.triggerVirtual('right', true, 'p1');
      ms.input.triggerVirtual('jump', true, 'p2');
      ms.input.triggerVirtual('action', true, 'p3');
      ms.step(6, 1/60);
      assert(ms.game.player.x > x0 + 5, `metalslug multi-touch run failed: ${x0} -> ${ms.game.player.x}`);
      assert(ms.game.player.vy < 0 || !ms.game.player.grounded, 'metalslug multi-touch jump did not launch player');
      assert(ms.game.bullets.length > bullets0, 'metalslug multi-touch fire did not spawn projectile');
      ms.input.clearAll();
      ms.cleanup();

      // B2. Dusty Trails (sunsetriders): multi-touch + drop-through (down + jump)
      const sr = await mountGameHarness('sunsetriders', 640, 400);
      sr.step(4, 1/60);
      const srx0 = sr.game.player.x;
      sr.input.triggerVirtual('right', true, 'p1');
      sr.input.triggerVirtual('jump', true, 'p2');
      sr.input.triggerVirtual('action', true, 'p3');
      sr.step(5, 1/60);
      assert(sr.game.player.x > srx0 + 4, 'sunsetriders simultaneous right+jump failed');
      assert(sr.game.bullets.length > 0, 'sunsetriders simultaneous fire failed');
      sr.input.clearAll();
      // Place player on balcony platform and test down+jump drop-through
      const plat = sr.game.balconies.find(p => p.y < sr.game.groundY - 20);
      if (plat) {
        sr.game.player.x = plat.x + 20;
        sr.game.player.y = plat.y - sr.game.player.h;
        sr.game.player.vy = 0;
        sr.game.player.grounded = true;
        sr.input.triggerVirtual('down', true, 'p1');
        sr.input.triggerVirtual('jump', true, 'p2');
        sr.step(6, 1/60);
        assert(sr.game.player.y > plat.y - sr.game.player.h + 2, 'sunsetriders drop-through failed');
      }
      sr.cleanup();

      // B3. Steel Girder (donkeykong): escalera arriba vs saltar con Space/jump cerca del tope
      const dk = await mountGameHarness('donkeykong', 560, 440);
      const ladder = dk.game.ladders[0];
      assert(ladder, 'donkeykong missing ladder');
      // Colocar al jugador justo en la parte superior de una escalera
      dk.game.player.x = ladder.x - dk.game.player.w / 2;
      dk.game.player.y = ladder.topY - dk.game.player.h;
      dk.game.player.grounded = true;
      dk.game.player.climbing = false;
      dk.input.triggerVirtual('jump', true, 'p2');
      assert(dk.game.player.climbing === false && dk.game.player.vy < 0,
        `donkeykong jump near ladder top hijacked climbing=${dk.game.player.climbing}, vy=${dk.game.player.vy}`);
      dk.input.triggerVirtual('jump', false, 'p2');
      // Ahora probar subir escalera con 'up' en mitad de escalera
      dk.game.player.climbing = false;
      dk.game.player.vy = 0;
      dk.game.player.y = (ladder.topY + ladder.botY) / 2 - dk.game.player.h / 2;
      const yMid = dk.game.player.y;
      dk.input.triggerVirtual('up', true, 'p1');
      dk.step(8, 1/60);
      assert(dk.game.player.climbing === true && dk.game.player.y < yMid,
        `donkeykong climb with Up failed: climbing=${dk.game.player.climbing}, y=${dk.game.player.y}`);
      dk.cleanup();

      results.tests['Prueba B - Plataformas (MetalSlug, SunsetRiders, DonkeyKong)'] = 'APROBADO';
    }

    // =========================================================
    // PRUEBA C: SHOOTERS (Shmup, SpaceInvaders, Asteroids)
    // =========================================================
    window.__auditStage = 'Prueba C';
    {
      // C1. Starlight Strikers (shmup): joystick analógico + fuego + nova simultáneos + arrastre relativo
      const sh = await mountGameHarness('shmup', 480, 620);
      const sx0 = sh.game.player.x, sy0 = sh.game.player.y;
      sh.input.setAnalog(0.85, -0.7);
      sh.input.triggerVirtual('action', true, 'p2');
      sh.step(10, 1/60);
      assert(sh.game.player.x > sx0 + 10 && sh.game.player.y < sy0 - 8,
        `shmup analog movement failed: (${sx0},${sy0}) -> (${sh.game.player.x},${sh.game.player.y})`);
      assert(sh.game.bullets.length > 0, 'shmup simultaneous analog+fire spawned no bullets');
      const novaBefore = sh.game.bombs;
      sh.input.triggerVirtual('secondary', true, 'p3');
      sh.input.triggerVirtual('secondary', false, 'p3');
      assert(sh.game.bombs === novaBefore - 1, `shmup nova special action did not trigger: bombs=${sh.game.bombs}`);
      sh.input.setAnalog(0, 0);
      sh.input.clearAll();

      // Arrastre relativo en canvas táctil no debe teletransportar nave
      const beforeDragX = sh.game.player.x;
      sh.ptr(sh.canvas, 'pointerdown', { pointerId: 4, pointerType: 'touch', nx: 0.9, ny: 0.2 });
      assert(Math.abs(sh.game.player.x - beforeDragX) < 1, 'shmup canvas touch start teleported ship');
      sh.ptr(sh.canvas, 'pointermove', { pointerId: 4, pointerType: 'touch', nx: 0.7, ny: 0.2 });
      sh.ptr(sh.canvas, 'pointerup', { pointerId: 4, pointerType: 'touch', nx: 0.7, ny: 0.2 });
      assert(sh.game.player.x < beforeDragX - 20, 'shmup relative canvas drag did not move ship left');
      sh.cleanup();

      // C2. Space Invaders: teclado inmune a hover pasivo + arrastre táctil autodispara
      const si = await mountGameHarness('spaceinvaders', 560, 480);
      const six0 = si.game.player.x;
      si.key('keydown', 'ArrowRight', 'ArrowRight');
      si.step(10, 1/60);
      assert(si.game.player.x > six0 + 15, 'spaceinvaders keyboard right failed');
      const sixMoved = si.game.player.x;
      si.key('keyup', 'ArrowRight', 'ArrowRight');
      si.ptr(si.canvas, 'pointermove', { pointerId: 9, pointerType: 'mouse', buttons: 0, nx: 0.1, ny: 0.8 });
      si.step(4, 1/60);
      assert(si.game.player.x === sixMoved, 'spaceinvaders passive mouse hover moved ship');
      let siFires = 0;
      const origSiFire = si.game._firePlayerWeapon.bind(si.game);
      si.game._firePlayerWeapon = () => { siFires++; return origSiFire(); };
      si.ptr(si.canvas, 'pointerdown', { pointerId: 5, pointerType: 'touch', nx: 0.25, ny: 0.8 });
      const xOnTouchStart = si.game.player.x;
      assert(si.input.isCanvasDragging(), 'spaceinvaders touch pointerdown did not activate dragging');
      si.ptr(si.canvas, 'pointermove', { pointerId: 5, pointerType: 'touch', nx: 0.65, ny: 0.8 });
      si.step(26, 1/60); // > shootCooldown so continuous drag autofires again
      assert(siFires >= 2, `spaceinvaders touch drag did not autofire continuously: fires=${siFires}`);
      assert(si.game.player.x > xOnTouchStart + 80, `spaceinvaders touch drag did not reposition cannon: ${xOnTouchStart} -> ${si.game.player.x}`);
      si.ptr(si.canvas, 'pointerup', { pointerId: 5, pointerType: 'touch', nx: 0.45, ny: 0.8 });
      si.cleanup();

      // C3. Asteroids: rotación + empuje + disparo + hiperespacio
      const ast = await mountGameHarness('asteroids', 600, 480);
      const a0 = ast.game.ship.angle;
      ast.key('keydown', 'ArrowRight', 'ArrowRight');
      ast.key('keydown', 'ArrowUp', 'ArrowUp');
      ast.step(10, 1/60);
      assert(ast.game.ship.angle > a0, 'asteroids rotation failed');
      assert(Math.hypot(ast.game.ship.vx, ast.game.ship.vy) > 5, 'asteroids thrust failed');
      ast.key('keydown', ' ', 'Space');
      assert(ast.game.bullets.length > 0, 'asteroids Space fire failed');
      ast.cleanup();

      results.tests['Prueba C - Shooters (Shmup, SpaceInvaders, Asteroids)'] = 'APROBADO';
    }

    // =========================================================
    // PRUEBA D: LABERINTOS, PUZZLES Y REFLEJOS (10 juegos restantes)
    // =========================================================
    window.__auditStage = 'Prueba D';
    {
      // D1. Bomberman: D-pad + bomba única sin repeat
      const bm = await mountGameHarness('bomberman');
      bm.key('keydown', ' ', 'Space', false);
      assert(bm.game.bombs.length === 1, `bomberman single Space placed ${bm.game.bombs.length} bombs`);
      bm.key('keydown', ' ', 'Space', true); // repeat=true ignorado mientras sigue presionada
      assert(bm.game.bombs.length === 1, 'bomberman repeat=true placed an extra bomb');
      bm.key('keyup', ' ', 'Space');
      bm.cleanup();

      // D2. Tetris: Soft Drop continuo, sin doble hard drop en repeat, Hold seguro
      const tt = await mountGameHarness('tetris');
      const py0 = tt.game.current.y;
      tt.key('keydown', 'ArrowDown', 'ArrowDown');
      tt.step(20, 1/60);
      assert(tt.game.current.y > py0, 'tetris soft drop hold did not descend faster');
      tt.key('keyup', 'ArrowDown', 'ArrowDown');
      tt.key('keydown', 'c', 'KeyC', false);
      assert(tt.game.holdPiece !== null, 'tetris hold C failed');
      tt.key('keydown', 'c', 'KeyC', false);
      assert(tt.game.canHold === false, 'tetris allowed double hold before lock');
      const lockBefore = tt.getScore();
      tt.key('keydown', ' ', 'Space', true); // repeat hard drop ignored
      assert(tt.getScore() === lockBefore, 'tetris ignored repeat=true failed');
      tt.cleanup();

      // D3. Minesweeper: tap corto revela segura, pulsación larga >= 0.4s coloca bandera
      const mw = await mountGameHarness('minesweeper');
      mw.ptr(mw.canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', nx: 0.5, ny: 0.55 });
      mw.step(2, 1/60);
      mw.ptr(mw.canvas, 'pointerup', { pointerId: 1, pointerType: 'touch', nx: 0.5, ny: 0.55 });
      assert(mw.game.revealedCount > 0, 'minesweeper quick touch tap did not reveal first safe cells');
      // Encontrar una celda oculta probando coordenadas táctiles hasta activar _pendingTouch sobre una celda sin revelar
      let flaggedTarget = null;
      for (let ny = 0.14; ny <= 0.92 && !flaggedTarget; ny += 0.05) {
        for (let nx = 0.12; nx <= 0.88 && !flaggedTarget; nx += 0.05) {
          mw.ptr(mw.canvas, 'pointerdown', { pointerId: 2, pointerType: 'touch', nx, ny });
          if (mw.game._pendingTouch) {
            const { row, col } = mw.game._pendingTouch;
            if (!mw.game.cells[row][col].revealed && !mw.game.cells[row][col].flagged) {
              mw.step(30, 1/60); // 0.5s >= 0.36s
              flaggedTarget = { row, col, nx, ny };
              mw.ptr(mw.canvas, 'pointerup', { pointerId: 2, pointerType: 'touch', nx, ny });
              break;
            }
            mw.game._pendingTouch = null;
          }
          mw.ptr(mw.canvas, 'pointerup', { pointerId: 2, pointerType: 'touch', nx, ny });
        }
      }
      assert(flaggedTarget && mw.game.cells[flaggedTarget.row][flaggedTarget.col].flagged === true,
        `minesweeper touch long press did not place flag: target=${JSON.stringify(flaggedTarget)}`);
      mw.cleanup();

      // D4. 2048 + Snake + Pacman: swipe rápido durante pointermove antes de pointerup
      const g2048 = await mountGameHarness('2048');
      let swipeSeen = 0;
      const origHandle2048 = g2048.game.handleInput.bind(g2048.game);
      g2048.game.handleInput = (e) => { if (e.type === 'swipe') swipeSeen++; return origHandle2048(e); };
      g2048.ptr(g2048.canvas, 'pointerdown', { pointerId: 3, pointerType: 'touch', nx: 0.2, ny: 0.5 });
      g2048.ptr(g2048.canvas, 'pointermove', { pointerId: 3, pointerType: 'touch', nx: 0.4, ny: 0.5 });
      assert(swipeSeen === 1, `2048 instant swipe expected 1 before pointerup, got ${swipeSeen}`);
      g2048.ptr(g2048.canvas, 'pointerup', { pointerId: 3, pointerType: 'touch', nx: 0.4, ny: 0.5 });
      g2048.cleanup();

      const snk = await mountGameHarness('snake');
      const syHead0 = snk.game.snake[0].y;
      snk.key('keydown', 'ArrowDown', 'ArrowDown');
      snk.step(20, 1/60);
      assert(snk.game.snake[0].y > syHead0, 'snake ArrowDown direction failed');
      snk.cleanup();

      const pac = await mountGameHarness('pacman');
      const pxStart = pac.game.player.x;
      pac.key('keydown', 'ArrowLeft', 'ArrowLeft');
      pac.step(14, 1/60);
      assert(pac.game.player.x < pxStart, 'pacman ArrowLeft movement failed');
      pac.cleanup();

      // D5. Breakout: teclado + mouse hover ignorado + touch drag + tap launch
      const brk = await mountGameHarness('breakout');
      const bpx0 = brk.game.paddle.x;
      brk.key('keydown', 'ArrowRight', 'ArrowRight');
      brk.step(10, 1/60);
      const bpx1 = brk.game.paddle.x;
      assert(bpx1 > bpx0 + 15, 'breakout keyboard right failed');
      brk.key('keyup', 'ArrowRight', 'ArrowRight');
      brk.ptr(brk.canvas, 'pointermove', { pointerId: 9, pointerType: 'mouse', buttons: 0, nx: 0.1, ny: 0.8 });
      brk.step(4, 1/60);
      assert(brk.game.paddle.x === bpx1, 'breakout mouse hover hijacked paddle');
      // Tap corto debe lanzar la bola si está adherida
      brk.ptr(brk.canvas, 'pointerdown', { pointerId: 7, pointerType: 'touch', nx: 0.5, ny: 0.7 });
      brk.ptr(brk.canvas, 'pointerup', { pointerId: 7, pointerType: 'touch', nx: 0.5, ny: 0.7 });
      assert(brk.game.balls.every(b => !b.stuck), 'breakout tap release did not launch stuck ball');
      brk.cleanup();

      // D6. Flappy, Memory, Reaction
      const flp = await mountGameHarness('flappy');
      const modeF0 = flp.game.charIdx;
      flp.key('keydown', 'c', 'KeyC', false);
      assert(flp.game.charIdx !== modeF0, 'flappy KeyC did not switch character');
      const modeF1 = flp.game.charIdx;
      flp.key('keydown', 'c', 'KeyC', true); // repeat ignorado
      assert(flp.game.charIdx === modeF1, 'flappy repeat=true switched character again');
      flp.key('keyup', 'c', 'KeyC');
      flp.key('keydown', ' ', 'Space', false);
      assert(flp.game.glider.vy < 0, 'flappy Space flap failed');
      flp.key('keyup', ' ', 'Space');
      flp.cleanup();

      const mem = await mountGameHarness('memory');
      const mLay = mem.game._getLayout();
      const mcx = (mLay.boardX + mLay.cardW / 2) / mem.canvas.width;
      const mcy = (mLay.boardY + mLay.cardH / 2) / mem.canvas.height;
      mem.ptr(mem.canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', nx: mcx, ny: mcy });
      assert(mem.game.cards[0].state === 'flipped', `memory tap did not flip card: state=${mem.game.cards[0].state}`);
      mem.cleanup();

      const rct = await mountGameHarness('reaction');
      // Avanzar hasta estado 'signal' y pulsar en el objetivo
      for (let i = 0; i < 100 && rct.game.state !== 'signal'; i++) {
        rct.step(1, 0.08);
      }
      assert(rct.game.state === 'signal', `reaction never entered signal state: ${rct.game.state}`);
      const rcx = rct.game.targetCircle.x / rct.canvas.width;
      const rcy = rct.game.targetCircle.y / rct.canvas.height;
      rct.ptr(rct.canvas, 'pointerdown', { pointerId: 1, pointerType: 'touch', nx: rcx, ny: rcy });
      assert(rct.game.lastTimeMs !== null && rct.game.lastTimeMs >= 0, 'reaction signal tap did not register time');
      rct.cleanup();

      results.tests['Prueba D - Laberintos, Puzzles y Reflejos (10 juegos)'] = 'APROBADO';
    }

    // =========================================================
    // PRUEBA E: CICLO DE VIDA Y NO DUPLICACIÓN EN APP REAL (#app + GameModal)
    // =========================================================
    window.__auditStage = 'Prueba E';
    {
      const waitFor = async (fn, ms = 1800) => {
        const start = performance.now();
        while (performance.now() - start < ms) {
          const val = fn();
          if (val) return val;
          await sleep(25);
        }
        return fn();
      };

      // Asegurar que la home esté completamente montada antes de ciclar
      await waitFor(() => document.querySelector('.game-card[data-game-id="bomberman"]'), 3000);
      const waitMountComplete = () => waitFor(
        () => document.querySelector('.engine-canvas') && document.querySelector('.game-stage-area .controls-onboarding-banner'),
        3500
      );

      // Spy InputManager keydown add/remove around 3 ciclos completos (distinguiendo del unlock único de AudioManager)
      let activeInputKeydowns = 0;
      let totalInputKeydownAdds = 0;
      const origAdd = EventTarget.prototype.addEventListener;
      const origRem = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function(type, fn, opts) {
        if (this === window && type === 'keydown' && fn?.name === 'onKeyDown') {
          activeInputKeydowns++;
          totalInputKeydownAdds++;
        }
        return origAdd.call(this, type, fn, opts);
      };
      EventTarget.prototype.removeEventListener = function(type, fn, opts) {
        if (this === window && type === 'keydown' && fn?.name === 'onKeyDown') {
          activeInputKeydowns--;
        }
        return origRem.call(this, type, fn, opts);
      };

      for (let cycle = 0; cycle < 3; cycle++) {
        document.querySelector('.game-card[data-game-id="bomberman"]').click();
        const banner = await waitMountComplete();
        assert(banner !== null, `Onboarding banner missing after mountGame on cycle ${cycle}`);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
        await sleep(50);
        assert(banner.classList.contains('fade-out'), `Onboarding banner did not fade-out on first input (cycle ${cycle})`);

        // Pause -> Resume -> Exit
        document.getElementById('hud-pause-btn').click();
        await sleep(60);
        document.getElementById('pause-resume-btn').click();
        await sleep(60);
        document.getElementById('hud-exit-btn').click();
        await waitFor(() => !document.querySelector('.game-view-shell'));
        await waitFor(() => document.querySelector('.game-card[data-game-id="pong"]'));

        // Open Pong & Exit
        document.querySelector('.game-card[data-game-id="pong"]').click();
        await waitMountComplete();
        assert(activeInputKeydowns === 1, `Expected 1 active InputManager keydown during pong cycle ${cycle}, got ${activeInputKeydowns}`);
        document.getElementById('hud-exit-btn').click();
        await waitFor(() => !document.querySelector('.game-view-shell'));
        await waitFor(() => document.querySelector('.game-card[data-game-id="bomberman"]'));
        assert(activeInputKeydowns === 0, `Leaked InputManager keydown after pong exit (cycle ${cycle}): ${activeInputKeydowns}`);
      }

      // Reabrir bomberman y verificar exactamente 1 escucha onKeyDown activa tras 3 ciclos
      document.querySelector('.game-card[data-game-id="bomberman"]').click();
      await waitMountComplete();
      assert(activeInputKeydowns === 1,
        `Possible leaked/duplicate InputManager keydown after 3 cycles: active=${activeInputKeydowns}, totalAdds=${totalInputKeydownAdds}`);
      assert(totalInputKeydownAdds === 7,
        `Expected exact 7 InputManager binds across 7 opens, got ${totalInputKeydownAdds}`);

      document.getElementById('hud-exit-btn').click();
      await waitFor(() => !document.querySelector('.game-view-shell'));
      await waitFor(() => document.querySelector('.game-card[data-game-id="pong"]'));
      assert(activeInputKeydowns === 0,
        `Leaked window keydown listeners remained after exit: activeInputKeydowns=${activeInputKeydowns}`);

      // Verificar visualmente que GameModal Pong responde en vivo al teclado sobre el canvas
      document.querySelector('.game-card[data-game-id="pong"]').click();
      await waitMountComplete();
      const liveCanvas = document.querySelector('.engine-canvas');
      await sleep(120);
      const beforePng = liveCanvas.toDataURL();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
      await sleep(220);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
      const afterPng = liveCanvas.toDataURL();
      assert(beforePng !== afterPng, 'Live GameModal Pong canvas did not visually update after ArrowUp');
      document.getElementById('hud-exit-btn').click();
      await waitFor(() => !document.querySelector('.game-view-shell'));

      EventTarget.prototype.addEventListener = origAdd;
      EventTarget.prototype.removeEventListener = origRem;

      results.tests['Prueba E - Ciclo de vida 3x, Banner y Cero fugas'] = 'APROBADO';
    }

    if (pageErrors.length > 0) {
      throw new Error('Unhandled runtime/console errors: ' + pageErrors.join(' | '));
    }
    window.__auditResult = JSON.stringify({ ok: true, results });
  } catch (err) {
    results.errors.push(`${err?.name || 'Error'}: ${err?.message || err}\n${err?.stack || ''}`);
    window.__auditResult = JSON.stringify({ ok: false, results });
  }
})();
"""


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ensure_server(port)
    print("1/2 Ejecutando Pruebas A-E (Motor, Teclado, Multi-touch y Ciclo de vida 3x)...")
    res_ae = run_webkit_js_test(port, "/", JS_ENGINE_AND_E2E_AUDIT, initial_size=(1280, 768), timeout_s=50)
    print("Resultado A-E:", json.dumps(res_ae, ensure_ascii=False, indent=2))
    assert res_ae.get("ok") is True, f"Pruebas A-E fallaron: {res_ae}"

    print("2/2 Ejecutando Prueba F (Responsive 8+2 resoluciones, tamaños táctiles y rotación)...")
    res_f = run_responsive_probe(port)
    summary_f = {
        "total_checks": len(res_f["resolutions"]),
        "failed_checks": res_f["errors"],
        "mobileDomTouch": res_f["mobileDomTouch"],
        "orientationPreserve": res_f["orientationPreserve"],
    }
    print("Resultado F:", json.dumps(summary_f, ensure_ascii=False, indent=2))
    assert len(res_f["errors"]) == 0, f"Prueba F falló: {res_f['errors']}"
    print("\n[PASS] PRUEBAS A-F COMPLETADAS SIN ERRORES!")


if __name__ == "__main__":
    main()
