/**
 * Chord symbols above the music (C, G7, Am, F/A, B♭maj7 …): parsing, naming, storage in the
 * score's `chords` text, and automatic detection from the notes being sung.
 */
import type { Analysis } from './analyze';
import { keyToFifths, parseKey } from './solfa';
import { TICKS, type Issue } from './types';

export type ChordKind = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7' | 'sus4' | 'sus2' | '6' | 'm6';

export interface Chord {
  root: number; // pitch class 0–11
  kind: ChordKind;
  /** Bass pitch class when it differs from the root (slash chord). */
  bass: number | null;
  text: string;
}

/** Intervals above the root for each chord kind. */
export const CHORD_TONES: Record<ChordKind, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7], sus2: [0, 2, 7], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
};

const SUFFIX: Record<ChordKind, string> = {
  maj: '', min: 'm', dim: 'dim', aug: 'aug', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim7: 'dim7',
  sus4: 'sus4', sus2: 'sus2', '6': '6', m6: 'm6',
};

/** Typed suffixes (several spellings accepted) → kind. */
const KIND_OF: Record<string, ChordKind> = {
  '': 'maj', M: 'maj', maj: 'maj', m: 'min', min: 'min', '-': 'min',
  dim: 'dim', '°': 'dim', o: 'dim', aug: 'aug', '+': 'aug',
  '7': '7', dom7: '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', m7: 'm7', min7: 'm7', '-7': 'm7',
  m7b5: 'm7b5', 'm7♭5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
  sus4: 'sus4', sus: 'sus4', sus2: 'sus2', '6': '6', m6: 'm6',
};

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const NOTE_RE = '([A-G])([#♯b♭]?)';
const CHORD_RE = new RegExp(`^${NOTE_RE}([^/]*)(?:/${NOTE_RE})?$`);

const pcOf = (letter: string, acc: string) => (LETTER_PC[letter] + (acc === '#' || acc === '♯' ? 1 : acc ? -1 : 0) + 12) % 12;

/** Parses a chord symbol such as `G7`, `F#m`, `Bbmaj7`, `C/E`. Returns null when it isn't one. */
export function parseChord(text: string): Chord | null {
  const t = text.trim();
  const m = CHORD_RE.exec(t);
  if (!m) return null;
  const kind = KIND_OF[m[3]];
  if (!kind) return null;
  const root = pcOf(m[1], m[2]);
  const bass = m[4] ? pcOf(m[4], m[5]) : null;
  return { root, kind, bass: bass === root ? null : bass, text: t };
}

