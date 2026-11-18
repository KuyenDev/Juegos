/**
 * Catálogo completo de composiciones chiptune / 8-bits originales.
 * Cada pista define: tempo (BPM), división rítmica, timbres por canal
 * (melodía cuadrada, armonía/arpegio, bajo en diente de sierra y patrón de percusión por ruido).
 */

const NOTE_SEMITONES = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};

export function noteToFreq(note) {
  if (!note || note === '-') return 0;
  if (typeof note === 'number') return note;
  const match = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!match) return 0;
  const semi = NOTE_SEMITONES[match[1]];
  const oct = parseInt(match[2], 10);
  const midi = (oct + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Patrón de percusión por carácter (longitud 32 o 16):
 *  'K' = Kick (bombo)
 *  'S' = Snare (caja con ruido)
 *  'H' = Hi-Hat (platillo corto con ruido agudo)
 *  'X' = Kick + Hi-Hat
 *  'B' = Snare + Hi-Hat
 *  '.' = Silencio
 */
export const CHIPTUNE_TRACKS = {
  // 1. BOMBERMAN — Melodía alegre, rítmica y pegadiza en Do Mayor (144 BPM)
  bomberman: {
    title: 'Blast Grid March',
    bpm: 144,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: [
      'C5', '-', 'E5', 'G5', 'A5', '-', 'G5', 'E5',
      'F5', 'E5', 'D5', 'E5', 'C5', '-', 'G4', '-',
      'C5', '-', 'E5', 'G5', 'C6', '-', 'B5', 'A5',
      'G5', 'F5', 'E5', 'D5', 'G5', '-', '-', '-',
      'A5', '-', 'F5', 'A5', 'G5', '-', 'E5', 'G5',
      'F5', '-', 'D5', 'F5', 'E5', 'D5', 'C5', '-',
      'D5', 'E5', 'F5', 'G5', 'A5', 'G5', 'F5', 'D5',
      'E5', '-', 'D5', '-', 'C5', '-', '-', '-'
    ],
    arp: [
      'E4', 'G4', 'C5', 'G4', 'F4', 'A4', 'C5', 'A4',
      'D4', 'F4', 'A4', 'F4', 'E4', 'G4', 'C5', 'G4',
      'E4', 'G4', 'C5', 'G4', 'F4', 'A4', 'C5', 'A4',
      'D4', 'G4', 'B4', 'G4', 'D4', 'G4', 'B4', 'G4',
      'F4', 'A4', 'C5', 'A4', 'E4', 'G4', 'C5', 'G4',
      'D4', 'F4', 'A4', 'F4', 'C4', 'E4', 'G4', 'E4',
      'F4', 'A4', 'D5', 'A4', 'G4', 'B4', 'D5', 'B4',
      'G4', 'B4', 'D5', 'B4', 'C4', 'E4', 'G4', '-'
    ],
    bass: [
      'C2', '-', 'C3', '-', 'A1', '-', 'A2', '-',
      'F2', '-', 'F3', '-', 'C2', '-', 'G2', '-',
      'C2', '-', 'C3', '-', 'F2', '-', 'F3', '-',
      'G2', '-', 'G3', '-', 'G2', 'A2', 'B2', '-',
      'F2', '-', 'F3', '-', 'E2', '-', 'E3', '-',
      'D2', '-', 'D3', '-', 'C2', '-', 'C3', '-',
      'D2', '-', 'D3', '-', 'G2', '-', 'G3', '-',
      'G2', '-', 'G2', '-', 'C2', '-', 'G2', '-'
    ],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.K.S.H.K.H.S.H.K.H.S.H.K.H.S.H.K.S.S.H.'
  },

  // 2. SHMUP VERTICAL — Ritmo espacial heroico y veloz en Mi menor (156 BPM)
  shmup: {
    title: 'Starlight Overdrive',
    bpm: 156,
    leadWave: 'square',
    arpWave: 'square',
    bassWave: 'sawtooth',
    lead: [
      'E5', '-', 'B4', 'E5', 'G5', '-', 'F#5', 'E5',
      'D5', '-', 'A4', 'D5', 'F#5', '-', 'E5', 'D5',
      'C5', '-', 'G4', 'C5', 'E5', '-', 'D5', 'C5',
      'B4', 'C5', 'D5', 'E5', 'F#5', '-', 'B4', '-',
      'E5', 'G5', 'B5', '-', 'A5', 'G5', 'F#5', 'G5',
      'D5', 'F#5', 'A5', '-', 'G5', 'F#5', 'E5', 'F#5',
      'C5', 'E5', 'G5', 'A5', 'B5', '-', 'A5', 'G5',
      'F#5', 'E5', 'D#5', 'F#5', 'E5', '-', '-', '-'
    ],
    arp: [
      'E4', 'G4', 'B4', 'E5', 'E4', 'G4', 'B4', 'E5',
      'D4', 'F#4', 'A4', 'D5', 'D4', 'F#4', 'A4', 'D5',
      'C4', 'E4', 'G4', 'C5', 'C4', 'E4', 'G4', 'C5',
      'B3', 'D#4', 'F#4', 'B4', 'B3', 'D#4', 'F#4', 'B4',
      'E4', 'G4', 'B4', 'E5', 'E4', 'G4', 'B4', 'E5',
      'D4', 'F#4', 'A4', 'D5', 'D4', 'F#4', 'A4', 'D5',
      'C4', 'E4', 'G4', 'C5', 'A3', 'C4', 'E4', 'A4',
      'B3', 'D#4', 'F#4', 'B4', 'E4', 'B4', 'E5', '-'
    ],
    bass: [
      'E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'E2',
      'D2', 'D2', 'D3', 'D2', 'D2', 'D3', 'D2', 'D2',
      'C2', 'C2', 'C3', 'C2', 'C2', 'C3', 'C2', 'C2',
      'B1', 'B1', 'B2', 'B1', 'B1', 'B2', 'D#2', 'F#2',
      'E2', 'E2', 'E3', 'E2', 'G2', 'G2', 'G3', 'G2',
      'D2', 'D2', 'D3', 'D2', 'F#2', 'F#2', 'F#3', 'F#2',
      'C2', 'C2', 'C3', 'C2', 'A1', 'A1', 'A2', 'A1',
      'B1', 'B1', 'B2', 'B1', 'E2', '-', 'B1', '-'
    ],
    drums: 'X.H.B.H.X.X.B.H.X.H.B.H.X.H.B.S.X.H.B.H.X.X.B.H.X.H.B.H.S.S.B.S.'
  },

  // 3. METAL SLUG — Marcha militar arcade agresiva en Re menor (152 BPM)
  metalslug: {
    title: 'Iron Commando Blitz',
    bpm: 152,
    leadWave: 'sawtooth',
    arpWave: 'square',
    bassWave: 'sawtooth',
    lead: [
      'D5', 'D5', '-', 'D5', 'F5', '-', 'G5', '-',
      'A5', '-', 'G5', 'F5', 'E5', '-', 'C5', '-',
      'D5', 'D5', '-', 'D5', 'A5', '-', 'Bb5', '-',
      'A5', 'G5', 'F5', 'E5', 'D5', '-', '-', '-',
      'Bb4', '-', 'D5', 'F5', 'G5', '-', 'F5', 'E5',
      'C5', '-', 'E5', 'G5', 'A5', '-', 'G5', 'F5',
      'D5', 'E5', 'F5', 'G5', 'A5', '-', 'C6', '-',
      'Bb5', 'A5', 'G5', 'E5', 'D5', '-', '-', '-'
    ],
    arp: [
      'D4', 'A4', 'D4', 'A4', 'F4', 'A4', 'F4', 'A4',
      'C4', 'G4', 'C4', 'G4', 'C4', 'E4', 'G4', 'E4',
      'D4', 'A4', 'D4', 'A4', 'Bb3', 'F4', 'Bb3', 'F4',
      'A3', 'E4', 'G4', 'E4', 'D4', 'A4', 'D4', '-',
      'Bb3', 'D4', 'F4', 'D4', 'G3', 'Bb3', 'D4', 'Bb3',
      'C4', 'E4', 'G4', 'E4', 'A3', 'C#4', 'E4', 'C#4',
      'D4', 'F4', 'A4', 'F4', 'A3', 'C#4', 'E4', 'A4',
      'G3', 'Bb3', 'A3', 'C#4', 'D4', '-', 'A3', '-'
    ],
    bass: [
      'D2', 'D2', 'D3', 'D2', 'F2', 'F2', 'F3', 'F2',
      'C2', 'C2', 'C3', 'C2', 'A1', 'A1', 'A2', 'A1',
      'D2', 'D2', 'D3', 'D2', 'Bb1', 'Bb1', 'Bb2', 'Bb1',
      'A1', 'A1', 'A2', 'A1', 'D2', 'D2', 'A1', '-',
      'Bb1', '-', 'Bb2', 'Bb1', 'G1', '-', 'G2', 'G1',
      'C2', '-', 'C3', 'C2', 'A1', '-', 'A2', 'A1',
      'D2', 'D2', 'F2', 'F2', 'A2', 'A2', 'C3', 'C3',
      'Bb2', 'A2', 'G2', 'A2', 'D2', '-', 'D2', '-'
    ],
    drums: 'K.S.K.K.S.H.K.S.K.S.K.K.S.S.S.H.K.S.K.K.S.H.K.S.K.S.K.K.S.H.S.S.'
  },

  // 4. SUNSET RIDERS — Tema Western galopante en La menor / Mi (142 BPM)
  sunsetriders: {
    title: 'Dusty Saddle Showdown',
    bpm: 142,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: [
      'E5', '-', 'A5', 'B5', 'C6', '-', 'B5', 'A5',
      'G#5', '-', 'B5', 'E5', 'A5', '-', '-', '-',
      'E5', 'A5', 'C6', '-', 'D6', 'C6', 'B5', 'A5',
      'G5', '-', 'E5', 'G5', 'E5', '-', '-', '-',
      'F5', 'F5', 'A5', 'F5', 'E5', 'E5', 'A5', 'E5',
      'D5', 'E5', 'F5', 'D5', 'E5', '-', 'B4', '-',
      'E5', 'A5', 'C6', 'B5', 'A5', 'G#5', 'A5', 'B5',
      'C6', 'B5', 'G#5', 'E5', 'A5', '-', '-', '-'
    ],
    arp: [
      'A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E4', 'C4',
      'E3', 'G#3', 'B3', 'G#3', 'A3', 'C4', 'E4', 'C4',
      'A3', 'C4', 'E4', 'C4', 'D4', 'F4', 'A4', 'F4',
      'C4', 'E4', 'G4', 'E4', 'E3', 'G#3', 'B3', 'G#3',
      'F3', 'A3', 'C4', 'A3', 'C4', 'E4', 'A4', 'E4',
      'D4', 'F4', 'A4', 'F4', 'E3', 'G#3', 'B3', 'E4',
      'A3', 'C4', 'E4', 'C4', 'E3', 'G#3', 'B3', 'G#3',
      'E3', 'G#3', 'B3', 'E4', 'A3', 'E4', 'A4', '-'
    ],
    bass: [
      'A2', '-', 'E2', 'E2', 'A2', '-', 'E2', '-',
      'E2', '-', 'B1', 'B1', 'A2', '-', 'E2', '-',
      'A2', '-', 'E2', 'E2', 'D2', '-', 'A1', '-',
      'C2', '-', 'G1', 'G1', 'E2', '-', 'B1', '-',
      'F2', '-', 'C2', 'C2', 'C2', '-', 'G1', '-',
      'D2', '-', 'A1', 'A1', 'E2', '-', 'B1', '-',
      'A2', '-', 'E2', 'E2', 'E2', '-', 'B1', '-',
      'E2', '-', 'E2', 'G#2', 'A2', '-', 'E2', '-'
    ],
    drums: 'K.H.S.H.K.K.S.H.K.H.S.H.K.K.S.H.K.H.S.H.K.K.S.H.K.H.S.K.S.S.H.H.'
  },

  // 5. DONKEY KONG — Motivo arcade clásico sincopado estilo 1981 (136 BPM)
  donkeykong: {
    title: 'Girder Ragtime Climb',
    bpm: 136,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'triangle',
    lead: [
      'G4', 'A4', 'B4', '-', 'C5', '-', 'G4', '-',
      'E5', '-', 'D5', 'C5', 'A4', '-', '-', '-',
      'F4', 'G4', 'A4', '-', 'B4', '-', 'G4', '-',
      'D5', '-', 'C5', 'B4', 'G4', '-', '-', '-',
      'C5', '-', 'C5', 'D5', 'E5', '-', 'C5', '-',
      'F5', '-', 'E5', 'D5', 'A4', '-', '-', '-',
      'G4', 'C5', 'E5', 'G5', 'F5', 'D5', 'B4', 'G4',
      'C5', '-', 'G4', '-', 'C5', '-', '-', '-'
    ],
    arp: [
      'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'E4',
      'F4', 'A4', 'C5', 'A4', 'F4', 'A4', 'C5', 'A4',
      'D4', 'F4', 'A4', 'F4', 'G3', 'B3', 'D4', 'B3',
      'G3', 'B3', 'D4', 'B3', 'G3', 'B3', 'D4', 'B3',
      'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'Bb4', 'E4',
      'F4', 'A4', 'C5', 'A4', 'D4', 'F4', 'A4', 'F4',
      'E4', 'G4', 'C5', 'G4', 'G3', 'B3', 'D4', 'F4',
      'E4', 'G4', 'C5', 'G4', 'C4', '-', '-', '-'
    ],
    bass: [
      'C3', '-', 'E3', '-', 'G3', '-', 'A3', '-',
      'F3', '-', 'C3', '-', 'F3', '-', 'D3', '-',
      'D3', '-', 'F3', '-', 'G3', '-', 'D3', '-',
      'G2', '-', 'B2', '-', 'G2', 'A2', 'B2', '-',
      'C3', '-', 'E3', '-', 'G3', '-', 'Bb3', '-',
      'A3', '-', 'F3', '-', 'D3', '-', 'F3', '-',
      'G3', '-', 'E3', '-', 'G2', '-', 'B2', '-',
      'C3', '-', 'G2', '-', 'C3', '-', '-', '-'
    ],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.S.S.H.K.H.S.H.K.H.S.H.K.H.S.H.K.S.K.H.'
  },

  // Pistas chiptune únicas para los 12 juegos existentes
  snake: {
    title: 'Neon Viper Pulse',
    bpm: 138,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['A4','-','C5','E5','A5','-','G5','E5','F5','-','E5','D5','E5','-','-','-','G4','-','B4','D5','G5','-','F5','D5','E5','D5','C5','B4','A4','-','-','-'],
    arp: ['A3','C4','E4','A4','A3','C4','E4','A4','F3','A3','C4','F4','E3','G#3','B3','E4','G3','B3','D4','G4','G3','B3','D4','G4','E3','G#3','B3','E4','A3','C4','E4','-'],
    bass: ['A2','-','A2','E2','A2','-','A2','-','F2','-','F2','C2','E2','-','E2','-','G2','-','G2','D2','G2','-','G2','-','E2','-','E2','B1','A2','-','E2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.S.S.H.'
  },
  pacman: {
    title: 'Cyber Maze Groove',
    bpm: 146,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['C5','G5','F#5','F5','D#5','E5','-','C5','C5','G5','F#5','F5','G#5','-','-','-','C5','G5','F#5','F5','D#5','E5','-','G4','A4','B4','C5','D5','C5','-','-','-'],
    arp: ['C4','E4','G4','E4','C4','E4','G4','E4','F4','G#4','C5','G#4','G4','B4','D5','B4','C4','E4','G4','E4','C4','E4','G4','E4','F4','A4','C5','A4','G4','B4','C5','-'],
    bass: ['C2','-','G2','-','C2','-','G2','-','F2','-','C2','-','G2','-','D2','-','C2','-','G2','-','C2','-','G2','-','F2','-','G2','-','C2','-','G2','-'],
    drums: 'K.H.S.H.K.K.S.H.K.H.S.H.K.S.B.H.'
  },
  pong: {
    title: 'Laser Rally',
    bpm: 134,
    leadWave: 'triangle',
    arpWave: 'square',
    bassWave: 'sawtooth',
    lead: ['E5','-','B4','-','E5','F#5','G5','-','D5','-','A4','-','D5','E5','F#5','-','C5','-','G4','-','C5','D5','E5','-','B4','-','F#4','-','B4','-','-','-'],
    arp: ['E4','B4','E4','B4','E4','B4','E4','B4','D4','A4','D4','A4','D4','A4','D4','A4','C4','G4','C4','G4','C4','G4','C4','G4','B3','F#4','B3','F#4','B3','D#4','F#4','-'],
    bass: ['E2','-','E2','-','E2','G2','B2','-','D2','-','D2','-','D2','F#2','A2','-','C2','-','C2','-','C2','E2','G2','-','B1','-','B1','-','B1','-','B2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.H.S.S.'
  },
  breakout: {
    title: 'Prism Bounce',
    bpm: 140,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['G4','B4','D5','-','G5','F#5','D5','-','E5','D5','C5','B4','A4','-','-','-','F#4','A4','C5','-','D5','C5','A4','-','B4','A4','G4','F#4','G4','-','-','-'],
    arp: ['G3','B3','D4','G4','G3','B3','D4','G4','C4','E4','G4','C5','D4','F#4','A4','D5','D4','F#4','A4','D5','D4','F#4','A4','D5','G3','B3','D4','G4','G3','B3','D4','-'],
    bass: ['G2','-','D2','-','G2','-','D2','-','C2','-','G2','-','D2','-','A1','-','D2','-','A1','-','D2','-','A1','-','G2','-','D2','-','G2','-','D2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.K.S.H.'
  },
  spaceinvaders: {
    title: 'Orbital Phalanx',
    bpm: 132,
    leadWave: 'sawtooth',
    arpWave: 'square',
    bassWave: 'sawtooth',
    lead: ['C4','-','D4','-','Eb4','-','F4','-','G4','-','Ab4','-','G4','-','F4','-','Eb4','-','D4','-','C4','-','G3','-','C4','Eb4','G4','C5','B4','-','-','-'],
    arp: ['C3','G3','C4','G3','C3','G3','C4','G3','Ab3','Eb4','Ab4','Eb4','G3','D4','G4','D4','C3','G3','C4','G3','G3','B3','D4','G4','C4','Eb4','G4','Eb4','G3','B3','D4','-'],
    bass: ['C2','C2','-','C2','C2','-','C2','-','Ab1','Ab1','-','Ab1','G1','G1','-','G1','C2','C2','-','C2','G1','G1','-','G1','C2','C2','Eb2','G2','G1','-','-','-'],
    drums: 'K...S...K...S...K.K.S...K...S.S.'
  },
  asteroids: {
    title: 'Void Drift 80',
    bpm: 128,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['D4','-','A4','-','F4','-','E4','D4','C4','-','G4','-','E4','-','-','-','Bb3','-','F4','-','G4','-','A4','-','E4','F4','G4','E4','D4','-','-','-'],
    arp: ['D3','A3','D4','A3','D3','A3','D4','A3','C3','G3','C4','G3','C3','G3','C4','G3','Bb2','F3','Bb3','F3','G2','D3','G3','D3','A2','E3','A3','E3','D3','A3','D4','-'],
    bass: ['D2','-','D2','-','D2','-','A1','-','C2','-','C2','-','C2','-','G1','-','Bb1','-','Bb1','-','G1','-','G1','-','A1','-','A1','-','D2','-','A1','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.H.S.S.'
  },
  flappy: {
    title: 'Sky Glider',
    bpm: 138,
    leadWave: 'triangle',
    arpWave: 'square',
    bassWave: 'triangle',
    lead: ['F5','-','A5','C6','Bb5','A5','G5','-','E5','-','G5','Bb5','A5','G5','F5','-','D5','-','F5','A5','G5','F5','E5','-','C5','D5','E5','G5','F5','-','-','-'],
    arp: ['F4','A4','C5','A4','F4','A4','C5','A4','C4','E4','G4','E4','F4','A4','C5','A4','Bb3','D4','F4','D4','C4','E4','G4','E4','C4','E4','G4','E4','F4','A4','C5','-'],
    bass: ['F2','-','C3','-','F2','-','C3','-','C2','-','G2','-','F2','-','C2','-','Bb1','-','F2','-','C2','-','G2','-','C2','-','G2','-','F2','-','C2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.K.S.H.'
  },
  tetris: {
    title: 'Geometric Cascade',
    bpm: 145,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['A4','E5','D5','C5','B4','C5','D5','E5','A4','-','C5','E5','D5','C5','B4','-','G4','B4','D5','F5','E5','D5','C5','A4','E5','C5','B4','G#4','A4','-','-','-'],
    arp: ['A3','C4','E4','C4','E3','G#3','B3','G#3','A3','C4','E4','C4','E3','G#3','B3','G#3','G3','B3','D4','B3','A3','C4','E4','C4','E3','G#3','B3','E4','A3','C4','E4','-'],
    bass: ['A2','-','E2','-','E2','-','B1','-','A2','-','E2','-','E2','-','B1','-','G2','-','D2','-','A2','-','E2','-','E2','-','E2','G#2','A2','-','E2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.S.S.H.'
  },
  minesweeper: {
    title: 'Quantum Deduction',
    bpm: 112,
    leadWave: 'triangle',
    arpWave: 'sine',
    bassWave: 'triangle',
    lead: ['E4','-','G4','B4','A4','-','G4','E4','F#4','-','A4','C5','B4','-','-','-','E4','-','B4','D5','C5','-','B4','A4','G4','-','F#4','-','E4','-','-','-'],
    arp: ['E3','B3','E4','B3','E3','B3','E4','B3','D3','A3','D4','A3','B2','F#3','B3','F#3','E3','B3','E4','B3','A2','E3','A3','E3','B2','F#3','B3','F#3','E3','B3','E4','-'],
    bass: ['E2','-','-','B1','E2','-','-','B1','D2','-','-','A1','B1','-','-','-','E2','-','-','B1','A1','-','-','E1','B1','-','B1','-','E2','-','-','-'],
    drums: 'K...H...S...H...K...H...S...H.H.'
  },
  memory: {
    title: 'Neural Echoes',
    bpm: 118,
    leadWave: 'triangle',
    arpWave: 'triangle',
    bassWave: 'triangle',
    lead: ['D5','-','F#5','A5','G5','-','F#5','D5','E5','-','G5','B5','A5','-','-','-','F#5','-','A5','D6','B5','-','A5','G5','F#5','E5','D5','E5','D5','-','-','-'],
    arp: ['D4','F#4','A4','F#4','D4','F#4','A4','F#4','G4','B4','D5','B4','A4','C#5','E5','C#5','D4','F#4','A4','F#4','G4','B4','D5','B4','A4','C#5','E5','C#5','D4','F#4','A4','-'],
    bass: ['D2','-','A2','-','D2','-','A2','-','G2','-','D3','-','A2','-','E2','-','D2','-','A2','-','G2','-','D3','-','A2','-','E2','-','D2','-','A2','-'],
    drums: 'K...H.H.S...H...K...H.H.S...H.S.'
  },
  '2048': {
    title: 'Binary Fusion',
    bpm: 122,
    leadWave: 'triangle',
    arpWave: 'square',
    bassWave: 'triangle',
    lead: ['C5','-','E5','G5','B5','-','G5','E5','A4','-','C5','E5','G5','-','E5','-','F4','-','A4','C5','E5','-','D5','C5','D5','-','G5','F5','E5','-','-','-'],
    arp: ['C4','E4','G4','B4','C4','E4','G4','B4','A3','C4','E4','G4','A3','C4','E4','G4','F3','A3','C4','E4','F3','A3','C4','E4','G3','B3','D4','F4','C4','E4','G4','-'],
    bass: ['C2','-','G2','-','C2','-','G2','-','A1','-','E2','-','A1','-','E2','-','F2','-','C3','-','F2','-','C3','-','G2','-','D3','-','C2','-','G2','-'],
    drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.H.S.H.'
  },
  reaction: {
    title: 'Synapse Countdown',
    bpm: 128,
    leadWave: 'square',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    lead: ['A4','-','-','-','C5','-','-','-','E5','-','D5','-','C5','-','B4','-','A4','-','-','-','G4','-','-','-','E4','-','G4','-','A4','-','-','-'],
    arp: ['A3','E4','A3','E4','A3','E4','A3','E4','C4','G4','C4','G4','B3','E4','B3','E4','A3','E4','A3','E4','G3','D4','G3','D4','E3','B3','E3','B3','A3','E4','A3','-'],
    bass: ['A2','-','A2','-','A2','-','A2','-','C2','-','C2','-','E2','-','E2','-','A2','-','A2','-','G2','-','G2','-','E2','-','E2','-','A2','-','E2','-'],
    drums: 'K...H...S...H...K.K.H...S...H.H.'
  }
};
