import { barTimes, parseMarks, type Mark } from './marks';
import { assignLyrics, buildEvents, parseNotes } from './parse';
import { mediumAccents, parseKey } from './solfa';
import { type Event, type Issue, type ParsedBar, type PartDoc, type ScoreDoc, type VoiceType } from './types';

export interface AnalyzedPart {
  doc: PartDoc;
  bars: ParsedBar[];
  events: Event[];
  barStarts: number[];
}

export interface Analysis {
  parts: AnalyzedPart[];
  issues: Issue[];
  barCount: number;
  marks: Mark[][];
  /** Time signature in force at each bar. */
  times: { num: number; den: number }[];
}

const VOICE_RANK: Record<VoiceType, number> = { S: 0, A: 1, T: 2, B: 3 };
const VOICE_NAMES: Record<VoiceType, string> = { S: 'Soprano', A: 'Alto', T: 'Tenor', B: 'Bass' };
/** Comfortable choir ranges (MIDI): C4–A5, F3–D5, C3–A4, E2–D4. */
export const RANGES: Record<VoiceType, [number, number]> = { S: [60, 81], A: [53, 74], T: [48, 69], B: [40, 62] };

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const midiName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

const validTime = (n: number, d: number) => n >= 1 && n <= 12 && [2, 4, 8, 16].includes(d);

export function analyzeScore(score: ScoreDoc): Analysis {
  const issues: Issue[] = [];
  if (!parseKey(score.doh)) {
    issues.push({ severity: 'error', category: 'structure', message: `Key “${score.doh}” is not a note name (e.g. C, F, Bb, F#)` });
  }
  const marks = parseMarks(score.marks);
  const parsed = score.parts.map(doc => ({ doc, ...parseNotes(doc.notes) }));
  const barCount = Math.max(0, ...parsed.map(p => p.bars.length));
  const times = barTimes(marks, barCount, score.timeNum, score.timeDen);
  if (!validTime(score.timeNum, score.timeDen)) {
    issues.push({ severity: 'error', category: 'structure', message: `Time signature ${score.timeNum}/${score.timeDen} is not supported` });
  }
  marks.forEach((list, b) => list.forEach(m => {
    if (m.kind === 'time' && !validTime(m.num, m.den)) {
      issues.push({ severity: 'error', category: 'structure', bar: b, message: `Time signature ${m.text} is not supported` });
    }
  }));

  const parts: AnalyzedPart[] = parsed.map(({ doc, bars, issues: pIssues }) => {
    pIssues.forEach(i => issues.push({ ...i, partId: doc.id }));

    bars.forEach((bar, b) => {
      const { num, den } = times[b];
      const accents = mediumAccents(num);
      const n = bar.pulses.length;
      const pickupOk = score.pickup && b === 0 && n < num;
      if (n !== num && !pickupOk) {
        issues.push({
          severity: 'error', category: 'rhythm', partId: doc.id, bar: b,
          message: `${n} pulse${n === 1 ? '' : 's'} in this bar; ${num}/${den} needs ${num}`,
        });
      }
      bar.pulses.forEach((p, i) => {
        if (p.sep === '/' && !accents.includes(i) && n === num) {
          issues.push({
            severity: 'warning', category: 'rhythm', partId: doc.id, bar: b,
            message: accents.length
              ? `“/” (medium accent) belongs after pulse ${accents.join(' and ')} in ${num}/${den}`
              : `${num}/${den} has no medium accent; use “:”`,
          });
        }
      });
    });

    const built = buildEvents(bars, score.doh, doc.voice);
    built.issues.forEach(i => issues.push({ ...i, partId: doc.id }));
    assignLyrics(built.events, doc.lyrics, bars.length).forEach(i => issues.push({ ...i, partId: doc.id }));
    return { doc, bars, events: built.events, barStarts: built.barStarts };
  });

  for (const p of parts) {
    if (p.bars.length && p.bars.length !== barCount) {
      issues.push({ severity: 'error', category: 'structure', partId: p.doc.id, message: `${p.doc.name} has ${p.bars.length} bars; the longest part has ${barCount}` });
    }
  }

  checkRanges(parts, issues);
  checkVoicing(parts, issues);

  return { parts, issues, barCount, marks, times };
}

