import { APP_CONFIG } from '../config.js';
import { createGameCard } from './GameCard.js';
import { escapeHTML } from '../utils/sanitize.js';

/**
 * Renderiza la página principal con resumen de récords destacados, categorías,
 * juegos recientes/destacados y la cuadrícula filtrable de juegos.
 */
export function renderGameGrid({
  allGames,
  filteredGames,
  activeCategory,
  searchQuery,
  profile,
  allGameStats,
  onSelectCategory,
  onPlayGame,
  onToggleFavorite,
  onPlayRandom
}) {
  const container = document.createElement('main');
  container.className = 'arcade-main';

  const favorites = profile.favorites || [];
  const recentIds = (profile.recentGames || []).slice(0, 4);
  const recentGames = recentIds
    .map((id) => allGames.find((g) => g.id === id))
    .filter(Boolean);

  // Calcular el mejor récord global
  let topGameName = 'Sin partidas aún';
  let topGameScore = 0;
  for (const g of allGames) {
    const st = allGameStats[g.id];
    if (st && st.highScore > topGameScore) {
      topGameScore = st.highScore;
      topGameName = g.name;
    }
  }

  // Banner superior de resumen rápido y botón de partida rápida aleatoria
  const heroBar = document.createElement('section');
  heroBar.className = 'hero-summary-bar';
  heroBar.innerHTML = `
    <div class="hero-metrics">
      <div class="hero-metric">
        <span class="metric-label">PUNTOS GLOBALES</span>
        <strong class="metric-val accent-cyan">${(profile.totalGlobalPoints || 0).toLocaleString()}</strong>
      </div>
      <div class="hero-metric">
        <span class="metric-label">MEJOR RÉCORD</span>
        <strong class="metric-val accent-pink">${topGameScore > 0 ? `${topGameScore.toLocaleString()} (${topGameName})` : '¡Estrena el marcador!'}</strong>
      </div>
      <div class="hero-metric">
        <span class="metric-label">NIVEL MÁXIMO</span>
        <strong class="metric-val accent-gold">Nivel ${profile.highestLevelEver || 1}</strong>
      </div>
      <div class="hero-metric">
        <span class="metric-label">PARTIDAS</span>
        <strong class="metric-val">${profile.totalGamesPlayed || 0}</strong>
      </div>
    </div>
    <div class="hero-cta">
      <button type="button" class="random-game-btn" id="hero-random-btn">
        🎲 Jugar Juego Aleatorio
      </button>
    </div>
  `;
  heroBar.querySelector('#hero-random-btn').addEventListener('click', () => {
    if (onPlayRandom) onPlayRandom();
  });
  container.appendChild(heroBar);

  // Si no hay búsqueda activa y estamos en "Todos", mostrar tira rápida de Jugados Recientemente
  if (!searchQuery && activeCategory === 'all' && recentGames.length > 0) {
    const recentSection = document.createElement('section');
    recentSection.className = 'recent-strip-section';
    recentSection.innerHTML = `
      <div class="section-heading-row">
        <h2 class="section-heading">⏱️ Jugados Recientemente</h2>
      </div>
      <div class="recent-chips-row"></div>
    `;
    const chipsRow = recentSection.querySelector('.recent-chips-row');
    for (const g of recentGames) {
      const st = allGameStats[g.id] || {};
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-game-chip';
      btn.style.setProperty('--chip-accent', g.accentColor || '#00f5d4');
      btn.innerHTML = `
        <span class="recent-chip-dot"></span>
        <span class="recent-chip-name">${g.name}</span>
        <span class="recent-chip-score">Récord: ${(st.highScore || 0).toLocaleString()}</span>
        <span class="recent-chip-play">▶</span>
      `;
      btn.addEventListener('click', () => onPlayGame(g.id));
      chipsRow.appendChild(btn);
    }
    container.appendChild(recentSection);
  }

  // Barra de categorías
  const catNav = document.createElement('nav');
  catNav.className = 'categories-nav';
  catNav.setAttribute('aria-label', 'Categorías de juegos');

  for (const cat of APP_CONFIG.categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-pill ${activeCategory === cat.id ? 'active' : ''}`;
    const count =
      cat.id === 'all'
        ? allGames.length
        : cat.id === 'favorites'
        ? favorites.length
        : allGames.filter((g) => (g.categories || []).includes(cat.id)).length;

    btn.innerHTML = `
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-label">${cat.label}</span>
      <span class="cat-count">${count}</span>
    `;
    btn.addEventListener('click', () => onSelectCategory(cat.id));
    catNav.appendChild(btn);
  }
  container.appendChild(catNav);

  // Sección de Biblioteca Principal
  const gridSection = document.createElement('section');
  gridSection.className = 'library-grid-section';

  const activeCatObj = APP_CONFIG.categories.find((c) => c.id === activeCategory);
  const headingTitle = searchQuery
    ? `Resultados para "${escapeHTML(searchQuery)}" (${filteredGames.length})`
    : `${activeCatObj ? `${activeCatObj.icon} ${activeCatObj.label}` : 'Biblioteca Arcade'} (${filteredGames.length})`;

  gridSection.innerHTML = `
    <div class="section-heading-row">
      <h2 class="section-heading">${headingTitle}</h2>
      <span class="section-subtitle">Todos los juegos funcionan 100% sin conexión y tienen niveles infinitos</span>
    </div>
  `;

  if (filteredGames.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-grid-state';
    emptyState.innerHTML = `
      <p class="empty-icon">🕹️</p>
      <h3>No se encontraron juegos en esta vista</h3>
      <p>${
        activeCategory === 'favorites'
          ? 'Marca cualquier juego con la estrella ☆ para guardarlo en tus Favoritos.'
          : 'Prueba con otro término de búsqueda o selecciona la categoría "Todos".'
      }</p>
      <button type="button" class="reset-filter-btn">Mostrar todos los juegos</button>
    `;
    emptyState.querySelector('.reset-filter-btn').addEventListener('click', () => {
      onSelectCategory('all');
    });
    gridSection.appendChild(emptyState);
  } else {
    const grid = document.createElement('div');
    grid.className = 'games-grid';
    for (const game of filteredGames) {
      const card = createGameCard({
        game,
        stats: allGameStats[game.id],
        isFavorite: favorites.includes(game.id),
        onPlay: onPlayGame,
        onToggleFavorite
      });
      grid.appendChild(card);
    }
    gridSection.appendChild(grid);
  }

  container.appendChild(gridSection);
  return container;
}
