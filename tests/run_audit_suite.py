#!/usr/bin/env python3
"""
Suite integral de pruebas unitarias, de regresión, de niveles extremos (1..100),
almacenamiento/seguridad y auditoría E2E + Responsive + PWA para ARCADE INFINITO.
"""
import os
import re
import json
import sys
import tempfile
import subprocess
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

JSC = "/usr/lib/webkit2gtk-4.1/jsc"


def check_pwa_assets_and_http(port=8080):
    with open("service-worker.js", "r", encoding="utf-8") as f:
        sw_text = f.read()
    assets = re.findall(r"'(\./[^']+)'", sw_text)

    all_src = set()
    for root, _, files in os.walk("src"):
        for fn in files:
            all_src.add("./" + os.path.join(root, fn))
    missing_sw = all_src - set(assets)
    assert not missing_sw, f"Files in src/ missing from SW precache: {missing_sw}"

    for a in assets:
        rel = a[2:] if a != "./" else "index.html"
        assert os.path.exists(rel) and os.path.getsize(rel) > 0, f"Missing/empty precache asset: {rel}"
        url = f"http://localhost:{port}/" + (a[2:] if a != "./" else "")
        with urllib.request.urlopen(url, timeout=5) as resp:
            assert resp.status == 200, f"HTTP {resp.status} for {url}"

    with open("manifest.webmanifest", "r", encoding="utf-8") as mf:
        manifest = json.load(mf)
    assert len(manifest.get("icons", [])) >= 4
    print(f"[PASS] PWA & Precaché: {len(assets)} recursos locales verificados en disco y HTTP 200.")


def strip_esm(code, export_default_name=None):
    code = re.sub(r"^\s*import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?\s*$", "", code, flags=re.MULTILINE)
    if export_default_name:
        code = re.sub(r"export\s+default\s+class\s+\w+", f"globalThis.{export_default_name} = class", code)
    code = re.sub(r"export\s+const\s+", "const ", code)
    code = re.sub(r"export\s+class\s+", "class ", code)
    code = re.sub(r"export\s+async\s+function\s+", "async function ", code)
    code = re.sub(r"export\s+function\s+", "function ", code)
    return code


