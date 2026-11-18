/**
 * PixelSprites & VisualFX
 * Zero-dependency sprite compiler, offscreen backdrop cache, and lightweight arcade FX helpers.
 * Works seamlessly in real Canvas 2D browsers and safely degrades in headless JS test environments.
 */

export function createOffscreenCanvas(width, height) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) return null;
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

/**
 * Compiles a string-grid pixel art matrix into an offscreen cached canvas sprite.
 * Transparent characters: '.' or ' '.
 */
export function compilePixelSprite(rows, palette, scale = 2) {
  if (!rows || !rows.length) {
    return { canvas: null, width: 0, height: 0 };
  }
  const rowCount = rows.length;
  const colCount = rows[0].length;
  const w = Math.max(1, Math.round(colCount * scale));
  const h = Math.max(1, Math.round(rowCount * scale));
  const surface = createOffscreenCanvas(w, h);
  if (!surface) {
    return { canvas: null, width: w, height: h };
  }

  const { canvas, ctx } = surface;
  if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < rowCount; y++) {
    const row = rows[y];
    let x = 0;
    while (x < colCount) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || !palette[ch]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < colCount && row[x + run] === ch) {
        run++;
      }
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * scale, y * scale, run * scale, scale);
      x += run;
    }
  }

  return { canvas, width: w, height: h };
}

/**
 * Compiles a multi-frame animation strip of pixel sprites.
 */
export function compileSpriteFrames(frames, palette, scale = 2) {
  return frames.map((rows) => compilePixelSprite(rows, palette, scale));
}

/**
 * Creates a horizontally mirrored copy of an existing compiled sprite.
 */
export function flipSpriteH(sprite) {
  if (!sprite || !sprite.canvas) {
    return { canvas: null, width: sprite ? sprite.width : 0, height: sprite ? sprite.height : 0 };
  }
  const surface = createOffscreenCanvas(sprite.width, sprite.height);
  if (!surface) return { canvas: null, width: sprite.width, height: sprite.height };
  const { canvas, ctx } = surface;
  if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(sprite.width, 0);
  ctx.scale(-1, 1);
  if (typeof ctx.drawImage === 'function') {
    ctx.drawImage(sprite.canvas, 0, 0);
  }
  ctx.restore();
  return { canvas, width: sprite.width, height: sprite.height };
}

/**
 * Draws a compiled sprite with optional scaling, mirroring, rotation, and alpha.
 * Defaults to centered drawing around (cx, cy) unless centered === false.
 */
export function drawSprite(ctx, sprite, x, y, drawW, drawH, options = {}) {
  if (!ctx || !sprite || !sprite.canvas || typeof ctx.drawImage !== 'function') return;
  const w = drawW ?? sprite.width;
  const h = drawH ?? sprite.height;
  const centered = options.centered !== false;
  const flipX = Boolean(options.flipX);
  const flipY = Boolean(options.flipY);
  const rotation = options.rotation || 0;
  const alpha = options.alpha ?? 1;
  const pixelArt = options.pixelArt !== false;

  ctx.save();
  if ('imageSmoothingEnabled' in ctx) {
    ctx.imageSmoothingEnabled = !pixelArt;
  }
  if (alpha < 1) {
    ctx.globalAlpha *= alpha;
  }
  const cx = centered ? x : x + w * 0.5;
  const cy = centered ? y : y + h * 0.5;
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(sprite.canvas, -w * 0.5, -h * 0.5, w, h);
  ctx.restore();
}

/**
 * Pre-renders a static background scene onto an offscreen canvas for O(1) frame blitting.
 */
export function createCachedBackdrop(width, height, drawFn) {
  const surface = createOffscreenCanvas(width, height);
  if (!surface) return { canvas: null, width, height };
  drawFn(surface.ctx, width, height);
  return { canvas: surface.canvas, width, height };
}

export function drawCachedBackdrop(ctx, cached, dx = 0, dy = 0, dw = null, dh = null) {
  if (!ctx || !cached || !cached.canvas || typeof ctx.drawImage !== 'function') return false;
  ctx.drawImage(cached.canvas, dx, dy, dw ?? cached.width, dh ?? cached.height);
  return true;
}

