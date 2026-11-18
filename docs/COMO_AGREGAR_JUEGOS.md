# Guía de Arquitectura: Cómo Desarrollar e Incorporar un Nuevo Minijuego

`ARCADE INFINITO` cuenta con una arquitectura desacoplada donde el motor central (`GameEngine`), el almacenamiento (`StorageService`), el sistema de dificultad infinita (`DifficultyManager`), el audio sintetizado (`AudioManager`) y la biblioteca (`GameRegistry`) funcionan de forma independiente a cada juego.

Agregar el juego número 13, 25 o 50 (como *Doodle Jump-like*, *Whack-a-Mole*, *Simon Says*, *Endless Runner*, *Bubble Shooter* o *Sudoku*) **no requiere modificar el motor ni la interfaz principal**.

---

## Paso 1: Crear el módulo del juego en `/src/games/<id>/index.js`

Cada juego exporta por defecto una clase que recibe el objeto `api` inyectado por `GameEngine`:

```js
export default class MiNuevoJuego {
  constructor(api) {
    this.api = api;
  }

  // Se ejecuta una vez al montar el lienzo
  init() {
    this.restart();
  }

  // Opcional: arranque explícito
  start() {}

  // Reinicia la partida al nivel 1 sin recrear el Canvas
  restart() {
    this.api.updateStatusText('1.0x');
  }

  // Se ejecuta en cada fotograma con deltaTime en segundos (acotado a <= 0.05s)
  update(dt) {
    const diff = this.api.getDifficulty(); // { level, speed, speedMultiplier, isReliefWave, ... }
    // Lógica de movimiento y colisiones...
  }

  // Dibuja el estado actual en el contexto 2D del Canvas
  render(ctx) {
    ctx.fillStyle = '#080c1a';
    ctx.fillRect(0, 0, this.api.width, this.api.height);
  }

  // Recibe eventos de teclado, mouse, gestos swipe/tap y botones virtuales móviles
  handleInput(evt) {
    // evt.type: 'keydown' | 'keyup' | 'pointerdown' | 'pointermove' | 'pointerup' | 'swipe' | 'virtualdown'
    // evt.action: 'up' | 'down' | 'left' | 'right' | 'action' | 'secondary' | 'tap'
  }

  // Gancho opcional cuando el jugador sube de nivel
  onLevelUp(newLevel, difficultyMetrics) {}

  // Limpieza adicional si el juego reservó estructuras propias
  destroy() {}
}
```

### API proporcionada al juego (`this.api`)

- `this.api.width` / `this.api.height`: Dimensiones lógicas del lienzo.
- `this.api.addScore(puntos, aplicarMultiplicadorDificultad = true)`: Suma puntos, actualiza el HUD en vivo y detecta nuevos récords.
- `this.api.advanceProgress(cantidad)`: Avanza hacia la meta del siguiente nivel; al completarse sube automáticamente de nivel y ajusta la curva en `DifficultyManager`.
- `this.api.setLevel(nivel)`: Fija manualmente el nivel actual.
- `this.api.getDifficulty()`: Devuelve `{ level, speed, speedMultiplier, densityMultiplier, scoreMultiplier, isReliefWave, isBossOrSpecialWave, aiPrecision }`.
- `this.api.audio.play(efecto)`: Reproduce sonidos sintéticos (`'start'`, `'pickup'`, `'point'`, `'bounce'`, `'hit'`, `'brick'`, `'laser'`, `'jump'`, `'flip'`, `'merge'`, `'explosion'`, `'levelUp'`, `'gameOver'`).
- `this.api.triggerGameOver({ reason, won, bestTimeMs, extraStats })`: Finaliza la partida, guarda récords/estadísticas en IndexedDB, evalúa logros y muestra la pantalla de resultados.

---

## Paso 2: Registrar el juego en `/src/engine/GameRegistry.js`

Añade la declaración del juego llamando a `GameRegistry.register(...)`:

```js
GameRegistry.register({
  id: 'simon',
  name: 'Pulse Sequence',
  subtitle: 'Simon Says — Memoria Auditiva',
  description: 'Repite secuencias lumínicas y sonoras cada vez más veloces.',
  category: 'Memoria',
  categories: ['logic', 'skill', 'arcade'],
  featured: false,
  badge: 'Nuevo',
  accentColor: '#00f5d4',
  orientation: 'square',
  aspectRatio: { width: 600, height: 600 },
  touchLayout: 'board', // 'dpad' | 'horizontal-fire' | 'asteroids' | 'tetris' | 'horizontal-paddle' | 'vertical-paddle' | 'tap-only' | 'board'
  baseLevelTarget: 100,
  levelGrowth: 1.25,
  difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.5, growthRate: 0.12 },
  controls: {
    desktop: 'Clic o teclas 1-4 para repetir la secuencia',
    mobile: 'Toca los paneles luminosos en el mismo orden'
  },
  svgArt: `<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg">...</svg>`,
  loadModule: () => import('../games/simon/index.js').then((m) => m.default)
});
```

---

## Paso 3: Añadir la ruta al precaché del Service Worker

Agrega `'./src/games/<id>/index.js'` al arreglo `PRECACHE_ASSETS` en `/service-worker.js` e incrementa `CACHE_NAME` para garantizar su disponibilidad inmediata sin conexión.