function checkRanges(parts: AnalyzedPart[], issues: Issue[]) {
  for (const p of parts) {
    const [lo, hi] = RANGES[p.doc.voice];
    const seen = new Set<number>();
    for (const e of p.events) {
      if (e.midi === null || seen.has(e.bar)) continue;
      if (e.midi < lo || e.midi > hi) {
        seen.add(e.bar);
        issues.push({
          severity: 'warning', category: 'range', partId: p.doc.id, bar: e.bar,
          message: `${midiName(e.midi)} is ${e.midi < lo ? 'below' : 'above'} the usual ${VOICE_NAMES[p.doc.voice].toLowerCase()} range (${midiName(lo)}–${midiName(hi)}); check the octave mark`,
        });
      }
    }
  }
}

/** Pitch sounding in a part at time t (null for rest or silence). */
function pitchAt(events: Event[], t: number): number | null {
  for (const e of events) {
    if (e.start <= t && t < e.start + e.dur) return e.midi;
    if (e.start > t) break;
  }
  return null;
}

function checkVoicing(parts: AnalyzedPart[], issues: Issue[]) {
  const voiced = parts.filter(p => p.events.length).sort((a, b) => VOICE_RANK[a.doc.voice] - VOICE_RANK[b.doc.voice]);
  if (voiced.length < 2) return;
  const times = [...new Set(voiced.flatMap(p => p.events.filter(e => e.midi !== null).map(e => e.start)))].sort((a, b) => a - b);
  const barOf = (t: number) => {
    const starts = voiced[0].barStarts;
    let b = 0;
    while (b + 1 < starts.length && starts[b + 1] <= t) b++;
    return b;
  };
  const samples = times.map(t => voiced.map(p => pitchAt(p.events, t)));
  const reported = new Set<string>();
  const once = (key: string, issue: Issue) => { if (!reported.has(key)) { reported.add(key); issues.push(issue); } };

  samples.forEach((row, k) => {
    const bar = barOf(times[k]);
    for (let i = 0; i + 1 < voiced.length; i++) {
      const up = row[i], low = row[i + 1];
      if (up === null || low === null) continue;
      const a = voiced[i].doc, b = voiced[i + 1].doc;
      if (VOICE_RANK[a.voice] === VOICE_RANK[b.voice]) continue;
      if (low > up) {
        once(`x${bar}${i}`, { severity: 'warning', category: 'voicing', bar, partId: b.id, message: `${b.name} crosses above ${a.name}` });
      } else if (up - low > 12 && b.voice !== 'B') {
        once(`s${bar}${i}`, { severity: 'warning', category: 'voicing', bar, partId: b.id, message: `more than an octave between ${a.name} and ${b.name}` });
      }
    }
  });

  for (let k = 1; k < samples.length; k++) {
    const prev = samples[k - 1], cur = samples[k];
    const bar = barOf(times[k]);
    for (let i = 0; i < voiced.length; i++) {
      for (let j = i + 1; j < voiced.length; j++) {
        const [p1, q1, p2, q2] = [prev[i], prev[j], cur[i], cur[j]];
        if (p1 === null || q1 === null || p2 === null || q2 === null) continue;
        if (p1 === p2 || q1 === q2) continue; // both voices must move
        const i1 = Math.abs(p1 - q1) % 12, i2 = Math.abs(p2 - q2) % 12;
        if (i1 === i2 && (i1 === 7 || i1 === 0)) {
          const kind = i1 === 7 ? 'fifths' : 'octaves/unisons';
          once(`p${bar}${i}${j}`, {
            severity: 'warning', category: 'parallels', bar, partId: voiced[j].doc.id,
            message: `consecutive ${kind} between ${voiced[i].doc.name} and ${voiced[j].doc.name}`,
          });
        }
      }
    }
  }
}