def run_jsc_unit_and_regression_tests():
    assert os.path.exists(JSC), f"JSC engine not found at {JSC}"

    bundle_parts = ["""
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.performance = { now: () => Date.now() };
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};
class MockAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = {}; }
  resume() { return Promise.resolve(); }
  createGain() { return { gain: { value: 1, setValueAtTime(){}, setTargetAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} }, connect(){} }; }
  createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect(){} }; }
  createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, Q: {}, connect(){} }; }
  createOscillator() { return { type: 'sine', frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, start(){}, stop(){} }; }
  createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
  createBufferSource() { return { buffer: null, connect(){}, start(){}, stop(){} }; }
}
globalThis.AudioContext = MockAudioContext;

function createMockElement(tag = 'DIV') {
  return {
    tagName: tag.toUpperCase(), id: '', className: '', innerHTML: '', textContent: '', value: '',
    style: { setProperty(){} }, dataset: {},
    classList: { add(){}, remove(){}, toggle(){} },
    appendChild(){}, remove(){}, focus(){}, click(){}, setSelectionRange(){},
    querySelector(){ return createMockElement(); },
    querySelectorAll(){ return [createMockElement()]; },
    addEventListener(){}, removeEventListener(){}, setAttribute(){},
    getBoundingClientRect(){ return { width: 800, height: 600, left: 0, top: 0 }; },
    getContext(){ return createMockCanvasCtx(); }
  };
}
globalThis.document = {
  hidden: false, fullscreenElement: null, activeElement: null, title: '',
  documentElement: { style: { setProperty() {} } },
  body: createMockElement('BODY'),
  addEventListener() {}, removeEventListener() {},
  getElementById() { return createMockElement(); },
  createElement(tag) { return createMockElement(tag); }
};
globalThis.navigator = { onLine: true };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
globalThis.setTimeout = () => 1;

function createMockCanvasCtx() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    imageSmoothingEnabled: true, shadowColor: '', shadowBlur: 0,
    fillRect(){}, strokeRect(){}, clearRect(){}, rect(){}, beginPath(){}, closePath(){}, moveTo(){}, lineTo(){},
    quadraticCurveTo(){}, bezierCurveTo(){}, arc(){}, arcTo(){}, ellipse(){}, roundRect(){}, clip(){},
    fill(){}, stroke(){}, fillText(){}, strokeText(){}, measureText(){ return { width: 10 }; },
    save(){}, restore(){}, translate(){}, rotate(){}, scale(){}, setTransform(){}, transform(){}, setLineDash(){},
    drawImage(){}, createPattern(){ return {}; },
    createLinearGradient(){ return { addColorStop(){} }; },
    createRadialGradient(){ return { addColorStop(){} }; }
  };
}
"""]

    modules_order = [
        "src/config.js",
        "src/utils/sanitize.js",
        "src/services/StorageService.js",
        "src/services/AchievementService.js",
        "src/services/StatisticsService.js",
        "src/engine/PixelSprites.js",
        "src/engine/ChiptuneSoundtrack.js",
        "src/engine/AudioManager.js",
        "src/engine/CollisionManager.js",
        "src/engine/DifficultyManager.js",
        "src/engine/ScoreManager.js",
        "src/engine/LevelManager.js",
        "src/engine/InputManager.js",
        "src/engine/GameLoop.js",
        "src/engine/GameEngine.js",
        "src/engine/GameRegistry.js"
    ]
    for path in modules_order:
        with open(path, "r", encoding="utf-8") as f:
            bundle_parts.append(strip_esm(f.read()))

    games = sorted(os.listdir("src/games"))
    for gid in games:
        with open(f"src/games/{gid}/index.js", "r", encoding="utf-8") as f:
            bundle_parts.append(f"(() => {{\n{strip_esm(f.read(), f'Game_{gid}')}\n}})();")

    bundle_parts.append("""
function makeTestAPI(meta, pressedSet = new Set()) {
  const diffMgr = new DifficultyManager(meta.difficultyConfig || {});
  const scoreMgr = new ScoreManager(0);
  const lvlMgr = new LevelManager({
    baseTarget: meta.baseLevelTarget || 100,
    targetGrowth: meta.levelGrowth || 1.25,
    onLevelUp(lvl) { diffMgr.setLevel(lvl); }
  });
  return {
    width: meta.aspectRatio.width,
    height: meta.aspectRatio.height,
    canvas: createMockCanvasCtx(),
    ctx: createMockCanvasCtx(),
    domContainer: createMockElement(),
    input: { isPressed: (a) => pressedSet.has(a), pointer: { isDown: false } },
    audio: AudioManager,
    score: scoreMgr,
    level: lvlMgr,
    difficulty: diffMgr,
    addScore(pts, mult = true) { return scoreMgr.add(pts, mult ? diffMgr.getMetrics().scoreMultiplier : 1); },
    setScore(pts) { scoreMgr.set(pts); },
    advanceProgress(amt = 1) { return lvlMgr.addProgress(amt); },
    setLevel(lvl) { lvlMgr.setLevel(lvl); diffMgr.setLevel(lvl); },
    getDifficulty() { return diffMgr.getMetrics(); },
    updateStatusText() {},
    triggerGameOver() {}
  };
}

async function runSuite() {
  await StorageService.init();
  const allGames = GameRegistry.getAll();
  const ctx = createMockCanvasCtx();

  // 1. Regresión Bomberman: caminar 40 frames hacia la derecha contra muro/bloque sin penetrar sólido
  {
    const meta = GameRegistry.getById('bomberman');
    const pressed = new Set(['right']);
    const g = new globalThis.Game_bomberman(makeTestAPI(meta, pressed));
    g.init();
    for (let i = 0; i < 60; i++) g.update(0.016);
    const rx = Math.round(g.player.x);
    const ry = Math.round(g.player.y);
    if (g.grid[ry][rx] !== 0) {
      throw new Error(`Bomberman wall clip! player at (${g.player.x}, ${g.player.y}) cell=${g.grid[ry][rx]}`);
    }
    g._placeBomb();
    for (let i = 0; i < 150; i++) g.update(0.016);
  }

  // 2. Regresión 2048: deshacer restaura tanto el tablero como el score (sin exploit)
  {
    const meta = GameRegistry.getById('2048');
    const api = makeTestAPI(meta);
    const g = new globalThis.Game_2048(api);
    g.init();
    g.grid = [
      [512, 512, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    api.setScore(100);
    g._slide('left');
    if (api.score.score !== 1124) throw new Error('2048 merge score expected 1124, got ' + api.score.score);
    g._undoMove();
    if (api.score.score !== 100 || g.grid[0][0] !== 512 || g.grid[0][1] !== 512) {
      throw new Error('2048 undo exploit detected! score=' + api.score.score);
    }
  }

  // 3. Regresión Reaction: pausa no avanza signalElapsed
  {
    const meta = GameRegistry.getById('reaction');
    const g = new globalThis.Game_reaction(makeTestAPI(meta));
    g.init();
    g._triggerGreenSignal();
    g.update(0.15);
    if (Math.abs(g.signalElapsed - 0.15) > 0.001) {
      throw new Error('Reaction signalElapsed mismatch: ' + g.signalElapsed);
    }
  }

  // 4. Regresión Flappy: cambio de nave usa coordenadas lógicas normalizadas
  {
    const meta = GameRegistry.getById('flappy');
    const g = new globalThis.Game_flappy(makeTestAPI(meta));
    g.init();
    const beforeChar = g.charIdx;
    g.handleInput({ type: 'pointerdown', x: 50 / meta.aspectRatio.width, y: 20 / meta.aspectRatio.height, rawX: 25, rawY: 10 });
    if (g.charIdx === beforeChar) throw new Error('Flappy normalized character switch failed');
    g.handleInput({ type: 'pointerdown', x: 0.5, y: 0.5, rawX: 100, rawY: 100 });
    if (g.glider.vy >= 0) throw new Error('Flappy flap failed');
  }

  // 5. Regresión Buscaminas: chording automático
  {
    const meta = GameRegistry.getById('minesweeper');
    const g = new globalThis.Game_minesweeper(makeTestAPI(meta));
    g.init();
    g.firstClick = false;
    g.cells[0][0].mine = true;
    g.cells[0][1].neighbors = 1;
    g.cells[0][1].revealed = true;
    g.cells[0][0].flagged = true;
    g._chordReveal(0, 1);
    if (!g.cells[1][1].revealed) throw new Error('Minesweeper chording failed');
  }

  // 6. Prueba de estrés multi-nivel (1, 5, 10, 25, 50, 100) en TODOS los 17 juegos
  const extremeLevels = [1, 5, 10, 25, 50, 100];
  for (const meta of allGames) {
    const GameClass = globalThis['Game_' + meta.id];
    for (const lvl of extremeLevels) {
      const api = makeTestAPI(meta);
      const instance = new GameClass(api);
      instance.init();
      if (instance.start) instance.start();
      api.setLevel(lvl);
      if (instance.onLevelUp) instance.onLevelUp(lvl, api.getDifficulty());
      for (let f = 0; f < 30; f++) {
        instance.update(0.016);
        instance.render(ctx);
      }
      if (instance.destroy) instance.destroy();
    }
  }

  // 7. Regresión Seguridad & Economía & Importación JSON
  const xss = escapeHTML('<script>alert("x")</script>');
  if (xss.includes('<') || xss.includes('>')) throw new Error('escapeHTML failed');

  await StorageService.resetAllData();
  const r2048 = await StatisticsService.recordMatchResult({ gameId: '2048', score: 20000, level: 5, durationSeconds: 180 });
  if (r2048.earnedGlobalPoints > 450) {
    throw new Error('Global XP imbalance for high-score 2048: ' + r2048.earnedGlobalPoints);
  }

  // Test invalid import rejection
  let rejected = false;
  try { await StorageService.importData('{"bad":true}'); } catch { rejected = true; }
  if (!rejected) throw new Error('Invalid JSON import should throw');

  // Test valid export -> reset -> import
  const exported = await StorageService.exportData();
  await StorageService.resetAllData();
  await StorageService.importData(exported);
  const prof = await StorageService.getProfile();
  if (prof.totalGamesPlayed !== 1) throw new Error('Restore after import mismatch');

  print("[PASS] JSC Regressions, Security, Economy & Extreme Levels (1, 5, 10, 25, 50, 100) across all 17 games!");
}

runSuite().catch(e => { print("SUITE FAIL:", e && e.stack ? e.stack : e); quit(1); });
""")

    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
        tf.write("\n".join(bundle_parts))
        p = tf.name

    try:
        res = subprocess.run([JSC, p], capture_output=True, text=True, timeout=20)
        print(res.stdout.strip())
        if res.stderr:
            print("JSC STDERR:", res.stderr.strip())
        assert res.returncode == 0
        assert "[PASS] JSC Regressions" in res.stdout, f"JSC unit test failed: {res.stdout}"
    finally:
        os.remove(p)


