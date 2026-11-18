/**
 * Componente de tarjeta visual para cada minijuego en la biblioteca.
 */
export function createGameCard({
  game,
  stats = {},
  isFavorite = false,
  onPlay,
  onToggleFavorite
}) {
  const highScore = stats?.highScore || 0;
  const maxLevel = stats?.maxLevel || 1;
  const gamesPlayed = stats?.gamesPlayed || 0;

  const article = document.createElement('article');
  article.className = 'game-card';
  article.dataset.gameId = game.id;
  article.style.setProperty('--card-accent', game.accentColor || '#00f5d4');

  article.innerHTML = `
    <div class="game-card-Visual">
      <div class="game-card-art" aria-hidden="true">
        ${game.svgArt || ''}
      </div>
      <div class="game-card-badges">
        <span class="game-cat-tag">${game.category}</span>
        ${game.badge ? `<span class="game-special-badge">${game.badge}</span>` : ''}
      </div>
      <button
        type="button"
        class="fav-toggle-btn ${isFavorite ? 'active' : ''}"
        aria-label="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
        title="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
      >
        ${isFavorite ? '★' : '☆'}
      </button>
    </div>

    <div class="game-card-body">
      <div class="game-card-header">
        <h3 class="game-card-title">${game.name}</h3>
        <span class="game-card-subtitle">${game.subtitle || ''}</span>
      </div>
      <p class="game-card-desc">${game.description}</p>
      <div class="game-card-footer">
        <div class="game-card-record">
          <span class="record-label">RÉCORD</span>
          <strong class="record-value">${highScore.toLocaleString()} pts</strong>
          ${gamesPlayed > 0 ? `<span class="record-lvl">Nvl ${maxLevel}</span>` : '<span class="record-new">¡Nuevo!</span>'}
        </div>
        <button type="button" class="play-now-btn" aria-label="Jugar a ${game.name}">
          ▶ JUGAR
        </button>
      </div>
    </div>
  `;

  const favBtn = article.querySelector('.fav-toggle-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(game.id);
  });

  article.addEventListener('click', () => {
    if (onPlay) onPlay(game.id);
  });

  return article;
}
