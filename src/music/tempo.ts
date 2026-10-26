import type { Analysis } from './analyze';
import { TICKS } from './types';

/** How strongly each slowing / quickening word changes the speed, reached over two bars. */
const CHANGE: Record<string, number> = {
  'rit.': 0.75, 'rall.': 0.75, 'allarg.': 0.7, 'poco rit.': 0.85, 'molto rit.': 0.6, 'accel.': 1.25,
};
const FERMATA_STRETCH = 1.8;

export interface TempoMap {
  /** Start tick of every bar, plus the end of the piece. */
  barStarts: number[];
  /** Seconds that tick t lasts. */
  secondsPerTick: (t: number) => number;
  /** Speed (pulses per minute) in force at tick t, for display. */
  pulsesPerMinute: (t: number) => number;
}

/**
 * Builds the speed of every moment of the piece from the base speed, `♩ = N` marks,
 * rit./rall./accel. (gradual over two bars), `a tempo` / `Tempo I`, and fermatas.
 */
export function buildTempoMap(analysis: Analysis, baseBpm: number): TempoMap {
  const barStarts: number[] = [0];
  for (let b = 0; b < analysis.barCount; b++) {
    const pulses = Math.max(1, ...analysis.parts.map(p => p.bars[b]?.pulses.length ?? 0));
    barStarts.push(barStarts[b] + pulses * TICKS);
  }

  const bpm: number[] = [], f0: number[] = [], f1: number[] = [];
  let cur = baseBpm, explicit = baseBpm;
  let factor = 1, target = 1, from = 1, rampBar = -1;
  for (let b = 0; b < analysis.barCount; b++) {
    for (const m of analysis.marks[b] ?? []) {
      if (m.kind === 'metronome') { cur = explicit = m.bpm; factor = target = 1; rampBar = -1; }
      if (m.kind === 'tempo') {
        if (m.text === 'a tempo') { cur = explicit; factor = target = 1; rampBar = -1; }
        else if (m.text === 'Tempo I') { cur = explicit = baseBpm; factor = target = 1; rampBar = -1; }
        else if (CHANGE[m.text]) { from = factor; target = CHANGE[m.text]; rampBar = b; }
      }
    }
    const start = factor;
    if (rampBar >= 0 && b - rampBar < 2) {
      factor = from + (target - from) * ((b - rampBar + 1) / 2);
    } else if (rampBar >= 0) {
      factor = target;
    }
    bpm.push(cur); f0.push(start); f1.push(factor);
  }

  // Fermata: the note (and everything sounding with it) is held longer.
  const stretched: [number, number][] = [];
  for (const p of analysis.parts) {
    for (const e of p.events) if (e.note?.artic.includes('fermata')) stretched.push([e.start, e.start + e.dur]);
  }

  const barOf = (t: number) => {
    let lo = 0, hi = analysis.barCount - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (barStarts[mid] <= t) lo = mid; else hi = mid - 1;
    }
    return Math.max(0, lo);
  };
  const pulsesPerMinute = (t: number) => {
    if (!analysis.barCount) return baseBpm;
    const b = barOf(t);
    const len = barStarts[b + 1] - barStarts[b] || 1;
    const frac = Math.min(1, Math.max(0, (t - barStarts[b]) / len));
    return bpm[b] * (f0[b] + (f1[b] - f0[b]) * frac);
  };
  const secondsPerTick = (t: number) => {
    const hold = stretched.some(([s, e]) => s <= t && t < e) ? FERMATA_STRETCH : 1;
    return (60 / Math.max(10, pulsesPerMinute(t)) / TICKS) * hold;
  };
  return { barStarts, secondsPerTick, pulsesPerMinute };
}