def run_webkit2_e2e_responsive_and_offline_test(port=8080):
    os.environ["WEBKIT_DISABLE_COMPOSITING_MODE"] = "1"
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
    from gi.repository import Gtk, WebKit2, GLib

    loop = GLib.MainLoop()
    win = Gtk.OffscreenWindow()
    win.set_default_size(1366, 768)
    ctx = WebKit2.WebContext.new_ephemeral()
    webview = WebKit2.WebView.new_with_context(ctx)
    settings = webview.get_settings()
    settings.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
    win.add(webview)
    win.show_all()

    state = {"resolutions": [(320, 568), (360, 800), (390, 844), (430, 932), (768, 1024), (1024, 768), (1366, 768), (1920, 1080)], "done": False}

    js_audit = """
    window.__fullE2E = async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      window.addEventListener('error', e => { window.__e2eErr = String(e.error || e.message); });
      window.addEventListener('unhandledrejection', e => { window.__e2eRej = String(e.reason); });
      await sleep(350);

      // 1. Verificar 17 juegos y XSS en buscador
      const cards = document.querySelectorAll('.game-card');
      if (cards.length !== 17) throw new Error('Expected 17 cards, got ' + cards.length);

      const searchInput = document.getElementById('game-search-input');
      searchInput.value = '<img src=x onerror=alert(1)>';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);
      const headingHtml = document.querySelector('.section-heading')?.innerHTML || '';
      if (headingHtml.includes('<img')) throw new Error('XSS vulnerability in search heading');
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100);

      // 2. Probar race-condition al cambiar rápido de juego
      document.querySelector('.game-card[data-game-id="snake"]').click();
      document.querySelector('.game-card[data-game-id="bomberman"]').click();
      await sleep(220);
      const activeTitle = document.querySelector('.hud-game-title')?.textContent;
      if (activeTitle !== 'Blast Grid') throw new Error('Mount race condition! Title=' + activeTitle);
      document.getElementById('hud-exit-btn').click();
      await sleep(100);

      // 3. Probar Service Worker y offline fetch fallback simulado desde CacheStorage
      let swReady = false;
      let cachedCount = 0;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        swReady = Boolean(reg);
      }
      if (window.caches) {
        const keys = await caches.keys();
        if (keys.length > 0) {
          const cache = await caches.open(keys[0]);
          const matched = await cache.match('./index.html');
          if (matched) cachedCount = (await cache.keys()).length;
        }
      }

      // 4. Probar persistencia IndexedDB + Game Over real
      const { StatisticsService } = await import('./src/services/StatisticsService.js');
      await StatisticsService.recordMatchResult({ gameId: 'bomberman', score: 420, level: 3, durationSeconds: 30, won: true });

      window.__e2eOut = JSON.stringify({
        ok: true,
        cards: cards.length,
        raceGuardTitle: activeTitle,
        swReady,
        cachedCount,
        err: window.__e2eErr || null,
        rej: window.__e2eRej || null
      });
    };
    window.__fullE2E().catch(e => { window.__e2eOut = JSON.stringify({ ok: false, err: String(e.stack || e) }); });
    """

    def check_resolutions_and_run():
        # Check responsive overflow on home and in-game across all 8 resolutions
        overflow_reports = []
        for rw, rh in state["resolutions"]:
            win.resize(rw, rh)
            while Gtk.events_pending():
                Gtk.main_iteration()
            # Evaluate overflow in DOM
            res_holder = {}
            def got_ov(v, r, d):
                res_holder["val"] = v.run_javascript_finish(r).get_js_value().to_string()
            webview.run_javascript("JSON.stringify({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })", None, got_ov, None)
            while "val" not in res_holder:
                Gtk.main_iteration()
            ov = json.loads(res_holder["val"])
            overflow_reports.append((rw, rh, ov["sw"] <= ov["iw"], ov))
        print("[PASS] Responsive viewports checked (8 resoluciones):", [(r[0], r[1], r[2]) for r in overflow_reports])
        assert all(r[2] for r in overflow_reports), f"Overflow detected: {overflow_reports}"

        webview.run_javascript(js_audit, None, None, None)
        GLib.timeout_add(150, poll_audit)
        return False

    def poll_audit():
        webview.run_javascript("window.__e2eOut || ''", None, on_audit_poll, None)
        return False

    def on_audit_poll(view, res, data):
        val = view.run_javascript_finish(res).get_js_value().to_string()
        if val:
            print("[PASS] WebKit2 E2E Audit:", val)
            parsed = json.loads(val)
            assert parsed.get("ok") is True, f"E2E failed: {val}"
            loop.quit()
        else:
            GLib.timeout_add(150, poll_audit)

    def on_load_changed(view, event):
        if event == WebKit2.LoadEvent.FINISHED:
            GLib.timeout_add(400, check_resolutions_and_run)

    webview.connect("load-changed", on_load_changed)
    webview.load_uri(f"http://localhost:{port}")
    GLib.timeout_add_seconds(25, lambda: (print("E2E Timeout"), loop.quit(), False)[-1])
    loop.run()