/**
 * Renders a radial soft glow safely (with solid-alpha fallback if createRadialGradient is mocked).
 */
export function drawGlowCircle(ctx, x, y, radius, innerColor, outerColor = 'rgba(0,0,0,0)', alpha = 1) {
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  if (typeof ctx.createRadialGradient === 'function') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
    g.addColorStop(0, innerColor);
    g.addColorStop(1, outerColor);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = innerColor;
  }
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a 3D beveled arcade tile/gem/metal block with crisp top-left highlight & bottom-right shadow.
 */
export function drawBeveledBlock(ctx, x, y, w, h, baseColor, highlightColor, shadowColor, options = {}) {
  const r = options.radius ?? 3;
  const bevel = options.bevel ?? Math.max(2, Math.min(w, h) * 0.14);

  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();

  // Top & Left highlight strip
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.lineTo(x + w - bevel, y + bevel);
  ctx.lineTo(x + bevel, y + bevel);
  ctx.lineTo(x + bevel, y + h - bevel);
  ctx.lineTo(x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.closePath();
  ctx.fill();

  // Bottom & Right shadow strip
  ctx.fillStyle = shadowColor;
  ctx.beginPath();
  ctx.moveTo(x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.lineTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.lineTo(x + bevel, y + h - bevel);
  ctx.lineTo(x + w - bevel, y + h - bevel);
  ctx.lineTo(x + w - bevel, y + bevel);
  ctx.closePath();
  ctx.fill();

  if (options.gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + bevel + 1, y + bevel + 1, Math.max(2, w - bevel * 2 - 2), Math.max(2, (h - bevel * 2) * 0.28));
  }

  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = options.borderWidth || 1.25;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
    } else {
      ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Spawns capped particles into an existing particle array without dynamic allocations spiraling.
 */
export function spawnFXParticles(list, x, y, count, opts = {}) {
  const maxParticles = opts.maxParticles ?? 180;
  const speedMin = opts.speedMin ?? 45;
  const speedMax = opts.speedMax ?? 190;
  const lifeMin = opts.lifeMin ?? 0.22;
  const lifeMax = opts.lifeMax ?? 0.55;
  const sizeMin = opts.sizeMin ?? 2;
  const sizeMax = opts.sizeMax ?? 5;
  const colors = opts.colors ?? ['#fde047', '#fb923c', '#ef4444', '#ffffff'];
  const gravity = opts.gravity ?? 0;
  const shape = opts.shape ?? 'square';

  for (let i = 0; i < count; i++) {
    if (list.length >= maxParticles) {
      list.shift();
    }
    const angle = opts.angle !== undefined
      ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 1.2)
      : Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const maxLife = lifeMin + Math.random() * (lifeMax - lifeMin);
    list.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      color: colors[i % colors.length],
      gravity,
      shape
    });
  }
}

export function updateAndDrawFXParticles(ctx, list, dt, draw = true) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.vy += (p.gravity || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (!draw || !ctx) continue;
    const t = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    const s = p.size * (0.45 + 0.55 * t);
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.2, s * 0.4);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
    } else {
      ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
    }
    ctx.restore();
  }
}

export function spawnShockwave(list, x, y, opts = {}) {
  const maxRings = opts.maxRings ?? 24;
  if (list.length >= maxRings) list.shift();
  list.push({
    x,
    y,
    radius: opts.startRadius ?? 4,
    maxRadius: opts.maxRadius ?? 44,
    life: opts.life ?? 0.35,
    maxLife: opts.life ?? 0.35,
    color: opts.color ?? '#38bdf8',
    lineWidth: opts.lineWidth ?? 3
  });
}

export function updateAndDrawShockwaves(ctx, list, dt, draw = true) {
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    r.life -= dt;
    if (r.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    if (!draw || !ctx) continue;
    const progress = 1 - r.life / r.maxLife;
    const curR = r.radius + (r.maxRadius - r.radius) * progress;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1, r.lineWidth * (1 - progress * 0.7));
    ctx.beginPath();
    ctx.arc(r.x, r.y, curR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
