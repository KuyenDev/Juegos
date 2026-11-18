/**
 * 7. SKY PULSE (Flappy-like Original — Stylized Vector Adventure)
 * 3 personajes originales seleccionables, obstáculos móviles en niveles avanzados,
 * anillos de energía de bonificación y escenarios con biomas dinámicos.
 */
import {
  drawGlowCircle,
  spawnFXParticles,
  updateAndDrawFXParticles
} from '../../engine/PixelSprites.js';

const CHARACTERS = [
  { name: 'Orbe Solar', color: '#f97316', secondary: '#fde047', accent: '#ffffff', shape: 'orb' },
  { name: 'Ala Cian', color: '#06b6d4', secondary: '#a5f3fc', accent: '#ff2a85', shape: 'delta' },
  { name: 'Núcleo Prisma', color: '#8b5cf6', secondary: '#c4b5fd', accent: '#facc15', shape: 'diamond' }
];

const BIOMES = [
  { bgTop: '#0b1026', bgBot: '#182447', ridge: '#121c3b', gateColor: '#00f5d4', gateDark: '#0f766e' },
  { bgTop: '#1d0b26', bgBot: '#3b1240', ridge: '#2b0d31', gateColor: '#ff2a85', gateDark: '#9d174d' },
  { bgTop: '#061f1a', bgBot: '#0f3d33', ridge: '#092c24', gateColor: '#00ff88', gateDark: '#047857' },
  { bgTop: '#241409', bgBot: '#472610', ridge: '#331b0b', gateColor: '#ffbe0b', gateDark: '#b45309' }
];

export default class SkyPulseGame {
  constructor(api) {
    this.api = api;
    this.charIdx = 0;
    this.glider = null;
    this.gates = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.stars = [];
    this.animTime = 0;
    this.scrollOffset = 0;
  }

  init() {
    for (let i = 0; i < 36; i++) {
      this.stars.push({
        x: Math.random() * this.api.width,
        y: Math.random() * this.api.height,
        s: 1 + Math.random() * 2
      });
    }
    this.restart();
  }

  start() {}

  restart() {
    this.glider = {
      x: 120,
      y: this.api.height * 0.45,
      vy: 0,
      r: 16,
      gravity: 960,
      jumpImpulse: -345
    };
    this.gates = [];
    this.particles = [];
    this.spawnTimer = 0.2;
    this.api.updateStatusText(CHARACTERS[this.charIdx].name);
  }

  handleInput(evt) {
    if (evt.type === 'pointerdown') {
      // Usar coordenadas lógicas normalizadas del Canvas (funciona a cualquier escala de pantalla)
      const lx = evt.x * this.api.width;
      const ly = evt.y * this.api.height;
      if (lx >= 10 && lx <= 160 && ly >= 10 && ly <= 46) {
        this._cycleCharacter();
        return;
      }
      this._flap();
    } else if ((evt.type === 'keydown' || evt.type === 'virtualdown') && !evt.repeat) {
      if (evt.action === 'action' || evt.action === 'up' || evt.action === 'jump') {
        this._flap();
      } else if (evt.action === 'secondary' || evt.code === 'KeyC') {
        this._cycleCharacter();
      }
    }
  }

  _cycleCharacter() {
    this.charIdx = (this.charIdx + 1) % CHARACTERS.length;
    this.api.audio.play('click');
    this.api.updateStatusText(CHARACTERS[this.charIdx].name);
  }

  _flap() {
    this.glider.vy = this.glider.jumpImpulse;
    const ch = CHARACTERS[this.charIdx];
    spawnFXParticles(this.particles, this.glider.x - 14, this.glider.y + 4, 6, {
      colors: [ch.color, ch.secondary, '#ffffff'],
      angle: Math.PI,
      spread: 0.9,
      speedMin: 50,
      speedMax: 130,
      lifeMin: 0.16,
      lifeMax: 0.34
    });
    this.api.audio.play('jump');
  }

