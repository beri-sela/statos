import { barTimes, parseMarks } from './marks';
import { normalize } from './parse';
import { mediumAccents } from './solfa';

/**
 * Re-writes a part's notes with correct colons, medium accents and bar lines for the
 * time signature(s). Pulses may be typed separated by spaces (`d r m f s`) or colons;
 * existing bar lines are ignored and bars are regrouped from the pulse count.
 */
export function tidyNotes(text: string, timeNum: number, timeDen: number, marks: string, pickup: boolean): string {
  const segs = normalize(text).split('|');
  const pulses: string[] = [];
  let firstBar = 0;
  segs.forEach((seg, i) => {
    if (!seg.trim()) {
      // An empty segment between bar lines is a bar of rests only if colons say so; otherwise skip it.
      return;
    }
    // Colons and spaces both separate pulses; `_` (or an empty colon slot) is a rest.
    const list = (/[:/]/.test(seg) ? seg.split(/[:/]/) : [seg.trim()])
      .flatMap(piece => (piece.trim() === '' ? [''] : piece.trim().split(/\s+/)))
      .map(p => (p === '_' ? '' : p));
    if (i === 0 || pulses.length === 0) firstBar = list.length;
    pulses.push(...list);
  });
  if (!pulses.length) return text;

  const marksParsed = parseMarks(marks);
  const times = barTimes(marksParsed, Math.max(pulses.length, marksParsed.length) + 1, timeNum, timeDen);
  const bars: string[] = [];
  let i = 0, b = 0;
  while (i < pulses.length) {
    const size = b === 0 && pickup && firstBar < times[0].num ? firstBar : times[b].num;
    const chunk = pulses.slice(i, i + size);
    const accents = mediumAccents(times[b].num);
    bars.push(chunk.map((p, j) => (j === 0 ? p : `${accents.includes(j) ? '/' : ':'}${p}`)).join(' ').trim());
    i += size;
    b++;
  }
  return bars.join(' | ');
}

/** Number of pulses typed so far (for showing progress through a bar). */
export function countPulses(text: string): number {
  return normalize(text).split('|').filter(s => s.trim())
    .reduce((n, seg) => n + (/[:/]/.test(seg) ? seg.split(/[:/]/) : [seg.trim()])
      .flatMap(piece => (piece.trim() === '' ? [''] : piece.trim().split(/\s+/))).length, 0);
}
