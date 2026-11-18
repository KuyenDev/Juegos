/**
 * Configuración central de la plataforma.
 * Permite cambiar el nombre, identidad, categorías, temas y recompensas desde un único archivo.
 */
export const APP_CONFIG = {
  appName: 'ARCADE INFINITO',
  shortName: 'ArcadeInfinito',
  tagline: 'Un montón de juegos clásicos para jugar en cualquier momento, incluso sin Internet.',
  version: '1.0.0',
  dbName: 'ArcadeInfinitoDB',
  dbVersion: 1,
  storagePrefix: 'arcade_infinito_',

  categories: [
    { id: 'all', label: 'Todos', icon: '⚡' },
    { id: 'favorites', label: 'Favoritos', icon: '⭐' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'classics', label: 'Clásicos', icon: '👾' },
    { id: 'skill', label: 'Habilidad', icon: '🎯' },
    { id: 'logic', label: 'Lógica', icon: '🧩' },
    { id: 'reflex', label: 'Reflejos', icon: '⚡' },
    { id: 'survival', label: 'Supervivencia', icon: '🛡️' }
  ],

  themes: [
    {
      id: 'dark',
      name: 'Modo Oscuro Cyber',
      description: 'Contraste profundo con acentos cian y magenta neón.',
      unlockedByDefault: true,
      requiredPoints: 0,
      colors: {
        bgPrimary: '#0b0d19',
        bgSecondary: '#13172b',
        bgCard: '#191f38',
        textPrimary: '#f2f5ff',
        textSecondary: '#9aa5ce',
        accentPrimary: '#00f5d4',
        accentSecondary: '#ff2a85',
        accentWarning: '#ffbe0b',
        border: 'rgba(0, 245, 212, 0.22)'
      }
    },
    {
      id: 'arcade',
      name: 'Tema Arcade Retro',
      description: 'Inspirado en cabinas recreativas de los 80 con púrpura y ámbar eléctrico.',
      unlockedByDefault: true,
      requiredPoints: 0,
      colors: {
        bgPrimary: '#120824',
        bgSecondary: '#1f0f3d',
        bgCard: '#2b1554',
        textPrimary: '#fff3e6',
        textSecondary: '#d4b2ff',
        accentPrimary: '#ff9e00',
        accentSecondary: '#ff007f',
        accentWarning: '#00f5d4',
        border: 'rgba(255, 158, 0, 0.28)'
      }
    },
    {
      id: 'light',
      name: 'Modo Claro Solar',
      description: 'Interfaz limpia, luminosa y de alto contraste para exteriores.',
      unlockedByDefault: true,
      requiredPoints: 0,
      colors: {
        bgPrimary: '#f3f6fc',
        bgSecondary: '#ffffff',
        bgCard: '#ffffff',
        textPrimary: '#111625',
        textSecondary: '#4b5675',
        accentPrimary: '#0066ff',
        accentSecondary: '#e5006d',
        accentWarning: '#d97706',
        border: 'rgba(17, 22, 37, 0.14)'
      }
    },
    {
      id: 'emerald',
      name: 'Fósforo Verde Matrix',
      description: 'Recompensa desbloqueable (500 pts globales o logro de nivel 10).',
      unlockedByDefault: false,
      requiredPoints: 500,
      colors: {
        bgPrimary: '#04120b',
        bgSecondary: '#082015',
        bgCard: '#0d2e1f',
        textPrimary: '#d8ffe8',
        textSecondary: '#69c993',
        accentPrimary: '#00ff88',
        accentSecondary: '#00d9ff',
        accentWarning: '#ffe600',
        border: 'rgba(0, 255, 136, 0.26)'
      }
    },
    {
      id: 'crimson',
      name: 'Supernova Carmesí',
      description: 'Recompensa desbloqueable (1.500 pts globales).',
      unlockedByDefault: false,
      requiredPoints: 1500,
      colors: {
        bgPrimary: '#16070c',
        bgSecondary: '#260d15',
        bgCard: '#36131f',
        textPrimary: '#ffeef2',
        textSecondary: '#f2a2b8',
        accentPrimary: '#ff3366',
        accentSecondary: '#ffb703',
        accentWarning: '#00f5d4',
        border: 'rgba(255, 51, 102, 0.28)'
      }
    }
  ],

  avatars: [
    { id: 'joystick', icon: '🕹️', name: 'Joystick Clásico', requiredPoints: 0 },
    { id: 'alien', icon: '👾', name: 'Invasor Pixel', requiredPoints: 0 },
    { id: 'rocket', icon: '🚀', name: 'Piloto Galáctico', requiredPoints: 100 },
    { id: 'dragon', icon: '🐉', name: 'Viper Neón', requiredPoints: 300 },
    { id: 'robot', icon: '🤖', name: 'Autómata S-9', requiredPoints: 600 },
    { id: 'crown', icon: '👑', name: 'Leyenda Arcade', requiredPoints: 1000 },
    { id: 'bolt', icon: '⚡', name: 'Reflejo Puro', requiredPoints: 2000 },
    { id: 'diamond', icon: '💎', name: 'Maestro Infinito', requiredPoints: 3500 }
  ],

  frames: [
    { id: 'basic', name: 'Pulso Cian', cssClass: 'frame-basic', requiredPoints: 0 },
    { id: 'neon-pink', name: 'Plasma Rosa', cssClass: 'frame-pink', requiredPoints: 150 },
    { id: 'gold', name: 'Oro Real', cssClass: 'frame-gold', requiredPoints: 500 },
    { id: 'prismatic', name: 'Prisma Infinito', cssClass: 'frame-prismatic', requiredPoints: 1200 }
  ],

  backgrounds: [
    { id: 'grid', name: 'Rejilla Sintética', requiredPoints: 0 },
    { id: 'stars', name: 'Campo Estelar', requiredPoints: 250 },
    { id: 'circuit', name: 'Circuito Digital', requiredPoints: 800 },
    { id: 'clean', name: 'Minimalista Puro', requiredPoints: 0 }
  ]
};
