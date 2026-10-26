/** Helpers for editing one pulse or one bar of lyrics directly on the sheet. */
import type { AnalyzedPart } from './analyze';
import { parseNotes } from './parse';
import { mediumAccents } from './solfa';

/** Pulse contents of each bar, e.g. `[['d', 'r', ''], ['m', '-', '-']]`. */
export function splitPulses(notes: string): string[][] {
  return parseNotes(notes).bars.map(b => b.pulses.map(p => p.raw.trim()));
}

/** Writes bars back in the standard form `d :r :m | f :- :-`, with `/` at medium accents. */
export function joinPulses(bars: string[][]): string {
  return bars.map(pulses => {
    const accents = mediumAccents(pulses.length);
    return pulses.map((p, j) => (j === 0 ? p : `${accents.includes(j) ? '/' : ':'}${p}`)).join(' ').trim();
  }).join(' | ');
}

/**
 * Replaces one pulse of a part. Bars and pulses are added as needed (sized by `pulsesInBar`),
 * so typing past the end of a part extends it.
 */
export function setPulse(notes: string, bar: number, pulse: number, content: string, pulsesInBar: (b: number) => number): string {
  const bars = notes.trim() ? splitPulses(notes) : [];
  while (bars.length <= bar) bars.push(Array.from({ length: pulsesInBar(bars.length) }, () => ''));
  const row = bars[bar];
  while (row.length <= pulse) row.push('');
  row[pulse] = content.replace(/[|:/\s]/g, '');
  // Drop empty bars left at the very end.
  while (bars.length > 1 && bars[bars.length - 1].every(p => p === '') && bars.length - 1 > bar) bars.pop();
  return joinPulses(bars);
}

/** The lyrics of each bar as typed (`Al-le-lu-ia`), rebuilt from the notes they are attached to. */
export function lyricsByBar(part: AnalyzedPart, barCount: number): string[] {
  const out: string[] = [];
  for (let b = 0; b < barCount; b++) {
    const notes = part.events.filter(e => e.bar === b && e.midi !== null);
    if (!notes.some(n => n.lyric)) { out.push(''); continue; }
    const toks = notes.map(n => (n.lyric ? n.lyric.text.replace(/\s+/g, '_') + (n.lyric.hyphen ? '-' : '') : '_'));
    while (toks.length && toks[toks.length - 1] === '_') toks.pop();
    out.push(toks.join(' ').replace(/- (?!_)/g, '-'));
  }
  return out;
}

/** Replaces the lyrics of one bar, converting the part's lyrics to bar-by-bar form. */
export function setLyricBar(part: AnalyzedPart, barCount: number, bar: number, text: string): string {
  const segs = lyricsByBar(part, Math.max(barCount, bar + 1));
  segs[bar] = text.replace(/\|/g, ' ').trim();
  while (segs.length && !segs[segs.length - 1]) segs.pop();
  return segs.length ? segs.map(s => s || '').join(' | ') : '';
}
