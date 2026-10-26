/** Bar marks: dynamics, jumps, time changes, rehearsal marks, repeats, labels and free text. */

export type Mark =
  | { kind: 'dynamic'; text: string }
  | { kind: 'time'; num: number; den: number; text: string }
  | { kind: 'rehearsal'; text: string }
  | { kind: 'jump'; text: string }
  | { kind: 'repeatStart'; text: string }
  | { kind: 'repeatEnd'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'tempo'; text: string }
  | { kind: 'metronome'; bpm: number; text: string }
  | { kind: 'text'; text: string };

export const DYNAMIC_MARKS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp', 'rf', 'cresc.', 'dim.', 'decresc.'];
export const JUMP_MARKS = ['segno', 'coda', 'Fine', 'D.C.', 'D.S.', 'D.C. al Fine', 'D.S. al Fine', 'D.C. al Coda', 'D.S. al Coda', 'To Coda'];
export const TEMPO_MARKS = ['rit.', 'rall.', 'accel.', 'a tempo', 'allarg.', 'poco rit.', 'Tempo I', 'molto rit.'];

const DYN = new Set(DYNAMIC_MARKS);
const TEMPO = new Set(TEMPO_MARKS);

/** Splits on commas that are not inside double quotes. */
function splitTokens(seg: string): string[] {
  const out: string[] = [];
  let cur = '', quoted = false;
  for (const ch of seg) {
    if (ch === '"') quoted = !quoted;
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

export function classify(token: string): Mark {
  const t = token.trim();
  const time = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(t);
  if (time) return { kind: 'time', num: Number(time[1]), den: Number(time[2]), text: `${time[1]}/${time[2]}` };
  if (DYN.has(t)) return { kind: 'dynamic', text: t };
  const metro = /^(?:♩|q|tempo)?\s*=\s*(\d{2,3})$/i.exec(t);
  if (metro) return { kind: 'metronome', bpm: Number(metro[1]), text: `♩ = ${metro[1]}` };
  // `|` separates bars in the marks text, so repeats use words or the repeat symbols.
  if (/^(repeat[- ]start|𝄆)$/i.test(t)) return { kind: 'repeatStart', text: t };
  if (/^(repeat[- ]end|𝄇)$/i.test(t)) return { kind: 'repeatEnd', text: t };
  if (/^#\S/.test(t)) return { kind: 'rehearsal', text: t.slice(1) };
  if (/^\[.*\]$/.test(t)) return { kind: 'label', text: t.slice(1, -1) };
  if (/^".*"$/.test(t)) return { kind: 'text', text: t.slice(1, -1) };
  if (TEMPO.has(t)) return { kind: 'tempo', text: t };
  if (/^(segno|coda|fine|to coda)$/i.test(t) || /^(D\.?C\.?|D\.?S\.?)(\b|\s|\d|$)/.test(t) || /^[𝄋𝄌]/u.test(t)) {
    return { kind: 'jump', text: t };
  }
  return { kind: 'text', text: t };
}

export function parseMarks(marks: string): Mark[][] {
  return marks.split('|').map(splitTokens).map(list => list.map(classify));
}

/** Display text for a jump mark: `segno`/`coda` become their symbols. */
export function jumpSymbol(text: string): string {
  if (/^segno$/i.test(text)) return '𝄋';
  if (/^coda$/i.test(text)) return '𝄌';
  return text;
}

/** Time signature in force at each bar. */
export function barTimes(marks: Mark[][], barCount: number, num: number, den: number): { num: number; den: number }[] {
  const out: { num: number; den: number }[] = [];
  let cur = { num, den };
  for (let b = 0; b < barCount; b++) {
    const t = marks[b]?.find(m => m.kind === 'time');
    if (t && t.kind === 'time') cur = { num: t.num, den: t.den };
    out.push(cur);
  }
  return out;
}

/** Adds a mark to bar `bar` of a marks string (padding with empty bars as needed). */
export function addMark(marks: string, bar: number, token: string): string {
  const segs = marks.split('|');
  while (segs.length <= bar) segs.push('');
  const list = splitTokens(segs[bar]);
  if (classify(token).kind === 'time') {
    // Only one time signature per bar.
    for (let i = list.length - 1; i >= 0; i--) if (classify(list[i]).kind === 'time') list.splice(i, 1);
  }
  list.push(token);
  segs[bar] = ` ${list.join(', ')} `;
  return tidyMarks(segs);
}

export function removeMark(marks: string, bar: number, index: number): string {
  const segs = marks.split('|');
  if (bar >= segs.length) return marks;
  const list = splitTokens(segs[bar]);
  list.splice(index, 1);
  segs[bar] = list.length ? ` ${list.join(', ')} ` : ' ';
  return tidyMarks(segs);
}

function tidyMarks(segs: string[]): string {
  while (segs.length && !segs[segs.length - 1].trim()) segs.pop();
  return segs.map(s => s.trim()).join(' | ');
}

export function marksForBar(marks: string, bar: number): string[] {
  return splitTokens(marks.split('|')[bar] ?? '');
}