  update(dt) {
    const w = this.api.width;
    const h = this.api.height;
    const diff = this.api.getDifficulty();
    const scrollSpeed = 195 * diff.speedMultiplier;

    this.animTime += dt;
    this.scrollOffset += scrollSpeed * dt;
    updateAndDrawFXParticles(null, this.particles, dt, false);

    // Física del planeador
    this.glider.vy += this.glider.gravity * dt;
    this.glider.y += this.glider.vy * dt;

    if (this.glider.y - this.glider.r < 0) {
      this.glider.y = this.glider.r;
      this.glider.vy = 0;
    }
    if (this.glider.y + this.glider.r > h - 22) {
      this.api.triggerGameOver({ reason: 'Impacto contra el suelo energético' });
      return;
    }

    // Estrellas de fondo
    for (const st of this.stars) {
      st.x -= scrollSpeed * 0.25 * dt;
      if (st.x < 0) st.x = w;
    }

    // Generación de compuertas láser
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const gapSize = Math.max(126, 178 - diff.level * 4);
      const minCenter = 90 + gapSize / 2;
      const maxCenter = h - 95 - gapSize / 2;
      const centerY = minCenter + Math.random() * (maxCenter - minCenter);
      const moving = diff.level >= 2 && Math.random() < Math.min(0.65, 0.25 + diff.level * 0.05);

      this.gates.push({
        x: w + 30,
        w: 52,
        centerY,
        gapSize,
        vy: moving ? (Math.random() < 0.5 ? 1 : -1) * Math.min(130, 42 + diff.level * 5) : 0,
        minCenter,
        maxCenter,
        passed: false,
        hasOrb: Math.random() < 0.45,
        orbCollected: false
      });

      this.spawnTimer = Math.max(1.15, 1.95 / Math.sqrt(diff.speedMultiplier));
    }

    // Actualizar compuertas y colisiones
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.x -= scrollSpeed * dt;

      if (g.vy !== 0) {
        g.centerY += g.vy * dt;
        if (g.centerY < g.minCenter || g.centerY > g.maxCenter) {
          g.vy *= -1;
        }
      }

      const topH = g.centerY - g.gapSize / 2;
      const botY = g.centerY + g.gapSize / 2;

      // Recolectar orbe bonus
      if (g.hasOrb && !g.orbCollected) {
        const ox = g.x + g.w / 2;
        const oy = g.centerY;
        if (Math.hypot(this.glider.x - ox, this.glider.y - oy) < this.glider.r + 10) {
          g.orbCollected = true;
          this.api.addScore(15);
          this.api.audio.play('pickup');
        }
      }

      // Comprobar paso exitoso
      if (!g.passed && g.x + g.w < this.glider.x) {
        g.passed = true;
        this.api.addScore(10);
        this.api.advanceProgress(1);
        this.api.audio.play('point');
      }

      // Colisión contra pilares superior o inferior
      if (
        this.glider.x + this.glider.r - 3 > g.x &&
        this.glider.x - this.glider.r + 3 < g.x + g.w
      ) {
        if (this.glider.y - this.glider.r + 3 < topH || this.glider.y + this.glider.r - 3 > botY) {
          this.api.triggerGameOver({ reason: 'Colisión contra compuerta láser' });
          return;
        }
      }

