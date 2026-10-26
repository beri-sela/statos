import type { VoiceType } from './types';

/** Semitones above doh for every sol-fa syllable, including chromatic ones. */
export const SYLLABLES: Record<string, { semis: number; degree: number }> = {
  d: { semis: 0, degree: 0 }, de: { semis: 1, degree: 0 },
  ra: { semis: 1, degree: 1 }, r: { semis: 2, degree: 1 }, re: { semis: 3, degree: 1 },
  ma: { semis: 3, degree: 2 }, m: { semis: 4, degree: 2 },
  f: { semis: 5, degree: 3 }, fe: { semis: 6, degree: 3 },
  ba: { semis: 6, degree: 4 }, s: { semis: 7, degree: 4 }, se: { semis: 8, degree: 4 },
  lo: { semis: 8, degree: 5 }, l: { semis: 9, degree: 5 }, le: { semis: 10, degree: 5 },
  ta: { semis: 10, degree: 6 }, t: { semis: 11, degree: 6 },
};

/** Syllable to use for a pitch, given its scale degree (from the letter name) when known. */
const BY_DEGREE: Record<number, Record<number, string>> = {
  0: { 0: 'd', 1: 'de', 11: 't' }, 1: { 1: 'ra', 2: 'r', 3: 're' }, 2: { 3: 'ma', 4: 'm', 5: 'f' },
  3: { 4: 'm', 5: 'f', 6: 'fe' }, 4: { 6: 'ba', 7: 's', 8: 'se' }, 5: { 8: 'lo', 9: 'l', 10: 'le' },
  6: { 10: 'ta', 11: 't', 0: 'd' },
};
const DEFAULT_BY_SEMIS = ['d', 'de', 'r', 'ma', 'm', 'f', 'fe', 's', 'se', 'l', 'ta', 't'];

export function syllableFor(semis: number, degree?: number): string {
  if (degree !== undefined) {
    const s = BY_DEGREE[degree]?.[semis];
    if (s) return s;
  }
  return DEFAULT_BY_SEMIS[semis];
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

export interface KeyInfo { letter: number; pc: number; name: string }

/** Parses `Bb`, `B♭`, `F#`, `C` … into letter index and pitch class. Returns null if invalid. */
export function parseKey(name: string): KeyInfo | null {
  const m = /^\s*([A-Ga-g])\s*(#|♯|b|♭)?\s*$/.exec(name);
  if (!m) return null;
  const letter = LETTERS.indexOf(m[1].toUpperCase());
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0;
  const pc = (LETTER_PC[letter] + acc + 12) % 12;
  return { letter, pc, name: LETTERS[letter] + (acc > 0 ? '#' : acc < 0 ? 'b' : '') };
}

export function displayKey(name: string): string {
  return name.replace('#', '♯').replace(/b$/, '♭');
}

const FIFTHS_NAMES: Record<number, string> = {
  [-7]: 'Cb', [-6]: 'Gb', [-5]: 'Db', [-4]: 'Ab', [-3]: 'Eb', [-2]: 'Bb', [-1]: 'F',
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};

export function keyToFifths(name: string): number {
  const k = parseKey(name);
  if (!k) return 0;
  for (const [f, n] of Object.entries(FIFTHS_NAMES)) if (n === k.name) return Number(f);
  // Unusual spelling (e.g. D#): pick the signature with the same pitch class and fewest accidentals.
  let best = 0;
  for (let f = -7; f <= 7; f++) {
    if ((((f * 7) % 12) + 12) % 12 === k.pc && Math.abs(f) < Math.abs(best || 99)) best = f;
  }
  return best;
}

export function fifthsToKey(fifths: number): string {
  return FIFTHS_NAMES[Math.max(-7, Math.min(7, fifths))];
}

export const isMale = (v: VoiceType) => v === 'T' || v === 'B';

/**
 * MIDI pitch of the unmarked doh for a voice. Women's unmarked doh lies in C4–B4;
 * men's parts are written at the same letters but sound an octave lower.
 */
export function dohMidi(doh: string, voice: VoiceType): number {
  const k = parseKey(doh) ?? { pc: 0 };
  const octave = isMale(voice) ? 3 : 4;
  return 12 * (octave + 1) + k.pc;
}

export function noteMidi(doh: string, voice: VoiceType, semis: number, octave: number): number {
  return dohMidi(doh, voice) + semis + 12 * octave;
}

/** Spells a sol-fa note as a letter name for staff notation. */
export function spell(doh: string, syl: string, midi: number): { step: string; alter: number; octave: number } {
  const k = parseKey(doh) ?? { letter: 0, pc: 0 };
  const deg = SYLLABLES[syl]?.degree ?? 0;
  const letter = (k.letter + deg) % 7;
  const natural = LETTER_PC[letter];
  let alter = (((midi % 12) - natural) % 12 + 12) % 12;
  if (alter > 6) alter -= 12;
  const octave = Math.floor((midi - alter - natural) / 12) - 1;
  return { step: LETTERS[letter], alter, octave };
}

/** Converts an absolute pitch (with its letter name) to sol-fa relative to the voice's unmarked doh. */
export function toSolfa(doh: string, voice: VoiceType, midi: number, step?: string) {
  const rel = midi - dohMidi(doh, voice);
  const octave = Math.floor(rel / 12);
  const semis = ((rel % 12) + 12) % 12;
  let degree: number | undefined;
  const k = parseKey(doh);
  if (step && k) degree = (LETTERS.indexOf(step) - k.letter + 7) % 7;
  const syl = syllableFor(semis, degree);
  return { syl, semis: SYLLABLES[syl].semis, octave };
}

/** Text form of an octave mark: `'` up, `1`/`2` down. */
export function octaveSuffix(octave: number): string {
  if (octave > 0) return "'".repeat(octave);
  if (octave < 0) return String(-octave);
  return '';
}

/** Medium-accent positions (pulse indices after which `/` belongs) for a bar of n pulses. */
export function mediumAccents(pulses: number): number[] {
  switch (pulses) {
    case 4: return [2];
    case 6: return [3];
    case 9: return [3, 6];
    case 12: return [6];
    default: return [];
  }
}
