/**
 * Enrutador ligero basado en hash para permitir enlaces directos a cada juego (#game/snake)
 * y navegación limpia con el botón Atrás del navegador o móvil sin recargar ni requerir servidor.
 */
export class Router {
  constructor(onRouteChange) {
    this.onRouteChange = onRouteChange;
    this._handleHash = this._handleHash.bind(this);
    window.addEventListener('hashchange', this._handleHash);
    window.addEventListener('popstate', this._handleHash);
  }

  init() {
    this._handleHash();
  }

  navigateToHome() {
    if (window.location.hash) {
      history.pushState(null, document.title, window.location.pathname + window.location.search);
    }
    this._handleHash();
  }

  navigateToGame(gameId) {
    const targetHash = `#game/${gameId}`;
    if (window.location.hash !== targetHash) {
      history.pushState(null, document.title, targetHash);
    }
    this._handleHash();
  }

  _handleHash() {
    const hash = window.location.hash || '';
    const match = hash.match(/^#game\/([a-z0-9_-]+)$/i);
    if (match) {
      this.onRouteChange({ view: 'game', gameId: match[1] });
    } else {
      this.onRouteChange({ view: 'home', gameId: null });
    }
  }
}