      if (g.x + g.w < -40) {
        this.gates.splice(i, 1);
      }
    }
  }

  render(ctx) {
    const w = this.api.width;
    const h = this.api.height;
    const biome = BIOMES[(this.api.level.level - 1) % BIOMES.length];
    const ch = CHARACTERS[this.charIdx];

    // 1. Cielo atmosférico y astro lejano
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, biome.bgTop);
    grad.addColorStop(1, biome.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    drawGlowCircle(ctx, w * 0.78, h * 0.22, 95, `${biome.gateColor}22`);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.22, 40, 0, Math.PI * 2);
    ctx.fill();

    // Estrellas parallax
    for (const st of this.stars) {
      ctx.fillStyle = st.s > 2 ? '#e0f2fe' : 'rgba(255,255,255,0.45)';
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }

    // 2. Siluetas de montañas / templos en paralaje
    const ridgeShift = (this.scrollOffset * 0.22) % 160;
    ctx.fillStyle = biome.ridge;
    ctx.beginPath();
    ctx.moveTo(0, h - 22);
    for (let x = -160 - ridgeShift; x <= w + 160; x += 80) {
      ctx.lineTo(x + 40, h - 105 - (Math.abs(Math.round(x)) % 3) * 28);
      ctx.lineTo(x + 80, h - 22);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Torres láser hidráulicas detalladas con boquillas y núcleos
    for (const g of this.gates) {
      const topH = Math.max(0, g.centerY - g.gapSize / 2);
      const botY = g.centerY + g.gapSize / 2;
      const botH = Math.max(0, h - botY - 22);

      const drawTower = (x, y, gw, gh, capAtBottom) => {
        if (gh <= 0) return;
        ctx.fillStyle = biome.gateDark;
        ctx.fillRect(x + 3, y, gw - 6, gh);
        // Núcleo energético central
        ctx.fillStyle = biome.gateColor;
        ctx.fillRect(x + gw * 0.36, y, gw * 0.28, gh);
        // Reflejo lateral y borde
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 6, y, 5, gh);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3, y, gw - 6, gh);
        // Boquilla remachada en la boca de la puerta
        const capY = capAtBottom ? y + gh - 16 : y;
        ctx.fillStyle = biome.gateColor;
        ctx.beginPath();
        ctx.roundRect(x - 4, capY, gw + 8, 16, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      drawTower(g.x, 0, g.w, topH, true);
      drawTower(g.x, botY, g.w, botH, false);

      // Anillo / Gema Solar bonus giratorio
      if (g.hasOrb && !g.orbCollected) {
        const ox = g.x + g.w / 2;
        const oy = g.centerY;
        drawGlowCircle(ctx, ox, oy, 20, 'rgba(250, 204, 21, 0.5)');
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(this.animTime * 4);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
    }

    // 4. Suelo energético con marcas chevron
    ctx.fillStyle = '#090d1a';
    ctx.fillRect(0, h - 22, w, 22);
    const floorShift = this.scrollOffset % 36;
    ctx.fillStyle = biome.gateDark;
    for (let x = -floorShift; x < w + 36; x += 36) {
      ctx.fillRect(x, h - 18, 18, 12);
    }
    ctx.strokeStyle = biome.gateColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, h - 22);
    ctx.lineTo(w, h - 22);
    ctx.stroke();

    updateAndDrawFXParticles(ctx, this.particles, 0, true);

    // 5. Personaje planeador ilustrado (Fénix Solar / Caza Ala Cian / Búho Prisma)
    const flapWave = Math.sin(this.animTime * 18) * 7;
    ctx.save();
    ctx.translate(this.glider.x, this.glider.y);
    const tilt = Math.max(-0.5, Math.min(0.6, this.glider.vy / 500));
    ctx.rotate(tilt);
    drawGlowCircle(ctx, 0, 0, 26, `${ch.color}33`);

    if (ch.shape === 'orb') {
      // Orbe Solar (Fénix Cibernético con ala batiente, cresta y pico)
      ctx.fillStyle = ch.secondary;
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.lineTo(-22, -10 + flapWave * 0.6);
      ctx.lineTo(-16, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Ala animada
      ctx.fillStyle = ch.secondary;
      ctx.beginPath();
      ctx.ellipse(-3, 2 + flapWave * 0.45, 9, 5.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
      // Pico aerodinámico
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(14, -3);
      ctx.lineTo(24, 1);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fill();
      // Visor
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(7, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8.5, -4, 2.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (ch.shape === 'delta') {
      // Ala Cian (Caza supersónico con llama propulsora y carlinga)
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.lineTo(-24 - Math.sin(this.animTime * 40) * 4, 0);
      ctx.lineTo(-14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(-12, -16);
      ctx.lineTo(-16, -6);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-16, 6);
      ctx.lineTo(-12, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ch.secondary;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = ch.accent;
      ctx.fillRect(-10, -13, 8, 3);
      ctx.fillRect(-10, 10, 8, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(5, 0, 6.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Núcleo Prisma (Centinela Arcano con alas flotantes y ojo místico)
      ctx.fillStyle = ch.secondary;
      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.lineTo(-18, -16 + flapWave * 0.5);
      ctx.lineTo(-8, -3);
      ctx.moveTo(-4, 10);
      ctx.lineTo(-18, 16 - flapWave * 0.5);
      ctx.lineTo(-8, 3);
      ctx.fill();
      ctx.fillStyle = ch.color;
      ctx.strokeStyle = ch.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(18, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ch.accent;
      ctx.beginPath();
      ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(4.5, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Botón visual para cambiar de nave
    ctx.fillStyle = 'rgba(11, 13, 25, 0.82)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 150, 32, 8);
    ctx.fill();
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`✈ ${ch.name} (C)`, 18, 30);
  }

  destroy() {}
}
