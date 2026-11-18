/**
 * Utilidades de detección de colisiones geométricas 2D para minijuegos.
 */
export const CollisionManager = {
  rectRect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  },

  circleCircle(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rSum = a.r + b.r;
    return dx * dx + dy * dy <= rSum * rSum;
  },

  circleRect(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.r * circle.r;
  },

  pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  },

  pointInCircle(px, py, circle) {
    const dx = px - circle.x;
    const dy = py - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }
};
