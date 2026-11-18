import { StorageService } from '../services/StorageService.js';
import { CHIPTUNE_TRACKS, noteToFreq } from './ChiptuneSoundtrack.js';

/**
 * Motor de audio y sintetizador chiptune / 8-bits basado en Web Audio API.
 * Maneja 4 canales clásicos de placa arcade (Lead cuadrado, Armonía/Arpegio,
 * Bajo diente de sierra con filtro pasa-bajos y Percusión por ruido blanco precalculado)
 * mediante un scheduler lookahead preciso sobre ctx.currentTime sin saturar el rendimiento.
 */
class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.compressor = null;
    this.noiseBuffer = null;

    this.schedulerTimer = null;
    this.isMusicPlaying = false;
    this.isMusicPaused = false;
    this.currentTrackId = null;
    this.nextNoteTime = 0;
    this.musicStep = 0;
    this._unlockListenerBound = false;

    const settings = StorageService.getSettings();
    this.soundEnabled = settings.soundEnabled !== false;
    this.musicEnabled = settings.musicEnabled !== false;
    this.volume = typeof settings.volume === 'number' ? settings.volume : 0.7;
  }

  _ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Cadena de mezcla segura con compresor para evitar clipping al sumar canales
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.15;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.55 : 0;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundEnabled ? 0.85 : 0;

      this.musicGain.connect(this.compressor);
      this.sfxGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this._buildNoiseBuffer();
      this._attachUnlockListeners();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _buildNoiseBuffer() {
    if (!this.ctx || this.noiseBuffer) return;
    // Búfer reutilizable de ruido blanco (0.5s) para caja y platillos sin asignar memoria por nota
    const length = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  _attachUnlockListeners() {
    if (this._unlockListenerBound || typeof window === 'undefined') return;
    this._unlockListenerBound = true;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.isMusicPlaying && !this.isMusicPaused && this.musicEnabled) {
            this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.04);
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  syncFromSettings() {
    const settings = StorageService.getSettings();
    this.soundEnabled = settings.soundEnabled !== false;
    this.musicEnabled = settings.musicEnabled !== false;
    this.volume = typeof settings.volume === 'number' ? settings.volume : 0.7;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.soundEnabled ? 0.85 : 0, this.ctx.currentTime, 0.02);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.55 : 0, this.ctx.currentTime, 0.02);
    }
    if (!this.musicEnabled) {
      this.stopMusic();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol)));
    StorageService.saveSettings({ volume: this.volume });
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    StorageService.saveSettings({ soundEnabled: this.soundEnabled });
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.soundEnabled ? 0.85 : 0, this.ctx.currentTime, 0.02);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    StorageService.saveSettings({ musicEnabled: this.musicEnabled });
    if (this.musicEnabled) {
      if (this.currentTrackId) {
        this.startMusic(this.currentTrackId);
      }
    } else {
      this.stopMusic(false);
    }
  }

  /* ==========================================================================
   * SINTETIZADOR DE EFECTOS DE SONIDO (SFX)
   * ========================================================================== */
  _tone(freq, duration = 0.1, type = 'square', slideTo = null, gainScale = 0.2, delay = 0) {
    if (!this.soundEnabled || this.volume <= 0.01) return;
    const ctx = this._ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const startTime = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), startTime + duration);
      }

      const peak = Math.max(0.001, gainScale);
      gain.gain.setValueAtTime(peak, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.015);
    } catch {
      // ignore audio context restrictions
    }
  }

  _sfxNoise(duration = 0.15, filterFreq = 900, gainScale = 0.22) {
    if (!this.soundEnabled || this.volume <= 0.01) return;
    const ctx = this._ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    try {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainScale, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      src.start(now);
      src.stop(now + duration + 0.01);
    } catch {
      // ignore
    }
  }

  play(effect) {
    if (!this.soundEnabled || this.volume <= 0.01) return;

    switch (effect) {
      case 'click':
        this._tone(620, 0.045, 'triangle', 840, 0.14);
        break;
      case 'start':
        this._tone(330, 0.08, 'square', null, 0.16, 0);
        this._tone(440, 0.08, 'square', null, 0.16, 0.08);
        this._tone(659.25, 0.16, 'square', null, 0.2, 0.16);
        break;
      case 'pickup':
      case 'point':
      case 'coin':
        this._tone(587.33, 0.07, 'sine', 880, 0.18, 0);
        this._tone(880, 0.09, 'triangle', 1174.66, 0.16, 0.06);
        break;
      case 'bounce':
      case 'hit':
        this._tone(280, 0.055, 'square', 190, 0.16);
        break;
      case 'brick':
        this._tone(440, 0.07, 'triangle', 660, 0.18);
        break;
      case 'laser':
      case 'shoot':
        this._tone(880, 0.08, 'sawtooth', 220, 0.15);
        break;
      case 'bomb':
        this._tone(240, 0.09, 'triangle', 140, 0.18);
        break;
      case 'grenade':
        this._tone(420, 0.12, 'square', 180, 0.16);
        break;
      case 'jump':
        this._tone(260, 0.12, 'square', 560, 0.15);
        break;
      case 'climb':
        this._tone(310, 0.035, 'triangle', 360, 0.09);
        break;
      case 'hammer':
        this._tone(520, 0.08, 'square', 780, 0.18);
        break;
      case 'flip':
      case 'move':
        this._tone(380, 0.035, 'triangle', 460, 0.1);
        break;
      case 'merge':
        this._tone(420, 0.08, 'sine', 740, 0.18);
        break;
      case 'explosion':
      case 'boom':
        this._tone(140, 0.22, 'sawtooth', 38, 0.22);
        this._sfxNoise(0.24, 1200, 0.26);
        break;
      case 'levelUp':
        this._tone(440, 0.08, 'triangle', null, 0.18, 0);
        this._tone(554.37, 0.08, 'triangle', null, 0.18, 0.08);
        this._tone(659.25, 0.08, 'triangle', null, 0.18, 0.16);
        this._tone(880, 0.22, 'triangle', null, 0.22, 0.24);
        break;
      case 'achievement':
        this._tone(523.25, 0.09, 'sine', null, 0.2, 0);
        this._tone(659.25, 0.09, 'sine', null, 0.2, 0.09);
        this._tone(783.99, 0.09, 'sine', null, 0.2, 0.18);
        this._tone(1046.5, 0.28, 'triangle', null, 0.24, 0.27);
        break;
      case 'gameOver':
        this._tone(392, 0.14, 'sawtooth', 349.23, 0.18, 0);
        this._tone(349.23, 0.14, 'sawtooth', 311.13, 0.18, 0.14);
        this._tone(311.13, 0.16, 'sawtooth', 261.63, 0.18, 0.28);
        this._tone(246.94, 0.35, 'sawtooth', 130.81, 0.2, 0.44);
        break;
      default:
        this._tone(440, 0.05, 'sine', null, 0.12);
    }
  }

  /* ==========================================================================
   * SINTETIZADOR CHIPTUNE / 8-BITS MULTI-CANAL CON LOOKAHEAD SCHEDULER
   * ========================================================================== */
  getTrackInfo(trackId) {
    return CHIPTUNE_TRACKS[trackId] || CHIPTUNE_TRACKS.bomberman;
  }

  startMusic(trackId = null) {
    if (trackId) {
      this.currentTrackId = trackId;
    }
    if (!this.currentTrackId) {
      this.currentTrackId = 'bomberman';
    }

    this._clearScheduler();

    if (!this.musicEnabled || this.volume <= 0.01) {
      this.isMusicPlaying = false;
      return;
    }

    const ctx = this._ensureContext();
    if (!ctx) return;

    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(0.55, ctx.currentTime, 0.02);
    }

    this.isMusicPlaying = true;
    this.isMusicPaused = false;
    this.musicStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    this.schedulerTimer = window.setInterval(() => this._scheduleLoop(), 35);
  }

  pauseMusic() {
    this.isMusicPaused = true;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.04);
    }
  }

  resumeMusic() {
    if (!this.isMusicPlaying && this.currentTrackId && this.musicEnabled) {
      this.startMusic(this.currentTrackId);
      return;
    }
    this.isMusicPaused = false;
    if (this.ctx && this.musicGain) {
      this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.04);
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.55 : 0, this.ctx.currentTime, 0.04);
    }
  }

  _clearScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  stopMusic(clearTrack = true) {
    this._clearScheduler();
    this.isMusicPlaying = false;
    this.isMusicPaused = false;
    if (clearTrack) {
      this.currentTrackId = null;
    }
    if (this.ctx && this.musicGain) {
      try {
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      } catch {
        // ignore
      }
    }
  }

  _scheduleLoop() {
    if (!this.isMusicPlaying || this.isMusicPaused || !this.musicEnabled || document.hidden) {
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const track = this.getTrackInfo(this.currentTrackId);
    const stepDuration = 60 / track.bpm / 2; // Corchea (8th note) por paso
    const scheduleAheadTime = 0.14;

    // Si hubo un retraso grande del hilo principal, realinear sin disparar ráfagas acumuladas
    if (this.nextNoteTime < ctx.currentTime - 0.12) {
      this.nextNoteTime = ctx.currentTime + 0.03;
    }

    while (this.nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      this._scheduleStep(track, this.musicStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.musicStep++;
    }
  }

  _scheduleStep(track, stepIdx, time, stepDur) {
    // Canal 1: Melodía Principal (square / sawtooth)
    if (track.lead && track.lead.length > 0) {
      const note = track.lead[stepIdx % track.lead.length];
      const freq = noteToFreq(note);
      if (freq > 0) {
        this._scheduleChipVoice(freq, time, stepDur * 0.86, track.leadWave || 'square', 0.14);
      }
    }

    // Canal 2: Armonía / Arpegio (triangle / square suave)
    if (track.arp && track.arp.length > 0) {
      const note = track.arp[stepIdx % track.arp.length];
      const freq = noteToFreq(note);
      if (freq > 0) {
        this._scheduleChipVoice(freq, time, stepDur * 0.72, track.arpWave || 'triangle', 0.075);
      }
    }

    // Canal 3: Línea de Bajo (sawtooth/triangle con filtro pasa-bajos estilo placa arcade)
    if (track.bass && track.bass.length > 0) {
      const note = track.bass[stepIdx % track.bass.length];
      const freq = noteToFreq(note);
      if (freq > 0) {
        this._scheduleBassVoice(freq, time, stepDur * 0.9, track.bassWave || 'sawtooth', 0.17);
      }
    }

    // Canal 4: Percusión (Bombo, Caja de ruido, Hi-Hat de ruido)
    if (track.drums && track.drums.length > 0) {
      const hit = track.drums[stepIdx % track.drums.length];
      if (hit === 'K' || hit === 'X') this._scheduleKick(time);
      if (hit === 'S' || hit === 'B') this._scheduleSnare(time);
      if (hit === 'H' || hit === 'X' || hit === 'B') this._scheduleHiHat(time);
    }
  }

  _scheduleChipVoice(freq, time, dur, waveType, peakGain) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, time);

      // Envolvente chiptune con ataque rápido (4ms) y decaimiento nítido
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peakGain, time + 0.005);
      gain.gain.setValueAtTime(peakGain * 0.78, time + dur * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.015);
    } catch {
      // ignore
    }
  }

  _scheduleBassVoice(freq, time, dur, waveType, peakGain) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(900, freq * 5), time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peakGain, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.015);
    } catch {
      // ignore
    }
  }

  _scheduleKick(time) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.11);
    } catch {
      // ignore
    }
  }

  _scheduleSnare(time) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.noiseBuffer) return;
    try {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, time);
      filter.Q.value = 0.8;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.15, time);
      nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.12);

      // Cuerpo tonal de caja estilo 8-bit
      const body = ctx.createOscillator();
      const bGain = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(190, time);
      body.frequency.exponentialRampToValueAtTime(95, time + 0.06);
      bGain.gain.setValueAtTime(0.1, time);
      bGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
      body.connect(bGain);
      bGain.connect(this.musicGain);
      body.start(time);
      body.stop(time + 0.08);
    } catch {
      // ignore
    }
  }

  _scheduleHiHat(time) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.noiseBuffer) return;
    try {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6200, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.065, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.045);
    } catch {
      // ignore
    }
  }
}

export const AudioManager = new AudioManagerClass();
