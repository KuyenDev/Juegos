import { APP_CONFIG } from '../config.js';
import { StorageService } from '../services/StorageService.js';

/**
 * Utilidades de navegación visual, aplicación de temas cosméticos y notificaciones Toast de logros.
 */
export const NavigationUI = {
  applyThemeAndBackground() {
    const settings = StorageService.getSettings();
    const themeObj =
      APP_CONFIG.themes.find((t) => t.id === settings.theme) || APP_CONFIG.themes[0];
    const root = document.documentElement;

    root.style.setProperty('--bg-primary', themeObj.colors.bgPrimary);
    root.style.setProperty('--bg-secondary', themeObj.colors.bgSecondary);
    root.style.setProperty('--bg-card', themeObj.colors.bgCard);
    root.style.setProperty('--text-primary', themeObj.colors.textPrimary);
    root.style.setProperty('--text-secondary', themeObj.colors.textSecondary);
    root.style.setProperty('--accent-primary', themeObj.colors.accentPrimary);
    root.style.setProperty('--accent-secondary', themeObj.colors.accentSecondary);
    root.style.setProperty('--accent-warning', themeObj.colors.accentWarning);
    root.style.setProperty('--border-color', themeObj.colors.border);

    document.body.dataset.theme = themeObj.id;
    document.body.dataset.bg = settings.background || 'grid';
  },

  showAchievementToast(achievement) {
    let stack = document.getElementById('achievement-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'achievement-toast-stack';
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <span class="toast-icon">${achievement.icon || '🏆'}</span>
      <div class="toast-body">
        <span class="toast-kicker">¡LOGRO DESBLOQUEADO!</span>
        <strong class="toast-title">${achievement.title}</strong>
        <span class="toast-pts">+${achievement.rewardPoints || 0} Puntos Globales</span>
      </div>
    `;
    stack.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, 4200);
  }
};