/** Pitch class of the tonic: doh, or lah for minor (lah-mode) pieces. */
export function tonicPc(doh: string, mode: 'major' | 'minor'): number {
  const pc = parseKey(doh)?.pc ?? 0;
  return mode === 'minor' ? (pc + 9) % 12 : pc;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
/** Scale steps of each numeral above the tonic, major and (natural) minor. */
const STEPS: Record<'major' | 'minor', number[]> = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const ROMAN_RE = /^([#♯b♭]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°7|ø7|°|ø|\+|dim7|dim|aug|maj7|M7|m7|7|6|sus4|sus2)?(?:\/([A-G][#♯b♭]?))?$/;

/** Reads a Roman-numeral chord (I, ii, V7, IVmaj7, vii°, ♭VII, V/B) in the given key. */
export function parseRoman(text: string, doh: string, mode: 'major' | 'minor'): Chord | null {
  const m = ROMAN_RE.exec(text.trim());
  if (!m) return null;
  const degree = NUMERALS.indexOf(m[2].toUpperCase());
  const lower = m[2] === m[2].toLowerCase();
  const shift = m[1] === '#' || m[1] === '♯' ? 1 : m[1] ? -1 : 0;
  const root = (tonicPc(doh, mode) + STEPS[mode][degree] + shift + 12) % 12;
  const q = m[3] ?? '';
  let kind: ChordKind;
  if (q === '°' || q === 'dim') kind = 'dim';
  else if (q === '°7' || q === 'dim7') kind = 'dim7';
  else if (q === 'ø' || q === 'ø7') kind = 'm7b5';
  else if (q === '+' || q === 'aug') kind = 'aug';
  else if (q === 'maj7' || q === 'M7') kind = 'maj7';
  else if (q === '7' || q === 'm7') kind = lower ? 'm7' : '7';
  else if (q === '6') kind = lower ? 'm6' : '6';
  else if (q === 'sus4' || q === 'sus2') kind = q;
  else kind = lower ? 'min' : 'maj';
  const bassM = m[4] ? /^([A-G])([#♯b♭]?)$/.exec(m[4]) : null;
  const bass = bassM ? pcOf(bassM[1], bassM[2]) : null;
  return { root, kind, bass: bass === root ? null : bass, text: text.trim() };
}

/** Reads a chord typed either as letters (G7, F#m, C/E) or as a Roman numeral in the key (V7, ii, IV). */
export function readChord(text: string, doh: string, mode: 'major' | 'minor'): Chord | null {
  return parseChord(text) ?? parseRoman(text, doh, mode);
}

const ROMAN_SUFFIX: Record<ChordKind, string> = {
  maj: '', min: '', dim: '°', aug: '+', '7': '7', maj7: 'maj7', m7: '7', m7b5: 'ø7', dim7: '°7',
  sus4: 'sus4', sus2: 'sus2', '6': '6', m6: '6',
};
const LOWER_KINDS = new Set<ChordKind>(['min', 'dim', 'm7', 'm7b5', 'dim7', 'm6']);

/** The chord as a Roman numeral in the key, with figures for inversions (I⁶, V⁶₅, I⁶₄). */
export function romanName(c: Chord, doh: string, mode: 'major' | 'minor'): string {
  const rel = (c.root - tonicPc(doh, mode) + 12) % 12;
  const steps = STEPS[mode];
  let degree = steps.indexOf(rel), acc = '';
  if (degree < 0) {
    // Chromatic root: a flattened step (♭VI, ♭VII…) unless only a raised one makes sense.
    const up = steps.indexOf((rel + 1) % 12);
    if (up >= 0) { degree = up; acc = '♭'; } else { degree = steps.indexOf((rel + 11) % 12); acc = '♯'; }
  }
  let numeral = NUMERALS[degree];
  if (LOWER_KINDS.has(c.kind)) numeral = numeral.toLowerCase();
  let figure = '';
  if (c.bass !== null) {
    const tones = CHORD_TONES[c.kind];
    const pos = tones.findIndex(i => (c.root + i) % 12 === c.bass);
    const seventh = tones.length >= 4;
    if (pos === 1) figure = seventh ? '⁶₅' : '⁶';
    else if (pos === 2) figure = seventh ? '⁴₃' : '⁶₄';
    else if (pos === 3) figure = '⁴₂';
  }
  let suffix = ROMAN_SUFFIX[c.kind];
  // In inversions the figures replace the plain 7.
  if (figure && (suffix === '7' || suffix === 'ø7' || suffix === '°7')) suffix = suffix.slice(0, -1);
  return acc + numeral + suffix + figure;
}

/** Root name spelled to suit the key (flats in flat keys). */
export function pcName(pc: number, doh: string): string {
  return (keyToFifths(doh) < 0 ? FLAT_NAMES : SHARP_NAMES)[pc];
}

export function chordName(root: number, kind: ChordKind, bass: number | null, doh: string): string {
  return pcName(root, doh) + SUFFIX[kind] + (bass !== null && bass !== root ? `/${pcName(bass, doh)}` : '');
}

export type ChordStyle = 'letters' | 'roman';

/** How a chord is shown on the sheet: letter names (C, Dm, G7) or numerals in the key (I, ii, V7). */
export function showChord(c: Chord, doh: string, mode: 'major' | 'minor', style: ChordStyle): string {
  return style === 'roman' ? romanName(c, doh, mode) : chordName(c.root, c.kind, c.bass, doh);
}

/** Pretty display of a typed symbol: `#`/`b` become ♯/♭. */
export const displayChord = (t: string) => t.replace(/^([A-G])#/, '$1♯').replace(/^([A-G])b/, '$1♭').replace(/\/([A-G])#/, '/$1♯').replace(/\/([A-G])b/, '/$1♭');

/**
 * Chord text of each bar, split into pulses like the notes: `C : :G7 :` → [['C','','G7','']].
 * Only `:` separates pulses here, because `/` is part of slash chords (`C/E`); a spaced ` /`
 * (medium accent, as in notes) is still accepted.
 */
export function splitChords(chords: string): string[][] {
  if (!chords.trim()) return [];
  return chords.split('|').map(bar => bar.split(/:|\s\//).map(s => s.trim()));
}

/** Writes chord bars back as text, pulses separated by `:`. */
export function joinChords(bars: string[][]): string {
  return bars.map(pulses => pulses.map((c, j) => (j === 0 ? c : `:${c}`)).join(' ').trim()).join(' | ');
}

/** Sets the chord on one pulse (padding bars and pulses as needed) and writes the text back. */
export function setChordAt(chords: string, bar: number, pulse: number, text: string, pulsesInBar: (b: number) => number): string {
  const bars = splitChords(chords);
  while (bars.length <= bar) bars.push(Array.from({ length: pulsesInBar(bars.length) }, () => ''));
  const row = bars[bar];
  while (row.length < pulsesInBar(bar)) row.push('');
  while (row.length <= pulse) row.push('');
  row[pulse] = text.replace(/[|:\s]/g, '');
  while (bars.length && bars[bars.length - 1].every(c => !c)) bars.pop();
  return bars.length ? joinChords(bars) : '';
}

/** Parsed chords per bar and pulse, plus issues for symbols that can't be read. */
export function parseChordText(chords: string, doh: string, mode: 'major' | 'minor'): { grid: (Chord | null)[][]; issues: Issue[] } {
  const issues: Issue[] = [];
  const grid = splitChords(chords).map((pulses, b) => pulses.map(t => {
    if (!t) return null;
    const c = readChord(t, doh, mode);
    if (!c) issues.push({ severity: 'warning', category: 'syntax', bar: b, message: `“${t}” is not a chord symbol (e.g. C, G7, Am, F♯m, B♭maj7, C/E, or I, ii, V7)` });
    return c;
  }));
  return { grid, issues };
}

export type ChordRate = 'bar' | 'half' | 'beat';

/** Diatonic triads of a major key (relative to doh): I ii iii IV V vi vii°. */
const DIATONIC: [number, ChordKind][] = [[0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min'], [11, 'dim']];

/**
 * Works out a chord for each bar (or half bar, or beat) from the notes all parts sing there.
 * Notes are weighted by how long they sound; the lowest note decides inversions; chords that
 * belong to the key are slightly preferred. Returns chord text in the same pulse layout as the notes.
 */
export function detectChords(analysis: Analysis, doh: string, dohPc: number, rate: ChordRate): string {
  const bars: string[][] = [];
  let prev = '';
  for (let b = 0; b < analysis.barCount; b++) {
    const ref = analysis.parts.find(p => p.bars[b]);
    const pulses = ref?.bars[b].pulses.length ?? analysis.times[b]?.num ?? 4;
    const barStart = ref?.barStarts[b] ?? 0;
    const groups = groupPulses(pulses, analysis.times[b]?.num ?? pulses, rate);
    const row = Array.from({ length: pulses }, () => '');
    groups.forEach(([from, to], gi) => {
      const name = chordFor(analysis, barStart + from * TICKS, barStart + to * TICKS, doh, dohPc);
      if (!name) return;
      // Write a chord where it changes, and at the start of every bar so each box reads on its own.
      if (name !== prev || gi === 0) row[from] = name;
      prev = name;
    });
    bars.push(row);
  }
  while (bars.length && bars[bars.length - 1].every(c => !c)) bars.pop();
  return bars.length ? joinChords(bars) : '';
}

function groupPulses(pulses: number, timeNum: number, rate: ChordRate): [number, number][] {
  if (rate === 'beat') return Array.from({ length: pulses }, (_, i) => [i, i + 1] as [number, number]);
  if (rate === 'half' && pulses === timeNum && pulses >= 2) {
    const mid = pulses % 2 === 0 ? pulses / 2 : pulses % 3 === 0 && pulses > 3 ? pulses / 3 : Math.ceil(pulses / 2);
    const out: [number, number][] = [];
    for (let s = 0; s < pulses; s += mid) out.push([s, Math.min(pulses, s + mid)]);
    return out;
  }
  return [[0, pulses]];
}

function chordFor(analysis: Analysis, from: number, to: number, doh: string, dohPc: number): string | null {
  const w = new Array(12).fill(0);
  let bass: number | null = null, bassStart = Infinity;
  for (const p of analysis.parts) {
    for (const e of p.events) {
      if (e.midi === null) continue;
      const s = Math.max(e.start, from), en = Math.min(e.start + e.dur, to);
      if (en <= s) continue;
      w[e.midi % 12] += (en - s) / TICKS;
      // The bass is the lowest note sounding at the start of the span (or the lowest one that starts in it).
      const atStart = e.start <= from ? from : e.start;
      if (bass === null || e.midi < bass || (e.midi === bass && atStart < bassStart)) { bass = e.midi; bassStart = atStart; }
    }
  }
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const bassPc = bass === null ? null : bass % 12;

  let best: { score: number; root: number; kind: ChordKind } | null = null;
  for (let root = 0; root < 12; root++) {
    for (const kind of Object.keys(CHORD_TONES) as ChordKind[]) {
      const tones = CHORD_TONES[kind].map(i => (root + i) % 12);
      let inside = 0;
      for (const pc of tones) inside += w[pc];
      let score = inside - (total - inside) * 1.1;
      // Every chord tone should be heard; a missing seventh/sixth rules the richer chord out.
      for (let i = 0; i < tones.length; i++) {
        if (w[tones[i]] === 0) score -= i === 0 ? 0.35 * total : i >= 3 ? 0.6 * total : 0.12 * total;
      }
      if (tones.length > 3) score -= 0.08 * total;
      // Rarer chords must clearly fit better than a plain triad to be chosen.
      if (kind === 'aug' || kind.startsWith('sus') || kind === '6' || kind === 'm6' || kind === 'dim7') score -= 0.22 * total;
      if (bassPc === root) score += 0.25 * total;
      if (DIATONIC.some(([deg, k]) => (dohPc + deg) % 12 === root && (k === kind || (k === 'maj' && (kind === '7' || kind === 'maj7')) || (k === 'min' && kind === 'm7')))) score += 0.08 * total;
      if (!best || score > best.score) best = { score, root, kind };
    }
  }
  if (!best) return null;
  const inChord = bassPc !== null && CHORD_TONES[best.kind].some(i => (best!.root + i) % 12 === bassPc);
  return chordName(best.root, best.kind, inChord ? bassPc : null, doh);
}

/** MusicXML <kind> value for each chord kind. */
export const XML_KIND: Record<ChordKind, string> = {
  maj: 'major', min: 'minor', dim: 'diminished', aug: 'augmented', '7': 'dominant', maj7: 'major-seventh',
  m7: 'minor-seventh', m7b5: 'half-diminished', dim7: 'diminished-seventh', sus4: 'suspended-fourth',
  sus2: 'suspended-second', '6': 'major-sixth', m6: 'minor-sixth',
};
export const KIND_FROM_XML: Record<string, ChordKind> = Object.fromEntries(Object.entries(XML_KIND).map(([k, v]) => [v, k])) as Record<string, ChordKind>;