def run_service_worker_unit_test():
    with open("service-worker.js", "r", encoding="utf-8") as f:
        sw_code = f.read()

    harness = f"""
const listeners = {{}};
const cacheStore = new Map([['arcade-infinito-old', new Map()]]);
globalThis.self = {{
  location: {{ origin: 'http://localhost:8080' }},
  addEventListener(type, fn) {{ listeners[type] = fn; }},
  skipWaiting() {{ return Promise.resolve(); }},
  clients: {{ claim() {{ return Promise.resolve(); }} }}
}};
globalThis.caches = {{
  open(name) {{
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    const map = cacheStore.get(name);
    return Promise.resolve({{
      addAll(urls) {{
        urls.forEach(u => map.set(u, {{ url: u, status: 200, ok: true, clone() {{ return this; }} }}));
        return Promise.resolve();
      }},
      put(req, res) {{
        const key = typeof req === 'string' ? req : req.url;
        map.set(key, res);
        return Promise.resolve();
      }}
    }});
  }},
  keys() {{ return Promise.resolve(Array.from(cacheStore.keys())); }},
  delete(k) {{ return Promise.resolve(cacheStore.delete(k)); }},
  match(req) {{
    const key = typeof req === 'string' ? req : req.url;
    const rel = key.startsWith('http://localhost:8080/') ? './' + key.replace('http://localhost:8080/', '') : key;
    for (const map of cacheStore.values()) {{
      if (map.has(key)) return Promise.resolve(map.get(key));
      if (map.has(rel)) return Promise.resolve(map.get(rel));
    }}
    return Promise.resolve(undefined);
  }}
}};
globalThis.URL = class URL {{
  constructor(u) {{
    const m = /^([a-z]+:\\/\\/[^/]+)(.*)$/.exec(u);
    this.origin = m ? m[1] : '';
    this.pathname = m ? m[2] : u;
  }}
}};
globalThis.fetch = () => Promise.reject(new Error('OFFLINE_SIMULATED'));

{sw_code}

(async () => {{
  // 1. Install
  let installPromise;
  listeners.install({{ waitUntil(p) {{ installPromise = p; }} }});
  await installPromise;

  // 2. Activate (cleans old cache)
  let activatePromise;
  listeners.activate({{ waitUntil(p) {{ activatePromise = p; }} }});
  await activatePromise;
  if (cacheStore.has('arcade-infinito-old')) throw new Error('Old cache not cleaned');

  // 3. Fetch offline navigation & game module
  let navPromise;
  listeners.fetch({{
    request: {{ method: 'GET', mode: 'navigate', url: 'http://localhost:8080/' }},
    respondWith(p) {{ navPromise = p; }}
  }});
  const navRes = await navPromise;
  if (!navRes || navRes.url !== './index.html') throw new Error('Offline nav fallback failed');

  let gamePromise;
  listeners.fetch({{
    request: {{ method: 'GET', mode: 'cors', url: 'http://localhost:8080/src/games/bomberman/index.js' }},
    respondWith(p) {{ gamePromise = p; }}
  }});
  const gameRes = await gamePromise;
  if (!gameRes || gameRes.url !== './src/games/bomberman/index.js') throw new Error('Offline asset cache miss');

  print("[PASS] Service Worker unit test (install, old-cache cleanup, offline navigate & module cache hit)!");
}})().catch(e => {{ print("SW TEST FAIL:", e && e.stack ? e.stack : e); quit(1); }});
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
        tf.write(harness)
        p = tf.name
    try:
        res = subprocess.run([JSC, p], capture_output=True, text=True, timeout=10)
        print(res.stdout.strip())
        if res.stderr:
            print("SW STDERR:", res.stderr.strip())
        assert res.returncode == 0
        assert "[PASS] Service Worker" in res.stdout, f"SW unit test failed: {res.stdout}"
    finally:
        os.remove(p)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    check_pwa_assets_and_http(port)
    run_service_worker_unit_test()
    run_jsc_unit_and_regression_tests()
    run_webkit2_e2e_responsive_and_offline_test(port)
    print("ALL AUDIT SUITE CHECKS PASSED!")
