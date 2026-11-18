/**
 * Registro Central de Minijuegos.
 * Permite registrar, consultar y cargar bajo demanda cualquier minijuego sin acoplar el núcleo.
 */
class GameRegistryClass {
  constructor() {
    this.games = new Map();
  }

  register(definition) {
    if (!definition || !definition.id) {
      throw new Error('Cada minijuego requiere un ID único.');
    }
    this.games.set(definition.id, {
      featured: false,
      badge: null,
      orientation: 'landscape',
      aspectRatio: { width: 800, height: 560 },
      touchLayout: 'dpad',
      baseLevelTarget: 100,
      levelGrowth: 1.25,
      difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.6, growthRate: 0.14 },
      ...definition
    });
  }

  getAll() {
    return Array.from(this.games.values());
  }

  getById(id) {
    return this.games.get(id) || null;
  }

  filter({ category = 'all', query = '', favorites = [] } = {}) {
    const q = query.trim().toLowerCase();
    return this.getAll().filter((g) => {
      if (category === 'favorites' && !favorites.includes(g.id)) {
        return false;
      }
      if (category !== 'all' && category !== 'favorites') {
        const cats = g.categories || [g.category];
        if (!cats.includes(category)) return false;
      }
      if (q) {
        const haystack = `${g.name} ${g.subtitle || ''} ${g.description} ${(g.categories || []).join(' ')}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }
}

export const GameRegistry = new GameRegistryClass();

/* ============================================================================
 * REGISTRO DE LOS 12 MINIJUEGOS ORIGINALES DE LA PRIMERA VERSIÓN
 * ============================================================================ */

const INITIAL_GAMES = [
  {
    id: 'snake',
    name: 'Neon Viper',
    subtitle: 'Snake — El Gusano',
    description: 'Controla la serpiente cibernética, absorbe núcleos de energía, esquiva barreras láser y sobrevive a velocidades extremas.',
    category: 'Clásicos',
    categories: ['arcade', 'classics', 'survival'],
    featured: true,
    badge: 'Destacado',
    accentColor: '#00f5d4',
    orientation: 'square',
    aspectRatio: { width: 640, height: 640 },
    touchLayout: 'dpad-only',
    baseLevelTarget: 60,
    levelGrowth: 1.22,
    difficultyConfig: { baseSpeed: 7.5, maxSpeedMultiplier: 2.5, growthRate: 0.13 },
    controls: {
      desktop: 'Flechas o WASD para girar · P o Esc para pausar',
      mobile: 'Desliza el dedo o usa la cruceta direccional en pantalla'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cov-snake-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#04101d"/><stop offset="100%" stop-color="#0b1f33"/></linearGradient>
        <radialGradient id="cov-snake-glow"><stop offset="0%" stop-color="#ff2a85" stop-opacity="0.7"/><stop offset="100%" stop-color="#ff2a85" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="240" height="140" fill="url(#cov-snake-bg)"/>
      <g stroke="#113247" stroke-width="1" opacity="0.7">
        <line x1="0" y1="28" x2="240" y2="28"/><line x1="0" y1="56" x2="240" y2="56"/><line x1="0" y1="84" x2="240" y2="84"/><line x1="0" y1="112" x2="240" y2="112"/>
        <line x1="40" y1="0" x2="40" y2="140"/><line x1="80" y1="0" x2="80" y2="140"/><line x1="120" y1="0" x2="120" y2="140"/><line x1="160" y1="0" x2="160" y2="140"/><line x1="200" y1="0" x2="200" y2="140"/>
      </g>
      <rect x="46" y="24" width="22" height="22" rx="4" fill="#1e1b4b" stroke="#f43f5e" stroke-width="2"/>
      <line x1="51" y1="29" x2="63" y2="41" stroke="#fb7185" stroke-width="1.5"/><line x1="63" y1="29" x2="51" y2="41" stroke="#fb7185" stroke-width="1.5"/>
      <path d="M26 106 C46 106, 54 88, 70 88 C90 88, 92 52, 114 52 C136 52, 134 80, 158 76" fill="none" stroke="#0d9488" stroke-width="18" stroke-linecap="round"/>
      <path d="M26 106 C46 106, 54 88, 70 88 C90 88, 92 52, 114 52 C136 52, 134 80, 158 76" fill="none" stroke="#2dd4bf" stroke-width="8" stroke-dasharray="10 8" stroke-linecap="round"/>
      <polygon points="154,64 182,74 154,88 144,76" fill="#2dd4bf" stroke="#ccfbf1" stroke-width="1.5"/>
      <path d="M180 74 L192 74 L198 69 M192 74 L198 79" stroke="#fb7185" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="164" cy="70" r="2.6" fill="#fde047"/><circle cx="164" cy="80" r="2.6" fill="#fde047"/>
      <circle cx="206" cy="74" r="22" fill="url(#cov-snake-glow)"/>
      <circle cx="206" cy="75" r="10" fill="#e11d48"/>
      <circle cx="203" cy="71" r="3" fill="#fda4af"/>
      <ellipse cx="209" cy="63" rx="5" ry="2.6" transform="rotate(-25 209 63)" fill="#34d399"/>
    </svg>`,
    loadModule: () => import('../games/snake/index.js').then((m) => m.default)
  },
  {
    id: 'pacman',
    name: 'Cyber Maze',
    subtitle: 'Laberinto Arcade',
    description: 'Recorre laberintos cambiantes, recolecta cristales de datos, activa pulsos PEM para devorar centinelas y avanza sin fin.',
    category: 'Clásicos',
    categories: ['arcade', 'classics', 'survival'],
    featured: true,
    badge: 'Clásico',
    accentColor: '#ffbe0b',
    orientation: 'square',
    aspectRatio: { width: 608, height: 608 },
    touchLayout: 'dpad-only',
    baseLevelTarget: 150,
    levelGrowth: 1.2,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.1, growthRate: 0.11 },
    controls: {
      desktop: 'Flechas o WASD para cambiar de pasillo',
      mobile: 'Desliza hacia el pasillo o mantén los botones direccionales'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cov-pac-glow"><stop offset="0%" stop-color="#facc15" stop-opacity="0.45"/><stop offset="100%" stop-color="#facc15" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="240" height="140" fill="#070518"/>
      <path d="M12 16 H228 V124 H12 Z" fill="none" stroke="#5b21b6" stroke-width="4"/>
      <rect x="28" y="30" width="68" height="18" rx="4" fill="#140e38" stroke="#7c5dfa" stroke-width="2.5"/>
      <rect x="144" y="30" width="68" height="18" rx="4" fill="#140e38" stroke="#7c5dfa" stroke-width="2.5"/>
      <rect x="28" y="96" width="68" height="16" rx="4" fill="#140e38" stroke="#7c5dfa" stroke-width="2.5"/>
      <rect x="144" y="96" width="68" height="16" rx="4" fill="#140e38" stroke="#7c5dfa" stroke-width="2.5"/>
      <circle cx="62" cy="72" r="24" fill="url(#cov-pac-glow)"/>
      <path d="M62 72 L78 60 A19 19 0 1 0 78 84 Z" fill="#facc15" stroke="#fef08a" stroke-width="1.5"/>
      <circle cx="64" cy="60" r="3" fill="#090619"/><circle cx="65" cy="59" r="1" fill="#fff"/>
      <polygon points="96,68 100,72 96,76 92,72" fill="#22d3ee"/>
      <polygon points="116,68 120,72 116,76 112,72" fill="#22d3ee"/>
      <circle cx="138" cy="72" r="7" fill="#ff2a85"/><circle cx="138" cy="72" r="11" fill="none" stroke="#fda4af" stroke-width="1.5" stroke-dasharray="16 8"/>
      <path d="M158 84 V68 A14 14 0 0 1 186 68 V84 L181 80 L176 85 L172 80 L167 85 L162 80 Z" fill="#ff2a85"/>
      <ellipse cx="167" cy="68" rx="3" ry="4" fill="#fff"/><ellipse cx="177" cy="68" rx="3" ry="4" fill="#fff"/>
      <circle cx="166" cy="68" r="1.6" fill="#0f172a"/><circle cx="176" cy="68" r="1.6" fill="#0f172a"/>
      <path d="M194 84 V70 A12 12 0 0 1 218 70 V84 L214 80 L210 85 L206 80 L202 85 L198 80 Z" fill="#00bbf9"/>
      <ellipse cx="202" cy="69" rx="2.6" ry="3.5" fill="#fff"/><ellipse cx="210" cy="69" rx="2.6" ry="3.5" fill="#fff"/>
      <circle cx="201" cy="69" r="1.4" fill="#0f172a"/><circle cx="209" cy="69" r="1.4" fill="#0f172a"/>
    </svg>`,
    loadModule: () => import('../games/pacman/index.js').then((m) => m.default)
  },
  {
    id: 'pong',
    name: 'Hyper Pong',
    subtitle: 'Tenis Láser & Supervivencia',
    description: 'Duelo de alta velocidad contra una IA adaptativa. Incluye modo Clásico y Supervivencia con barreras reflectoras.',
    category: 'Arcade',
    categories: ['arcade', 'classics', 'reflex'],
    featured: false,
    badge: '2 Modos',
    accentColor: '#00bbf9',
    orientation: 'landscape',
    aspectRatio: { width: 800, height: 500 },
    touchLayout: 'vertical-paddle',
    baseLevelTarget: 50,
    levelGrowth: 1.25,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.4, growthRate: 0.13 },
    controls: {
      desktop: 'Flechas Arriba/Abajo, W/S o arrastrar con ratón · M para cambiar modo',
      mobile: 'Desliza verticalmente sobre el escenario, usa el deslizador o ▲/▼'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cov-pong-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#040918"/><stop offset="100%" stop-color="#0d132e"/></linearGradient>
        <radialGradient id="cov-pong-orb"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.7"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="240" height="140" fill="url(#cov-pong-bg)"/>
      <rect x="8" y="8" width="224" height="124" rx="8" fill="none" stroke="rgba(0,245,212,0.3)" stroke-width="2"/>
      <circle cx="120" cy="70" r="30" fill="none" stroke="rgba(56,189,248,0.22)" stroke-width="2"/>
      <line x1="120" y1="10" x2="120" y2="130" stroke="rgba(0,245,212,0.3)" stroke-width="2" stroke-dasharray="7 7"/>
      <rect x="16" y="42" width="7" height="6" fill="#38bdf8"/><rect x="16" y="82" width="7" height="6" fill="#38bdf8"/>
      <rect x="23" y="34" width="12" height="62" rx="5" fill="#0f172a" stroke="#00f5d4" stroke-width="2.5"/>
      <rect x="31" y="40" width="3" height="50" fill="#00f5d4"/>
      <rect x="217" y="54" width="7" height="6" fill="#fb923c"/><rect x="217" y="94" width="7" height="6" fill="#fb923c"/>
      <rect x="205" y="46" width="12" height="62" rx="5" fill="#0f172a" stroke="#ff2a85" stroke-width="2.5"/>
      <rect x="206" y="52" width="3" height="50" fill="#ff2a85"/>
      <rect x="114" y="92" width="12" height="28" rx="4" fill="#1e293b" stroke="#facc15" stroke-width="2"/>
      <path d="M40 62 L148 56" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
      <circle cx="152" cy="56" r="20" fill="url(#cov-pong-orb)"/>
      <circle cx="152" cy="56" r="9" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="152" cy="56" r="3.5" fill="#0ea5e9"/>
    </svg>`,
    loadModule: () => import('../games/pong/index.js').then((m) => m.default)
  },
  {
    id: 'breakout',
    name: 'Prism Breaker',
    subtitle: 'Rompe Ladrillos',
    description: 'Destruye formaciones cristalinas con pelotas múltiples, cañones láser, bloques blindados y patrones infinitos.',
    category: 'Arcade',
    categories: ['arcade', 'classics', 'skill'],
    featured: true,
    badge: 'Popular',
    accentColor: '#ff2a85',
    orientation: 'landscape',
    aspectRatio: { width: 760, height: 560 },
    touchLayout: 'horizontal-paddle',
    baseLevelTarget: 120,
    levelGrowth: 1.28,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.3, growthRate: 0.12 },
    controls: {
      desktop: 'Flechas Izq/Der, A/D o Ratón · Espacio para lanzar bola',
      mobile: 'Arrastra el dedo horizontalmente para mover la plataforma y toca para lanzar'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cov-brk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#070514"/><stop offset="100%" stop-color="#190b2c"/></linearGradient></defs>
      <rect width="240" height="140" fill="url(#cov-brk-bg)"/>
      <g stroke="rgba(139,92,246,0.12)" stroke-width="1"><line x1="60" y1="0" x2="60" y2="140"/><line x1="120" y1="0" x2="120" y2="140"/><line x1="180" y1="0" x2="180" y2="140"/></g>
      <g stroke="#0f172a" stroke-width="1.5">
        <rect x="22" y="18" width="46" height="16" rx="3" fill="#ff2a85"/><rect x="72" y="18" width="46" height="16" rx="3" fill="#ff9e00"/><rect x="122" y="18" width="46" height="16" rx="3" fill="#00f5d4"/><rect x="172" y="18" width="46" height="16" rx="3" fill="#9b5de5"/>
        <rect x="22" y="38" width="46" height="16" rx="3" fill="#00bbf9"/><rect x="72" y="38" width="46" height="16" rx="3" fill="#facc15"/><rect x="172" y="38" width="46" height="16" rx="3" fill="#ff2a85"/>
      </g>
      <g fill="rgba(255,255,255,0.28)"><rect x="25" y="20" width="40" height="4" rx="1"/><rect x="75" y="20" width="40" height="4" rx="1"/><rect x="125" y="20" width="40" height="4" rx="1"/><rect x="175" y="20" width="40" height="4" rx="1"/></g>
      <circle cx="145" cy="46" r="5" fill="#ffffff"/>
      <polygon points="132,62 138,56 142,64" fill="#38bdf8"/><polygon points="154,66 160,60 162,69" fill="#facc15"/>
      <rect x="80" y="76" width="3" height="14" fill="#fde047"/><rect x="157" y="76" width="3" height="14" fill="#fde047"/>
      <circle cx="136" cy="78" r="8" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/><circle cx="134" cy="76" r="3" fill="#fff"/>
      <rect x="76" y="106" width="5" height="8" fill="#facc15"/><rect x="159" y="106" width="5" height="8" fill="#facc15"/>
      <rect x="74" y="112" width="92" height="14" rx="6" fill="#1e293b" stroke="#00f5d4" stroke-width="2"/>
      <rect x="72" y="111" width="14" height="16" rx="5" fill="#00f5d4"/><rect x="154" y="111" width="14" height="16" rx="5" fill="#00f5d4"/>
      <rect x="102" y="116" width="36" height="6" rx="2" fill="#e0f2fe"/>
    </svg>`,
    loadModule: () => import('../games/breakout/index.js').then((m) => m.default)
  },
  {
    id: 'spaceinvaders',
    name: 'Nova Defenders',
    subtitle: 'Space Invaders',
    description: 'Defiende la órbita de escuadrones alienígenas con distintos comportamientos, escudos de plasma y naves nodriza jefe.',
    category: 'Arcade',
    categories: ['arcade', 'classics', 'survival'],
    featured: true,
    badge: 'Jefes',
    accentColor: '#9b5de5',
    orientation: 'landscape',
    aspectRatio: { width: 760, height: 580 },
    touchLayout: 'horizontal-fire',
    baseLevelTarget: 150,
    levelGrowth: 1.3,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.5, growthRate: 0.13 },
    controls: {
      desktop: 'Flechas Izq/Der o A/D para mover · Espacio para disparar',
      mobile: 'Botones Izq/Der + Disparo o arrastrar nave en pantalla'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="140" fill="#050816"/>
      <g fill="#fff" opacity="0.5"><rect x="22" y="18" width="2" height="2"/><rect x="195" y="22" width="2" height="2"/><rect x="72" y="55" width="2" height="2"/><rect x="210" y="96" width="2" height="2"/></g>
      <g transform="translate(46,24)" fill="#ff2a85">
        <rect x="8" y="0" width="12" height="4"/><rect x="4" y="4" width="20" height="8"/><rect x="0" y="8" width="28" height="4"/>
        <rect x="6" y="6" width="4" height="4" fill="#050816"/><rect x="18" y="6" width="4" height="4" fill="#050816"/>
        <rect x="4" y="14" width="4" height="4"/><rect x="20" y="14" width="4" height="4"/>
      </g>
      <g transform="translate(104,20)" fill="#facc15">
        <rect x="4" y="0" width="24" height="4"/><rect x="0" y="4" width="32" height="8"/><rect x="8" y="6" width="4" height="4" fill="#050816"/><rect x="20" y="6" width="4" height="4" fill="#050816"/>
        <rect x="0" y="12" width="6" height="4"/><rect x="26" y="12" width="6" height="4"/>
      </g>
      <g transform="translate(166,24)" fill="#9b5de5">
        <rect x="6" y="0" width="16" height="4"/><rect x="2" y="4" width="24" height="8"/><rect x="8" y="6" width="4" height="4" fill="#050816"/><rect x="16" y="6" width="4" height="4" fill="#050816"/>
        <rect x="4" y="14" width="6" height="4"/><rect x="18" y="14" width="6" height="4"/>
      </g>
      <path d="M118 54 L122 60 L118 66 L122 72" stroke="#ff2a85" stroke-width="2.5" fill="none"/>
      <rect x="119" y="76" width="3" height="16" fill="#fde047"/>
      <path d="M36 92 H64 L70 98 V108 H60 L56 102 H44 L40 108 H30 V98 Z" fill="rgba(6,182,212,0.45)" stroke="#22d3ee" stroke-width="1.5"/>
      <path d="M176 92 H204 L210 98 V108 H200 L196 102 H184 L180 108 H170 V98 Z" fill="rgba(6,182,212,0.45)" stroke="#22d3ee" stroke-width="1.5"/>
      <g transform="translate(100,104)" fill="#00f5d4">
        <rect x="18" y="0" width="4" height="6"/><rect x="14" y="6" width="12" height="6"/><rect x="0" y="12" width="40" height="10" rx="2"/><rect x="8" y="14" width="24" height="4" fill="#e0f2fe"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/spaceinvaders/index.js').then((m) => m.default)
  },
  {
    id: 'asteroids',
    name: 'Void Bastion',
    subtitle: 'Asteroids — Supervivencia Espacial',
    description: 'Rota tu caza estelar, impulsa los propulsores, fragmenta meteoritos gigantes y sobrevive a incursiones de cazadores.',
    category: 'Supervivencia',
    categories: ['arcade', 'classics', 'survival', 'skill'],
    featured: false,
    badge: 'Infinito',
    accentColor: '#00f5d4',
    orientation: 'landscape',
    aspectRatio: { width: 780, height: 560 },
    touchLayout: 'asteroids',
    baseLevelTarget: 140,
    levelGrowth: 1.25,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.35, growthRate: 0.12 },
    controls: {
      desktop: 'Izq/Der rotar · Arriba impulsar · Espacio disparar · Shift hiperespacio',
      mobile: 'Controles táctiles de rotación, propulsor y cañón de plasma'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cov-ast-neb"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="240" height="140" fill="#050814"/>
      <circle cx="70" cy="60" r="80" fill="url(#cov-ast-neb)"/>
      <g fill="#e2e8f0" opacity="0.65"><circle cx="24" cy="24" r="1.2"/><circle cx="144" cy="20" r="1.5"/><circle cx="212" cy="36" r="1.2"/><circle cx="110" cy="116" r="1.4"/></g>
      <g transform="translate(58,48)">
        <polygon points="-24,-12 4,-26 24,-4 16,22 -14,20" fill="#1e293b" stroke="#94a3b8" stroke-width="2.2"/>
        <circle cx="-6" cy="-6" r="5" fill="#0f172a"/><circle cx="8" cy="7" r="3.5" fill="#0f172a"/>
      </g>
      <g transform="translate(188,88)">
        <polygon points="-18,-10 6,-20 22,0 12,18 -14,16" fill="#172554" stroke="#38bdf8" stroke-width="2.2"/>
        <circle cx="-4" cy="-3" r="4" fill="#0c192c"/>
      </g>
      <g transform="translate(182,36)">
        <ellipse cx="0" cy="4" rx="22" ry="7" fill="#334155" stroke="#f43f5e" stroke-width="1.8"/>
        <path d="M-8 0 A8 7 0 0 1 8 0 Z" fill="#38bdf8"/>
      </g>
      <g transform="translate(116,74) rotate(-25)">
        <polygon points="-10,-4 -24,0 -10,4" fill="#fb923c"/>
        <polygon points="18,0 2,-6 -12,-14 -14,-6 -8,0 -14,6 -12,14 2,6" fill="#0f766e" stroke="#2dd4bf" stroke-width="2"/>
        <ellipse cx="3" cy="0" rx="5" ry="2.5" fill="#bae6fd"/>
      </g>
      <circle cx="152" cy="54" r="3" fill="#fef08a"/><circle cx="164" cy="47" r="2.2" fill="#fde047"/>
    </svg>`,
    loadModule: () => import('../games/asteroids/index.js').then((m) => m.default)
  },
  {
    id: 'flappy',
    name: 'Sky Pulse',
    subtitle: 'Vuelo de Habilidad',
    description: 'Impulsa tu dron planeador entre compuertas láser móviles, corrientes de aire y biomas cambiantes. Incluye 3 naves.',
    category: 'Habilidad',
    categories: ['skill', 'arcade', 'reflex'],
    featured: true,
    badge: 'Adicitivo',
    accentColor: '#ff9e00',
    orientation: 'portrait',
    aspectRatio: { width: 480, height: 680 },
    touchLayout: 'tap-pulse',
    baseLevelTarget: 10,
    levelGrowth: 1.18,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.15, growthRate: 0.1 },
    controls: {
      desktop: 'Espacio, Flecha Arriba o Clic para impulsar · C para cambiar nave',
      mobile: 'Toca el botón IMPULSAR o la pantalla · ✈ NAVE para cambiar'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cov-flp-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1026"/><stop offset="100%" stop-color="#1b2b55"/></linearGradient></defs>
      <rect width="240" height="140" fill="url(#cov-flp-bg)"/>
      <circle cx="196" cy="34" r="22" fill="rgba(255,255,255,0.12)"/>
      <polygon points="0,124 38,88 76,124 122,94 166,124 210,86 240,124" fill="#111d3c"/>
      <rect x="148" y="0" width="28" height="42" fill="#0f766e" stroke="#fff" stroke-width="1"/><rect x="157" y="0" width="10" height="42" fill="#00f5d4"/>
      <rect x="144" y="34" width="36" height="10" rx="3" fill="#00f5d4" stroke="#0f172a" stroke-width="1"/>
      <rect x="148" y="92" width="28" height="36" fill="#0f766e" stroke="#fff" stroke-width="1"/><rect x="157" y="92" width="10" height="36" fill="#00f5d4"/>
      <rect x="144" y="90" width="36" height="10" rx="3" fill="#00f5d4" stroke="#0f172a" stroke-width="1"/>
      <circle cx="162" cy="68" r="9" fill="none" stroke="#fde047" stroke-width="2.5"/><rect x="160" y="66" width="4" height="4" fill="#fff"/>
      <rect x="0" y="124" width="240" height="16" fill="#070b18"/><line x1="0" y1="124" x2="240" y2="124" stroke="#00f5d4" stroke-width="2"/>
      <g transform="translate(80,68) rotate(-12)">
        <polygon points="-14,-4 -24,-10 -16,4" fill="#fde047"/>
        <ellipse cx="0" cy="0" rx="16" ry="13" fill="#f97316" stroke="#fef08a" stroke-width="1.5"/>
        <ellipse cx="-4" cy="2" rx="8" ry="4.5" transform="rotate(-15)" fill="#fde047"/>
        <polygon points="14,-3 24,1 14,5" fill="#fde047"/>
        <circle cx="7" cy="-4" r="4" fill="#fff"/><circle cx="8.5" cy="-4" r="2" fill="#0f172a"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/flappy/index.js').then((m) => m.default)
  },
  {
    id: 'tetris',
    name: 'Tetro Flux',
    subtitle: 'Bloques Geométricos',
    description: 'Encaja poliominós luminosos con vista previa, cámara de reserva (Hold), pieza fantasma y combos de tetris infinitos.',
    category: 'Habilidad',
    categories: ['skill', 'logic', 'classics'],
    featured: true,
    badge: 'Clásico',
    accentColor: '#00bbf9',
    orientation: 'portrait',
    aspectRatio: { width: 520, height: 680 },
    touchLayout: 'tetris',
    baseLevelTarget: 10,
    levelGrowth: 1.15,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.8, growthRate: 0.14 },
    controls: {
      desktop: 'Izq/Der mover · Arriba rotar · Abajo bajar · Espacio caída instantánea · C guardar',
      mobile: 'Botones táctiles para mover, rotar, caída rápida y guardar pieza'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="140" fill="#070a18"/>
      <rect x="52" y="10" width="136" height="120" rx="4" fill="#0b1126" stroke="#38bdf8" stroke-width="2.5"/>
      <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
        <line x1="74" y1="10" x2="74" y2="130"/><line x1="96" y1="10" x2="96" y2="130"/><line x1="118" y1="10" x2="118" y2="130"/><line x1="140" y1="10" x2="140" y2="130"/><line x1="162" y1="10" x2="162" y2="130"/>
      </g>
      <g stroke="#0f172a" stroke-width="1.5">
        <rect x="76" y="24" width="20" height="20" rx="3" fill="#00f5d4"/><rect x="96" y="24" width="20" height="20" rx="3" fill="#00f5d4"/><rect x="116" y="24" width="20" height="20" rx="3" fill="#00f5d4"/><rect x="96" y="44" width="20" height="20" rx="3" fill="#00f5d4"/>
        <rect x="56" y="104" width="20" height="20" rx="3" fill="#9b5de5"/><rect x="76" y="104" width="20" height="20" rx="3" fill="#9b5de5"/><rect x="76" y="84" width="20" height="20" rx="3" fill="#facc15"/><rect x="96" y="104" width="20" height="20" rx="3" fill="#facc15"/>
        <rect x="136" y="84" width="20" height="20" rx="3" fill="#ff2a85"/><rect x="156" y="84" width="20" height="20" rx="3" fill="#ff2a85"/><rect x="136" y="104" width="20" height="20" rx="3" fill="#ff9e00"/><rect x="156" y="104" width="20" height="20" rx="3" fill="#ff9e00"/>
      </g>
      <g fill="rgba(255,255,255,0.28)"><rect x="79" y="26" width="14" height="4"/><rect x="99" y="26" width="14" height="4"/><rect x="119" y="26" width="14" height="4"/><rect x="139" y="86" width="14" height="4"/><rect x="159" y="86" width="14" height="4"/></g>
      <rect x="116" y="104" width="20" height="20" rx="3" fill="none" stroke="#00f5d4" stroke-width="1.5" opacity="0.5"/>
    </svg>`,
    loadModule: () => import('../games/tetris/index.js').then((m) => m.default)
  },
  {
    id: 'minesweeper',
    name: 'Quantum Mines',
    subtitle: 'Buscaminas Táctico',
    description: 'Deduce la posición de anomalías cuánticas sin detonar ninguna. Primer toque siempre seguro y progresión infinita.',
    category: 'Lógica',
    categories: ['logic', 'skill'],
    featured: false,
    badge: 'Estrategia',
    accentColor: '#00f5d4',
    orientation: 'square',
    aspectRatio: { width: 640, height: 640 },
    touchLayout: 'board',
    baseLevelTarget: 1,
    levelGrowth: 1,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2, growthRate: 0.1 },
    controls: {
      desktop: 'Clic izquierdo descubrir · Clic derecho para marcar mina',
      mobile: 'Toca para descubrir · Mantén pulsado o usa el botón BANDERA para marcar'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="140" fill="#081020"/>
      <rect x="52" y="18" width="42" height="42" rx="5" fill="#1e3a5f" stroke="rgba(186,230,253,0.35)" stroke-width="2"/>
      <rect x="99" y="18" width="42" height="42" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <rect x="146" y="18" width="42" height="42" rx="5" fill="#1e3a5f" stroke="rgba(186,230,253,0.35)" stroke-width="2"/>
      <rect x="52" y="65" width="42" height="42" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <rect x="99" y="65" width="42" height="42" rx="5" fill="#3b0a20" stroke="#f43f5e" stroke-width="2"/>
      <rect x="146" y="65" width="42" height="42" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="120" y="47" text-anchor="middle" fill="#38bdf8" font-size="22" font-family="monospace" font-weight="bold">2</text>
      <text x="73" y="94" text-anchor="middle" fill="#34d399" font-size="22" font-family="monospace" font-weight="bold">1</text>
      <g transform="translate(167,39)">
        <rect x="-8" y="9" width="16" height="3" fill="#94a3b8"/><rect x="-3" y="-12" width="3" height="22" fill="#e2e8f0"/>
        <polygon points="-1,-12 12,-5 -1,2" fill="#f43f5e"/>
      </g>
      <g transform="translate(120,86)">
        <line x1="-14" y1="0" x2="14" y2="0" stroke="#cbd5e1" stroke-width="2.5"/><line x1="0" y1="-14" x2="0" y2="14" stroke="#cbd5e1" stroke-width="2.5"/>
        <line x1="-10" y1="-10" x2="10" y2="10" stroke="#cbd5e1" stroke-width="2"/><line x1="-10" y1="10" x2="10" y2="-10" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="0" cy="0" r="9" fill="#334155"/><circle cx="0" cy="0" r="4.5" fill="#f43f5e"/><circle cx="-2.5" cy="-2.5" r="1.5" fill="#fff"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/minesweeper/index.js').then((m) => m.default)
  },
  {
    id: 'memory',
    name: 'Neural Match',
    subtitle: 'Memoria Visual',
    description: 'Sincroniza parejas de símbolos arcanos y cibernéticos con combos por velocidad, tableros crecientes y modo reloj opcional.',
    category: 'Lógica',
    categories: ['logic', 'skill'],
    featured: false,
    badge: 'Memoria',
    accentColor: '#ff2a85',
    orientation: 'square',
    aspectRatio: { width: 640, height: 640 },
    touchLayout: 'board',
    baseLevelTarget: 1,
    levelGrowth: 1,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2, growthRate: 0.1 },
    controls: {
      desktop: 'Clic sobre las cartas o usa las flechas + Espacio',
      mobile: 'Toca las cartas para voltearlas y formar parejas'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cov-mem-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#090616"/><stop offset="100%" stop-color="#1d103a"/></linearGradient></defs>
      <rect width="240" height="140" fill="url(#cov-mem-bg)"/>
      <g transform="translate(76,70) rotate(-6)">
        <rect x="-32" y="-44" width="64" height="88" rx="9" fill="#2b1b54" stroke="#00f5d4" stroke-width="2.5"/>
        <rect x="-26" y="-38" width="52" height="76" rx="5" fill="none" stroke="rgba(0,245,212,0.3)" stroke-width="1"/>
        <polygon points="-16,12 -20,-8 -6,2 0,-18 6,2 20,-8 16,12" fill="#facc15" stroke="#fef08a" stroke-width="1.2"/>
        <rect x="-15" y="15" width="30" height="4" rx="2" fill="#facc15"/>
      </g>
      <g transform="translate(164,70) rotate(6)">
        <rect x="-32" y="-44" width="64" height="88" rx="9" fill="#191032" stroke="#ff2a85" stroke-width="2.5"/>
        <rect x="-24" y="-36" width="48" height="72" rx="5" fill="none" stroke="rgba(139,92,246,0.45)" stroke-width="1.5"/>
        <polygon points="0,-18 16,0 0,18 -16,0" fill="none" stroke="#ff2a85" stroke-width="2"/>
        <circle cx="0" cy="0" r="5" fill="#00f5d4"/>
      </g>
      <circle cx="120" cy="30" r="3" fill="#fde047"/><circle cx="120" cy="112" r="2.5" fill="#00f5d4"/>
    </svg>`,
    loadModule: () => import('../games/memory/index.js').then((m) => m.default)
  },
  {
    id: '2048',
    name: 'Cyber Merge 2048',
    subtitle: 'Fusión Numérica Infinita',
    description: 'Desliza y fusiona núcleos de potencia (2, 4, 8... 2048, 4096 y más allá). Incluye tableros 3×3, 4×4 y 5×5 y deshacer.',
    category: 'Lógica',
    categories: ['logic', 'classics'],
    featured: true,
    badge: 'Infinito',
    accentColor: '#ffbe0b',
    orientation: 'square',
    aspectRatio: { width: 600, height: 640 },
    touchLayout: 'dpad-undo',
    baseLevelTarget: 250,
    levelGrowth: 1.4,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2, growthRate: 0.1 },
    controls: {
      desktop: 'Flechas o WASD para deslizar · Z para deshacer 1 turno',
      mobile: 'Desliza sobre el tablero o usa la cruceta + ↩ DESHACER'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="cov-2048-glow"><stop offset="0%" stop-color="#facc15" stop-opacity="0.55"/><stop offset="100%" stop-color="#facc15" stop-opacity="0"/></radialGradient></defs>
      <rect width="240" height="140" fill="#090714"/>
      <rect x="44" y="14" width="152" height="112" rx="10" fill="#151129" stroke="rgba(56,189,248,0.35)" stroke-width="2"/>
      <rect x="52" y="22" width="64" height="42" rx="7" fill="#00bbf9"/><rect x="55" y="24" width="58" height="7" rx="3" fill="rgba(255,255,255,0.28)"/>
      <rect x="124" y="22" width="64" height="42" rx="7" fill="#ff2a85"/><rect x="127" y="24" width="58" height="7" rx="3" fill="rgba(255,255,255,0.28)"/>
      <circle cx="120" cy="95" r="50" fill="url(#cov-2048-glow)"/>
      <rect x="52" y="72" width="136" height="46" rx="8" fill="#ffbe0b" stroke="#fef08a" stroke-width="1.5"/>
      <rect x="56" y="75" width="128" height="8" rx="3" fill="rgba(255,255,255,0.32)"/>
      <rect x="64" y="112" width="112" height="2" fill="rgba(15,23,42,0.28)"/>
      <text x="84" y="49" text-anchor="middle" fill="#08101c" font-size="17" font-family="system-ui,sans-serif" font-weight="800">512</text>
      <text x="156" y="49" text-anchor="middle" fill="#ffffff" font-size="17" font-family="system-ui,sans-serif" font-weight="800">1024</text>
      <text x="120" y="103" text-anchor="middle" fill="#08101c" font-size="24" font-family="system-ui,sans-serif" font-weight="900">2048</text>
    </svg>`,
    loadModule: () => import('../games/2048/index.js').then((m) => m.default)
  },
  {
    id: 'reaction',
    name: 'Synapse Reflex',
    subtitle: 'Prueba de Reflejos',
    description: 'Mide tu velocidad neuronal en milisegundos. Supera rondas con señales puras, señuelos cromáticos y objetivos móviles.',
    category: 'Reflejos',
    categories: ['reflex', 'skill', 'arcade'],
    featured: false,
    badge: 'Reflejos',
    accentColor: '#00ff88',
    orientation: 'landscape',
    aspectRatio: { width: 720, height: 520 },
    touchLayout: 'board',
    baseLevelTarget: 120,
    levelGrowth: 1.2,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.4, growthRate: 0.14 },
    controls: {
      desktop: 'Clic sobre el reactor o barra espaciadora al ponerse verde',
      mobile: 'Toca directamente el reactor luminoso cuando cambie a VERDE'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="cov-rea-glow"><stop offset="0%" stop-color="#00ff88" stop-opacity="0.6"/><stop offset="100%" stop-color="#00ff88" stop-opacity="0"/></radialGradient></defs>
      <rect width="240" height="140" fill="#051d17"/>
      <g stroke="rgba(56,189,248,0.16)" stroke-width="1"><line x1="0" y1="70" x2="240" y2="70"/><line x1="120" y1="0" x2="120" y2="140"/><circle cx="120" cy="70" r="54" fill="none"/></g>
      <circle cx="120" cy="70" r="46" fill="url(#cov-rea-glow)"/>
      <circle cx="120" cy="70" r="38" fill="none" stroke="#00ff88" stroke-width="3.5" stroke-dasharray="46 14"/>
      <circle cx="120" cy="70" r="30" fill="#0f172a"/>
      <circle cx="120" cy="70" r="25" fill="#00ff88" stroke="#ffffff" stroke-width="2"/>
      <circle cx="112" cy="61" r="8" fill="rgba(255,255,255,0.28)"/>
      <polygon points="124,49 109,72 120,72 116,92 131,68 120,68" fill="#051d17"/>
    </svg>`,
    loadModule: () => import('../games/reaction/index.js').then((m) => m.default)
  },
  {
    id: 'bomberman',
    name: 'Blast Grid',
    subtitle: 'Bomberman — Laberinto Explosivo',
    description: 'Coloca bombas estratégicas en laberintos destructibles, activa reacciones en cadena, recoge mejoras y despeja el sector.',
    category: 'Arcade',
    categories: ['arcade', 'classics', 'logic', 'survival'],
    featured: true,
    badge: 'Nuevo',
    accentColor: '#ff9e00',
    orientation: 'landscape',
    aspectRatio: { width: 720, height: 624 },
    touchLayout: 'dpad',
    musicTrack: 'bomberman',
    baseLevelTarget: 150,
    levelGrowth: 1.25,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.3, growthRate: 0.12 },
    controls: {
      desktop: 'Flechas o WASD para mover · Espacio para colocar bomba',
      mobile: 'Cruceta táctil para desplazarte y botón 💣 BOMBA a la derecha'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="140" fill="#0b1326"/>
      <g stroke="rgba(56,189,248,0.1)" stroke-width="1"><line x1="0" y1="35" x2="240" y2="35"/><line x1="0" y1="70" x2="240" y2="70"/><line x1="0" y1="105" x2="240" y2="105"/><line x1="60" y1="0" x2="60" y2="140"/><line x1="120" y1="0" x2="120" y2="140"/><line x1="180" y1="0" x2="180" y2="140"/></g>
      <rect x="24" y="18" width="32" height="32" rx="3" fill="#334155" stroke="#64748b" stroke-width="2"/><rect x="30" y="24" width="20" height="20" fill="#475569"/>
      <rect x="184" y="88" width="32" height="32" rx="3" fill="#92400e" stroke="#fbbf24" stroke-width="2"/><line x1="186" y1="90" x2="214" y2="118" stroke="#451a03" stroke-width="3"/><line x1="214" y1="90" x2="186" y2="118" stroke="#451a03" stroke-width="3"/>
      <rect x="92" y="54" width="96" height="32" rx="8" fill="#f97316" opacity="0.85"/><rect x="124" y="22" width="32" height="96" rx="8" fill="#f97316" opacity="0.85"/>
      <rect x="106" y="61" width="68" height="18" rx="6" fill="#fef08a"/><rect x="131" y="34" width="18" height="72" rx="6" fill="#fef08a"/>
      <circle cx="140" cy="70" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/><circle cx="135" cy="65" r="4" fill="#64748b"/><circle cx="148" cy="54" r="4" fill="#fde047"/>
      <g transform="translate(58,86)">
        <rect x="-10" y="-14" width="20" height="16" rx="5" fill="#f8fafc" stroke="#38bdf8" stroke-width="2"/>
        <rect x="-7" y="-10" width="14" height="8" rx="2" fill="#0f172a"/><rect x="-4" y="-8" width="3" height="4" fill="#38bdf8"/><rect x="1" y="-8" width="3" height="4" fill="#38bdf8"/>
        <rect x="-9" y="2" width="18" height="12" rx="3" fill="#1d4ed8"/><rect x="-3" y="4" width="6" height="5" fill="#fbbf24"/>
      </g>
      <g transform="translate(194,40)">
        <ellipse cx="0" cy="4" rx="13" ry="11" fill="#ec4899" stroke="#be185d" stroke-width="2"/>
        <rect x="-7" y="-2" width="4" height="5" fill="#fff"/><rect x="3" y="-2" width="4" height="5" fill="#fff"/><rect x="-6" y="0" width="2" height="3" fill="#0f172a"/><rect x="4" y="0" width="2" height="3" fill="#0f172a"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/bomberman/index.js').then((m) => m.default)
  },
  {
    id: 'shmup',
    name: 'Starlight Strikers',
    subtitle: 'Shmup Vertical Arcade',
    description: 'Pilota un caza estelar en scroll vertical, mejora tus cañones hasta nivel 4, detona bombas Nova y derrota acorazados jefe.',
    category: 'Arcade',
    categories: ['arcade', 'survival', 'reflex'],
    featured: true,
    badge: 'Nuevo',
    accentColor: '#00bbf9',
    orientation: 'portrait',
    aspectRatio: { width: 520, height: 700 },
    touchLayout: 'joystick-dual',
    musicTrack: 'shmup',
    baseLevelTarget: 220,
    levelGrowth: 1.3,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.4, growthRate: 0.13 },
    controls: {
      desktop: 'Flechas/WASD o ratón · Espacio dispara · Shift/C Bomba Nova',
      mobile: 'Joystick izquierdo o arrastre · Botones FUEGO y ⚡ NOVA simultáneos'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cov-shm-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#040615"/><stop offset="100%" stop-color="#170d2e"/></linearGradient>
      </defs>
      <rect width="240" height="140" fill="url(#cov-shm-bg)"/>
      <circle cx="192" cy="34" r="22" fill="#312e81"/><ellipse cx="192" cy="34" rx="36" ry="8" transform="rotate(-18 192 34)" fill="none" stroke="#a5b4fc" stroke-width="3" opacity="0.5"/>
      <g fill="#fff" opacity="0.6"><rect x="26" y="20" width="2" height="5"/><rect x="82" y="60" width="2" height="4"/><rect x="210" y="90" width="2" height="5"/></g>
      <g transform="translate(120,26)">
        <polygon points="-38,-8 -14,-14 14,-14 38,-8 28,12 12,16 -12,16 -28,12" fill="#be123c" stroke="#f43f5e" stroke-width="1.8"/>
        <rect x="-24" y="-6" width="14" height="8" fill="#38bdf8"/><rect x="10" y="-6" width="14" height="8" fill="#38bdf8"/><circle cx="0" cy="3" r="6" fill="#fde047"/>
      </g>
      <polygon points="56,48 42,28 56,34 70,28" fill="#f43f5e" stroke="#fda4af" stroke-width="1.2"/>
      <polygon points="184,54 170,34 184,40 198,34" fill="#f97316" stroke="#fde047" stroke-width="1.2"/>
      <rect x="111" y="54" width="4" height="18" fill="#22d3ee"/><rect x="125" y="54" width="4" height="18" fill="#22d3ee"/>
      <rect x="112" y="56" width="2" height="14" fill="#fff"/><rect x="126" y="56" width="2" height="14" fill="#fff"/>
      <g transform="translate(120,104)">
        <polygon points="-8,12 -4,26 0,12" fill="#fb923c"/><polygon points="0,12 4,26 8,12" fill="#fb923c"/>
        <polygon points="0,-22 10,-4 22,12 10,14 0,6 -10,14 -22,12 -10,-4" fill="#0284c7" stroke="#f8fafc" stroke-width="1.5"/>
        <polygon points="-22,6 -22,14 -16,14" fill="#f43f5e"/><polygon points="22,6 22,14 16,14" fill="#f43f5e"/>
        <ellipse cx="0" cy="-6" rx="4" ry="7" fill="#7dd3fc"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/shmup/index.js').then((m) => m.default)
  },
  {
    id: 'metalslug',
    name: 'Iron Commando',
    subtitle: 'Acción Run & Gun Lateral',
    description: 'Combate en scroll horizontal con salto, disparo multi-arma, granadas parabólicas, cajas de suministros y Tanques Jefe.',
    category: 'Arcade',
    categories: ['arcade', 'skill', 'survival'],
    featured: true,
    badge: 'Nuevo',
    accentColor: '#00ff88',
    orientation: 'landscape',
    aspectRatio: { width: 800, height: 500 },
    touchLayout: 'platform-action',
    musicTrack: 'metalslug',
    baseLevelTarget: 350,
    levelGrowth: 1.3,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.35, growthRate: 0.12 },
    controls: {
      desktop: 'A/D mover · W/Arriba saltar o apuntar · S agachar · Espacio disparo · C/Shift granada',
      mobile: 'Cruceta táctil izquierda + SALTAR, DISPARO y GRANADA simultáneos'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cov-ms-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#7c2d12"/></linearGradient></defs>
      <rect width="240" height="140" fill="url(#cov-ms-sky)"/>
      <polygon points="48,112 72,18 98,18" fill="rgba(254,240,138,0.08)"/>
      <rect x="16" y="48" width="44" height="64" fill="#1e1b4b"/><rect x="164" y="34" width="54" height="78" fill="#1e1b4b"/>
      <rect x="0" y="112" width="240" height="28" fill="#1e293b"/>
      <rect x="0" y="112" width="240" height="5" fill="#f59e0b"/><rect x="20" y="112" width="20" height="5" fill="#0f172a"/><rect x="60" y="112" width="20" height="5" fill="#0f172a"/><rect x="100" y="112" width="20" height="5" fill="#0f172a"/><rect x="140" y="112" width="20" height="5" fill="#0f172a"/><rect x="180" y="112" width="20" height="5" fill="#0f172a"/>
      <rect x="92" y="88" width="24" height="24" rx="2" fill="#92400e" stroke="#f59e0b" stroke-width="2"/><line x1="94" y1="90" x2="114" y2="110" stroke="#451a03" stroke-width="2"/>
      <g transform="translate(52,88)">
        <rect x="-10" y="-22" width="18" height="7" fill="#ef4444"/><path d="M-10,-20 L-18,-24 L-16,-16 Z" fill="#ef4444"/>
        <rect x="-8" y="-15" width="14" height="12" rx="3" fill="#fde68a"/><rect x="-2" y="-12" width="5" height="3" fill="#0f172a"/>
        <rect x="-9" y="-3" width="16" height="16" rx="2" fill="#4d7c0f"/><rect x="-4" y="1" width="22" height="6" fill="#334155"/>
        <rect x="-8" y="13" width="6" height="11" fill="#3f6212"/><rect x="1" y="13" width="6" height="11" fill="#3f6212"/>
        <circle cx="22" cy="4" r="6" fill="#fef08a"/>
      </g>
      <circle cx="102" cy="70" r="3.5" fill="#facc15"/><circle cx="122" cy="64" r="4" fill="#facc15"/>
      <g transform="translate(178,86)">
        <rect x="-28" y="-22" width="50" height="16" rx="4" fill="#365314"/><rect x="-48" y="-18" width="30" height="8" fill="#1e293b"/>
        <rect x="-34" y="-8" width="66" height="22" rx="4" fill="#4d7c0f" stroke="#a3e635" stroke-width="1.2"/>
        <rect x="-36" y="10" width="70" height="16" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <circle cx="-22" cy="18" r="5" fill="#475569"/><circle cx="0" cy="18" r="5" fill="#475569"/><circle cx="22" cy="18" r="5" fill="#475569"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/metalslug/index.js').then((m) => m.default)
  },
  {
    id: 'sunsetriders',
    name: 'Dusty Trails',
    subtitle: 'Western Run & Gun',
    description: 'Cabalga por pueblos del oeste al atardecer, salta por tejados, esquiva balas barriendo y vence a forajidos jefe.',
    category: 'Arcade',
    categories: ['arcade', 'skill', 'classics'],
    featured: true,
    badge: 'Nuevo',
    accentColor: '#ff2a85',
    orientation: 'landscape',
    aspectRatio: { width: 800, height: 500 },
    touchLayout: 'platform-action',
    musicTrack: 'sunsetriders',
    baseLevelTarget: 350,
    levelGrowth: 1.3,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.35, growthRate: 0.12 },
    controls: {
      desktop: 'A/D mover · W/Arriba saltar · S/Shift barrida esquiva · Espacio disparar',
      mobile: 'Cruceta táctil izquierda + SALTAR, DISPARO y BARRER simultáneos'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="cov-sr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e0b36"/><stop offset="55%" stop-color="#9d174d"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs>
      <rect width="240" height="140" fill="url(#cov-sr-sky)"/>
      <circle cx="168" cy="54" r="32" fill="#fde047"/>
      <polygon points="0,112 0,76 28,54 58,54 78,86 116,64 148,112" fill="#4c1d3d"/>
      <rect x="152" y="42" width="68" height="70" fill="#3b1533"/><rect x="164" y="54" width="18" height="18" fill="rgba(253,224,71,0.35)"/><rect x="190" y="54" width="18" height="18" fill="rgba(253,224,71,0.35)"/>
      <rect x="0" y="112" width="240" height="28" fill="#7c3f1d"/><rect x="0" y="112" width="240" height="6" fill="#d97706"/>
      <rect x="116" y="84" width="24" height="28" rx="4" fill="#dc2626" stroke="#fbbf24" stroke-width="2"/><rect x="116" y="92" width="24" height="6" fill="#78350f"/>
      <g transform="translate(58,86)">
        <rect x="-18" y="-22" width="36" height="5" rx="2" fill="#fef08a"/><rect x="-10" y="-31" width="20" height="10" rx="2" fill="#fef08a"/><rect x="-10" y="-24" width="20" height="3" fill="#eab308"/>
        <rect x="-8" y="-17" width="16" height="10" fill="#fed7aa"/><rect x="-9" y="-9" width="18" height="14" rx="2" fill="#ec4899"/>
        <rect x="-7" y="4" width="14" height="13" fill="#0284c7"/><rect x="7" y="-4" width="13" height="4" fill="#475569"/>
        <circle cx="24" cy="-2" r="5" fill="#fef08a"/>
      </g>
      <circle cx="102" cy="80" r="3" fill="#fde047"/>
      <g transform="translate(182,88)">
        <rect x="-16" y="-21" width="32" height="5" rx="2" fill="#1e293b"/><rect x="-9" y="-29" width="18" height="9" rx="2" fill="#1e293b"/>
        <rect x="-8" y="-16" width="16" height="10" fill="#fed7aa"/><rect x="-10" y="-7" width="20" height="15" rx="2" fill="#dc2626"/><rect x="-7" y="8" width="14" height="14" fill="#78350f"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/sunsetriders/index.js').then((m) => m.default)
  },
  {
    id: 'donkeykong',
    name: 'Steel Girder',
    subtitle: 'Plataformas Clásicas de Vigas',
    description: 'Trepa escaleras entre vigas metálicas inclinadas, salta barriles rodantes, empuña el martillo y llega a la cima.',
    category: 'Clásicos',
    categories: ['arcade', 'classics', 'skill'],
    featured: true,
    badge: 'Nuevo',
    accentColor: '#ffbe0b',
    orientation: 'portrait',
    aspectRatio: { width: 560, height: 680 },
    touchLayout: 'platform-climb',
    musicTrack: 'donkeykong',
    baseLevelTarget: 250,
    levelGrowth: 1.25,
    difficultyConfig: { baseSpeed: 1, maxSpeedMultiplier: 2.2, growthRate: 0.12 },
    controls: {
      desktop: 'Izq/Der correr · Arriba/Abajo escaleras · Espacio saltar barriles',
      mobile: 'Cruceta para moverte/trepar escaleras + botón SALTAR barriles'
    },
    svgArt: `<svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="140" fill="#090714"/>
      <rect x="14" y="12" width="8" height="118" fill="rgba(51,65,85,0.45)"/><rect x="218" y="12" width="8" height="118" fill="rgba(51,65,85,0.45)"/>
      <g stroke="#7dd3fc" stroke-width="2">
        <line x1="170" y1="42" x2="170" y2="75"/><line x1="184" y1="42" x2="184" y2="75"/><line x1="170" y1="52" x2="184" y2="52"/><line x1="170" y1="64" x2="184" y2="64"/>
        <line x1="58" y1="80" x2="58" y2="120"/><line x1="72" y1="80" x2="72" y2="120"/><line x1="58" y1="92" x2="72" y2="92"/><line x1="58" y1="106" x2="72" y2="106"/>
      </g>
      <g stroke="#f43f5e" stroke-width="5"><line x1="18" y1="36" x2="222" y2="46"/><line x1="18" y1="82" x2="222" y2="72"/><line x1="18" y1="118" x2="222" y2="126"/></g>
      <g stroke="#9d174d" stroke-width="1.5" stroke-dasharray="6 8"><line x1="18" y1="36" x2="222" y2="46"/><line x1="18" y1="82" x2="222" y2="72"/></g>
      <g transform="translate(50,24)">
        <rect x="-14" y="-12" width="28" height="24" rx="4" fill="#6d28d9"/><rect x="-8" y="-8" width="16" height="8" fill="#c4b5fd"/>
        <rect x="-6" y="-6" width="4" height="3" fill="#fde047"/><rect x="2" y="-6" width="4" height="3" fill="#fde047"/>
        <rect x="-20" y="-6" width="6" height="14" rx="2" fill="#4c1d95"/><rect x="14" y="-6" width="6" height="14" rx="2" fill="#4c1d95"/>
      </g>
      <rect x="128" y="16" width="14" height="20" rx="4" fill="#065f46" stroke="#34d399" stroke-width="2"/><rect x="132" y="23" width="6" height="6" fill="#a7f3d0"/>
      <g transform="translate(116,66)">
        <circle cx="0" cy="0" r="10" fill="#b45309" stroke="#fde68a" stroke-width="2"/>
        <line x1="-7" y1="0" x2="7" y2="0" stroke="#451a03" stroke-width="2"/><line x1="0" y1="-7" x2="0" y2="7" stroke="#451a03" stroke-width="2"/>
      </g>
      <g transform="translate(112,102)">
        <rect x="-7" y="-16" width="14" height="5" fill="#ef4444"/><rect x="-6" y="-11" width="12" height="7" fill="#fed7aa"/>
        <rect x="-7" y="-4" width="14" height="12" fill="#1d4ed8"/><rect x="-4" y="8" width="4" height="6" fill="#451a03"/><rect x="1" y="8" width="4" height="6" fill="#451a03"/>
        <rect x="8" y="-10" width="10" height="12" rx="2" fill="#f59e0b" stroke="#fef08a" stroke-width="1"/>
      </g>
    </svg>`,
    loadModule: () => import('../games/donkeykong/index.js').then((m) => m.default)
  }
];

for (const game of INITIAL_GAMES) {
  GameRegistry.register(game);
}
