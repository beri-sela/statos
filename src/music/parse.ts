import { SYLLABLES, noteMidi } from './solfa';
import {
  ARTIC_PREFIX, TICKS, type Articulation, type Event, type Issue, type Item, type NoteItem, type ParsedBar, type PlacedItem,
  type Pulse, type Syllable, type VoiceType,
} from './types';

/** Accepts the printed forms of octave marks and dashes so pasted text still parses. */
export function normalize(text: string): string {
  return text
    .replace(/¹/g, "'").replace(/²/g, "''").replace(/[’‘`]/g, "'")
    .replace(/₁/g, '1').replace(/₂/g, '2')
    .replace(/[–—−]/g, '-')
    .replace(/｜/g, '|');
}

const NOTE_RE = /^([>^!~*]*)(\(?)([>^!~*]*)(de|ra|re|ma|fe|ba|se|lo|le|ta|d|r|m|f|s|l|t)('{1,3}|[1-3])?(\)?)$/;

function parseItem(tok: string): Item | { error: string } {
  if (tok === '') return { kind: 'rest' };
  if (tok === '-') return { kind: 'hold' };
  const m = NOTE_RE.exec(tok);
  if (!m) {
    if (/[A-Z]/.test(tok) && NOTE_RE.test(tok.toLowerCase())) {
      return { error: `“${tok}”: sol-fa syllables are written in lower case (“${tok.toLowerCase()}”)` };
    }
    if (/^[drmfslt]{2,}$/.test(tok)) {
      return { error: `“${tok}”: several notes in one pulse need a division mark, e.g. “${tok.split('').join('.')}”` };
    }
    return { error: `“${tok}” is not a sol-fa note (use d r m f s l t, chromatics de ra re ma fe ba se lo le ta, '-' to hold)` };
  }
  const oct = m[5] ? (m[5].startsWith("'") ? m[5].length : -Number(m[5])) : 0;
  const artic = [...new Set((m[1] + m[3]).split('').map(c => ARTIC_PREFIX[c]))] as Articulation[];
  return {
    kind: 'note', syl: m[4], semis: SYLLABLES[m[4]].semis, octave: oct,
    artic, slurStart: m[2] === '(', slurEnd: m[6] === ')',
  } satisfies NoteItem;
}

/** Parses one pulse such as `d`, `-.m`, `d.,r`, `d,r.m,f` or the triplet `d;r;m` into timed items. */
function parsePulse(raw: string, report: (msg: string) => void): PlacedItem[] {
  const text = raw.replace(/\s+/g, '');
  if (text.includes(';')) {
    const thirds = text.split(';');
    if (thirds.length !== 3 || /[.,]/.test(text)) {
      report(`triplet “${raw.trim()}” must have exactly three parts, e.g. “d;r;m” (use “-” or leave a part empty)`);
    }
    return thirds.slice(0, 3).map((tok, i) => {
      const it = parseItem(tok);
      if ('error' in it) report(it.error);
      return { item: 'error' in it ? { kind: 'rest' } : it, start: i * 4, dur: 4, sep: i ? ';' : '' } as PlacedItem;
    });
  }
  const parts = text.split(/(\.,|\.|,)/);
  const items: PlacedItem[] = [];
  let pos = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const sep = (i === 0 ? '' : parts[i - 1]) as PlacedItem['sep'];
    if (i > 0) {
      const next = sep === '.' ? TICKS / 2 : sep === '.,' ? (TICKS * 3) / 4 : pos < TICKS / 2 ? TICKS / 4 : (TICKS * 3) / 4;
      if (next <= pos) {
        report(`pulse “${raw.trim()}” is divided more finely than quarters, or its division marks are out of order`);
        break;
      }
      pos = next;
    }
    const it = parseItem(parts[i]);
    if ('error' in it) {
      report(it.error);
      items.push({ item: { kind: 'rest' }, start: pos, dur: 0, sep });
    } else {
      items.push({ item: it, start: pos, dur: 0, sep });
    }
  }
  items.forEach((p, i) => { p.dur = (i + 1 < items.length ? items[i + 1].start : TICKS) - p.start; });
  return items;
}

/** Splits a part's text into bars and pulses. Issues carry 0-based bar indexes. */
export function parseNotes(notesText: string): { bars: ParsedBar[]; issues: Issue[] } {
  const text = normalize(notesText);
  const issues: Issue[] = [];
  const bars: ParsedBar[] = [];
  let offset = 0;
  const segments = text.split('|');
  segments.forEach((seg, idx) => {
    const segOffset = offset;
    offset += seg.length + 1;
    const isEdge = idx === 0 || idx === segments.length - 1;
    if (isEdge && seg.trim() === '') return; // leading/trailing bar line
    const barIndex = bars.length;
    const report = (message: string) => issues.push({ severity: 'error', category: 'syntax', message, bar: barIndex });
    const pieces = seg.split(/([:/])/);
    const pulses: Pulse[] = [];
    for (let i = 0; i < pieces.length; i += 2) {
      const sep = (i === 0 ? '' : pieces[i - 1]) as Pulse['sep'];
      pulses.push({ sep, raw: pieces[i], items: parsePulse(pieces[i], report) });
    }
    bars.push({ pulses, offset: segOffset, raw: seg });
  });
  return { bars, issues };
}

/** Turns parsed bars into sounding events, merging `-` holds into the note before them. */
export function buildEvents(
  bars: ParsedBar[], doh: string, voice: VoiceType,
): { events: Event[]; barStarts: number[]; issues: Issue[] } {
  const events: Event[] = [];
  const issues: Issue[] = [];
  const barStarts: number[] = [];
  let t = 0;
  bars.forEach((bar, b) => {
    barStarts.push(t);
    bar.pulses.forEach((pulse, p) => {
      for (const pi of pulse.items) {
        const start = t + p * TICKS + pi.start;
        const last = events[events.length - 1];
        if (pi.item.kind === 'hold') {
          if (!last) {
            issues.push({ severity: 'error', category: 'rhythm', message: '“-” at the very start has no note to hold', bar: b });
            events.push({ start, dur: pi.dur, bar: b, midi: null, note: null });
          } else {
            if (last.midi === null) {
              issues.push({ severity: 'error', category: 'rhythm', message: '“-” after a rest: there is no note to hold (leave the pulse empty for a rest)', bar: b });
            }
            last.dur += pi.dur;
          }
        } else if (pi.item.kind === 'rest') {
          if (last && last.midi === null) last.dur += pi.dur;
          else events.push({ start, dur: pi.dur, bar: b, midi: null, note: null });
        } else {
          const n = pi.item;
          events.push({ start, dur: pi.dur, bar: b, midi: noteMidi(doh, voice, n.semis, n.octave), note: n });
        }
      }
    });
    t += bar.pulses.length * TICKS;
  });
  return { events, barStarts, issues };
}

/** Splits lyric text into syllables. `_` (or a lone dash) marks a note that takes no new syllable. */
export function parseLyricStream(text: string): (Syllable | null)[] {
  const out: (Syllable | null)[] = [];
  for (const word of normalize(text).split(/\s+/).filter(Boolean)) {
    if (/^[_-]+$/.test(word)) { out.push(...word.replace(/-/g, '_').split('').map(() => null)); continue; }
    // "A-" at the end of a bar means the word continues in the next bar.
    const trailing = word.endsWith('-');
    const clean = word.split('-').filter(s => s !== '');
    clean.forEach((s, i) => {
      const first = i === 0, lastSyl = i === clean.length - 1;
      const hyphen = !lastSyl || trailing;
      const leading = word.startsWith('-');
      const syllabic: Syllable['syllabic'] =
        (first && !leading) ? (hyphen ? 'begin' : 'single') : (hyphen ? 'middle' : 'end');
      out.push({ text: s.replace(/_/g, ' '), hyphen, syllabic });
    });
  }
  return out;
}

/** Attaches syllables to note onsets. With `|` in the lyrics, each bar is matched separately. */
export function assignLyrics(events: Event[], lyrics: string, barCount: number): Issue[] {
  const issues: Issue[] = [];
  if (!lyrics.trim()) return issues;
  const notes = events.filter(e => e.midi !== null);
  if (lyrics.includes('|')) {
    const segs = lyrics.split('|');
    if (segs[0].trim() === '' && segs.length > barCount) segs.shift();
    for (let b = 0; b < barCount; b++) {
      const seg = segs[b] ?? '';
      if (!seg.trim()) continue;
      const syls = parseLyricStream(seg);
      const barNotes = notes.filter(n => n.bar === b);
      syls.forEach((s, i) => { if (barNotes[i] && s) barNotes[i].lyric = s; });
      if (syls.length > barNotes.length) {
        issues.push({ severity: 'warning', category: 'lyrics', bar: b, message: `${syls.length} syllables but only ${barNotes.length} notes in this bar` });
      } else if (syls.length < barNotes.length) {
        issues.push({ severity: 'warning', category: 'lyrics', bar: b, message: `${barNotes.length} notes but only ${syls.length} syllables (use “_” for a note that continues the previous syllable)` });
      }
    }
    if (segs.filter(s => s.trim()).length && segs.length > barCount + 1) {
      issues.push({ severity: 'warning', category: 'lyrics', message: `lyrics have ${segs.length} bars but the notes have ${barCount}` });
    }
  } else {
    const syls = parseLyricStream(lyrics);
    syls.forEach((s, i) => { if (notes[i] && s) notes[i].lyric = s; });
    if (syls.length > notes.length) {
      issues.push({ severity: 'warning', category: 'lyrics', message: `${syls.length - notes.length} more syllables than notes` });
    }
  }
  return issues;
}
