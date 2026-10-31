import type { Analysis } from './analyze';
import { KIND_FROM_XML, XML_KIND, chordName, joinChords, pcName, type Chord, type ChordKind } from './chords';
import { jumpSymbol, type Mark } from './marks';
import { fifthsToKey, keyToFifths, mediumAccents, octaveSuffix, spell, toSolfa } from './solfa';
import { ARTIC_PREFIX, TICKS, type Articulation, type Event, type PartDoc, type ScoreDoc, type VoiceType } from './types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Plain text of a mark that may contain **bold** / *italic* markup. */
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

/** Note values in quarter notes that can be written as one note, largest first. */
const VALUES: [number, string, number][] = [
  [4, 'whole', 0], [3, 'half', 1], [2, 'half', 0], [1.5, 'quarter', 1], [1, 'quarter', 0],
  [0.75, 'eighth', 1], [0.5, 'eighth', 0], [0.375, '16th', 1], [0.25, '16th', 0], [0.125, '32nd', 0],
];

interface Piece { ticks: number; type: string; dots: number; triplet: boolean }

/** Splits a duration (in ticks) into writable note values; thirds of a pulse become triplet notes. */
function splitDuration(ticks: number, tpq: number): Piece[] {
  const out: Piece[] = [];
  let left = ticks;
  while (left > 0) {
    let piece: Piece | null = null;
    if (left % 3 === 0) {
      const v = VALUES.find(([q]) => q * tpq <= left && Number.isInteger(q * tpq));
      if (v) piece = { ticks: v[0] * tpq, type: v[1], dots: v[2], triplet: false };
    } else {
      const v = VALUES.find(([q]) => {
        const t = (q * tpq * 2) / 3;
        return v0(q) && Number.isInteger(t) && t <= left && (left - t) % 3 === 0;
      });
      if (v) piece = { ticks: (v[0] * tpq * 2) / 3, type: v[1], dots: 0, triplet: true };
    }
    if (!piece) { out.push({ ticks: left, type: '32nd', dots: 0, triplet: false }); break; }
    out.push(piece);
    left -= piece.ticks;
  }
  return out;
}
/** Dotted values are not used inside triplets. */
const v0 = (q: number) => [4, 2, 1, 0.5, 0.25, 0.125].includes(q);

function clefXml(voice: VoiceType) {
  if (voice === 'B') return '<clef><sign>F</sign><line>4</line></clef>';
  if (voice === 'T') return '<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>';
  return '<clef><sign>G</sign><line>2</line></clef>';
}

const XML_ARTIC: Record<Articulation, string> = {
  accent: '<accent/>', marcato: '<strong-accent/>', staccato: '<staccato/>', tenuto: '<tenuto/>', fermata: '',
};

function directionXml(m: Mark): string {
  const wrap = (inner: string, place = 'above') => `<direction placement="${place}"><direction-type>${inner}</direction-type></direction>`;
  switch (m.kind) {
    case 'dynamic':
      return /^[a-z]+$/.test(m.text)
        ? wrap(`<dynamics><${m.text}/></dynamics>`, 'below')
        : wrap(`<words font-style="italic">${esc(m.text)}</words>`, 'below');
    case 'rehearsal': return wrap(`<rehearsal enclosure="square">${esc(m.text)}</rehearsal>`);
    case 'jump': {
      const sym = jumpSymbol(m.text);
      if (sym === '𝄋') return wrap('<segno/>');
      if (sym === '𝄌') return wrap('<coda/>');
      return wrap(`<words font-weight="bold">${esc(m.text)}</words>`);
    }
    case 'tempo': return wrap(`<words font-style="italic">${esc(m.text)}</words>`);
    case 'label': case 'text': return wrap(`<words>${esc(plain(m.text))}</words>`);
    default: return '';
  }
}

/** Builds an uncompressed MusicXML 3.1 score-partwise document (one staff per part). */
export function toMusicXML(score: ScoreDoc, analysis: Analysis): string {
  const maxDen = Math.max(score.timeDen, ...analysis.times.map(t => t.den));
  const divisions = (TICKS * maxDen) / 4;
  const fifths = keyToFifths(score.doh);

  const partList = analysis.parts.map((p, i) =>
    `<score-part id="P${i + 1}"><part-name>${esc(p.doc.name)}</part-name></score-part>`).join('');

  const partsXml = analysis.parts.map((p, pi) => {
    const measures: string[] = [];
    for (let b = 0; b < analysis.barCount; b++) {
      const time = analysis.times[b];
      const factor = maxDen / time.den;
      const tpq = (TICKS * time.den) / 4;
      const start = p.barStarts[b] ?? 0;
      const len = (p.bars[b]?.pulses.length ?? time.num) * TICKS;
      const end = start + len;
      const marks = analysis.marks[b] ?? [];
      let body = '';
      if (marks.some(m => m.kind === 'repeatStart')) {
        body += '<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>';
      }
      const prev = analysis.times[b - 1];
      const timeChanged = b === 0 || prev.num !== time.num || prev.den !== time.den;
      if (b === 0 || timeChanged) {
        body += '<attributes>';
        if (b === 0) body += `<divisions>${divisions}</divisions><key><fifths>${fifths}</fifths><mode>${score.mode}</mode></key>`;
        body += `<time><beats>${time.num}</beats><beat-type>${time.den}</beat-type></time>`;
        if (b === 0) body += clefXml(p.doc.voice);
        body += '</attributes>';
      }
      if (pi === 0) {
        if (b === 0 && score.tempoText) {
          body += `<direction placement="above"><direction-type><words font-weight="bold">${esc(plain(score.tempoText))}</words></direction-type>`
            + `<sound tempo="${Math.round(score.bpm * (4 / score.timeDen))}"/></direction>`;
        }
        for (const m of marks) body += directionXml(m);
      }
      const inBar = p.events.filter(e => e.start < end && e.start + e.dur > start);
      // Chord symbols go on the first part, just before the note (or rest) they fall on.
      const chords = pi === 0
        ? (analysis.chords[b] ?? []).map((c, i) => ({ c, at: i * TICKS })).filter((x): x is { c: Chord; at: number } => !!x.c)
        : [];
      const chordsIn = (from: number, to: number) => chords.filter(x => x.at >= from && x.at < to)
        .map(x => harmonyXml(x.c, score.doh, (x.at - from) * factor)).join('');
      if (!inBar.length || inBar.every(e => e.midi === null)) {
        body += chordsIn(0, len);
        body += `<note><rest measure="yes"/><duration>${len * factor}</duration></note>`;
      } else {
        for (const e of inBar) {
          const from = Math.max(e.start, start) - start, to = Math.min(e.start + e.dur, end) - start;
          body += chordsIn(from, to) + eventXml(e, start, end, tpq, factor, score.doh);
        }
      }
      if (marks.some(m => m.kind === 'repeatEnd')) {
        body += '<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>';
      } else if (b === analysis.barCount - 1) {
        body += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
      }
      const implicit = b === 0 && score.pickup && len < time.num * TICKS ? ' implicit="yes"' : '';
      measures.push(`<measure number="${b + 1}"${implicit}>${body}</measure>`);
    }
    return `<part id="P${pi + 1}">${measures.join('')}</part>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><work><work-title>${esc(plain(score.title))}</work-title></work>`
    + `<identification><creator type="composer">${esc(plain(score.composer))}</creator></identification>`
    + `<part-list>${partList}</part-list>${partsXml}</score-partwise>`;
}

/** A MusicXML <harmony> (chord symbol), optionally offset from the following note. */
function harmonyXml(c: Chord, doh: string, offset: number): string {
  const part = (pc: number, tag: string) => {
    const name = pcName(pc, doh);
    const alter = name.includes('♯') ? 1 : name.includes('♭') ? -1 : 0;
    return `<${tag}-step>${name[0]}</${tag}-step>${alter ? `<${tag}-alter>${alter}</${tag}-alter>` : ''}`;
  };
  const text = chordName(c.root, c.kind, null, doh).slice(pcName(c.root, doh).length);
  return `<harmony><root>${part(c.root, 'root')}</root><kind text="${esc(text)}">${XML_KIND[c.kind]}</kind>`
    + (c.bass !== null ? `<bass>${part(c.bass, 'bass')}</bass>` : '')
    + (offset ? `<offset>${offset}</offset>` : '') + '</harmony>';
}

function eventXml(e: Event, barStart: number, barEnd: number, tpq: number, factor: number, doh: string): string {
  const s = Math.max(e.start, barStart);
  const end = Math.min(e.start + e.dur, barEnd);
  const pieces = splitDuration(end - s, tpq);
  const tiedIn = e.start < barStart;
  const tiedOut = e.start + e.dur > barEnd;
  let pos = s - barStart;
  return pieces.map((pc, k) => {
    const first = k === 0, last = k === pieces.length - 1;
    const pieceStart = pos;
    pos += pc.ticks;
    const dots = '<dot/>'.repeat(pc.dots);
    const dur = `<duration>${pc.ticks * factor}</duration>`;
    const tm = pc.triplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '';
    let tuplet = '';
    if (pc.triplet && pieceStart % TICKS === 0) tuplet += '<tuplet type="start" bracket="yes"/>';
    if (pc.triplet && pos % TICKS === 0) tuplet += '<tuplet type="stop"/>';
    if (e.midi === null) {
      return `<note><rest/>${dur}<type>${pc.type}</type>${dots}${tm}${tuplet ? `<notations>${tuplet}</notations>` : ''}</note>`;
    }
    const sp = spell(doh, e.note!.syl, e.midi);
    const tieStop = !first || tiedIn, tieStart = !last || tiedOut;
    const ties = (tieStop ? '<tie type="stop"/>' : '') + (tieStart ? '<tie type="start"/>' : '');
    const tied = (tieStop ? '<tied type="stop"/>' : '') + (tieStart ? '<tied type="start"/>' : '');
    const onset = first && !tiedIn;
    const artic = onset ? e.note!.artic.map(a => XML_ARTIC[a]).join('') : '';
    const fermata = onset && e.note!.artic.includes('fermata') ? '<fermata type="upright"/>' : '';
    const inner = tied + tuplet + fermata + (artic ? `<articulations>${artic}</articulations>` : '');
    const notations = inner ? `<notations>${inner}</notations>` : '';
    const lyric = onset && e.lyric
      ? `<lyric number="1"><syllabic>${e.lyric.syllabic}</syllabic><text>${esc(e.lyric.text)}</text></lyric>` : '';
    const alter = sp.alter ? `<alter>${sp.alter}</alter>` : '';
    return `<note><pitch><step>${sp.step}</step>${alter}<octave>${sp.octave}</octave></pitch>`
      + `${dur}${ties}<type>${pc.type}</type>${dots}${tm}${notations}${lyric}</note>`;
  }).join('');
}

// ---------------------------------------------------------------- import

interface RawNote {
  start: number; dur: number; midi: number | null; step?: string; tieStop: boolean;
  artic: Articulation[]; lyric?: { text: string; syllabic: string };
}
interface Stream { key: string; name: string; clef: 'G' | 'G8' | 'F'; notes: RawNote[] }
interface BarInfo { start: number; len: number; num: number; den: number; marks: string[] }

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PREFIX_OF: Record<Articulation, string> = Object.fromEntries(
  Object.entries(ARTIC_PREFIX).map(([k, v]) => [v, k])) as Record<Articulation, string>;

const child = (el: Element, tag: string) => Array.from(el.children).find(c => c.tagName === tag) ?? null;
const text = (el: Element | null, tag: string) => (el ? child(el, tag)?.textContent?.trim() ?? '' : '');

export interface ImportResult { score: Omit<ScoreDoc, 'id' | 'updatedAt'>; warnings: string[] }

/** Reads an uncompressed MusicXML (score-partwise) file into a sol-fa score. */
export function fromMusicXML(xml: string): ImportResult {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This file is not valid XML.');
  const root = doc.documentElement;
  if (root.tagName === 'score-timewise') throw new Error('Timewise MusicXML is not supported; export “partwise” MusicXML instead.');
  if (root.tagName !== 'score-partwise') throw new Error('Not a MusicXML score.');
  const warnings = new Set<string>();

  const partNames: Record<string, string> = {};
  doc.querySelectorAll('part-list > score-part').forEach(sp => { partNames[sp.getAttribute('id') ?? ''] = text(sp, 'part-name'); });

  let fifths = 0, mode: 'major' | 'minor' = 'major', tempo = 0, tempoText = '';
  const bars: BarInfo[] = [];
  /** Chords found per measure and pulse, named once the key is known. */
  const harmonies: { root: number; kind: ChordKind; bass: number | null }[][][] = [];
  const streams = new Map<string, Stream>();

  Array.from(root.children).filter(c => c.tagName === 'part').forEach((part, partIdx) => {
    const pid = part.getAttribute('id') ?? `P${partIdx}`;
    let divisions = 1, beats = 4, beatType = 4;
    const clefs: Record<string, Stream['clef']> = {};
    let measureStart = 0;
    Array.from(part.children).filter(c => c.tagName === 'measure').forEach((measure, mIdx) => {
      let cursor = 0, maxPos = 0;
      const marks: string[] = [];
      const toTicks = (d: number) => {
        const t = (d / divisions) * (TICKS * beatType) / 4;
        if (Math.abs(t - Math.round(t)) > 0.01) warnings.add('Some rhythms were rounded to the nearest quarter- or third-pulse.');
        return Math.round(t);
      };
      for (const el of Array.from(measure.children)) {
        if (el.tagName === 'attributes') {
          const div = text(el, 'divisions'); if (div) divisions = Number(div);
          const key = child(el, 'key');
          if (key && partIdx === 0 && mIdx === 0) { fifths = Number(text(key, 'fifths') || 0); mode = text(key, 'mode') === 'minor' ? 'minor' : 'major'; }
          else if (key && mIdx > 0 && Number(text(key, 'fifths')) !== fifths) warnings.add('Key changes were ignored; the whole piece uses the first key.');
          const time = child(el, 'time');
          if (time) {
            const nb = Number(text(time, 'beats')) || 4, nt = Number(text(time, 'beat-type')) || 4;
            if (mIdx > 0 && (nb !== beats || nt !== beatType)) marks.push(`${nb}/${nt}`);
            beats = nb; beatType = nt;
          }
          el.querySelectorAll(':scope > clef').forEach(c => {
            const sign = text(c, 'sign'), oc = text(c, 'clef-octave-change');
            clefs[c.getAttribute('number') ?? '1'] = sign === 'F' ? 'F' : oc === '-1' ? 'G8' : 'G';
          });
        } else if (el.tagName === 'backup') {
          cursor -= toTicks(Number(text(el, 'duration')));
        } else if (el.tagName === 'forward') {
          cursor += toTicks(Number(text(el, 'duration')));
        } else if (el.tagName === 'barline') {
          const rep = el.querySelector('repeat')?.getAttribute('direction');
          if (rep === 'forward') marks.push('repeat start');
          if (rep === 'backward') marks.push('repeat end');
        } else if (el.tagName === 'direction') {
          const snd = el.querySelector('sound[tempo]');
          const words = el.querySelector('direction-type > words')?.textContent?.trim();
          if (snd && !tempo) {
            tempo = Number(snd.getAttribute('tempo'));
            if (words && partIdx === 0 && mIdx === 0) { tempoText = words; continue; }
          }
          const dt = el.querySelector('direction-type');
          if (!dt) continue;
          const dyn = dt.querySelector('dynamics > *');
          if (dyn) marks.push(dyn.tagName);
          if (dt.querySelector('segno')) marks.push('segno');
          if (dt.querySelector('coda')) marks.push('coda');
          const reh = dt.querySelector('rehearsal')?.textContent?.trim();
          if (reh) marks.push(`#${reh}`);
          if (words) marks.push(/[,|]/.test(words) ? `"${words.replace(/["|]/g, '')}"` : words);
        } else if (el.tagName === 'harmony') {
          const step = text(child(el, 'root'), 'root-step');
          if (!step) continue;
          const alter = Number(text(child(el, 'root'), 'root-alter') || 0);
          const kindText = text(el, 'kind');
          const bassEl = child(el, 'bass');
          const bassStep = bassEl ? text(bassEl, 'bass-step') : '';
          const offset = toTicks(Number(text(el, 'offset') || 0));
          const pulse = Math.max(0, Math.floor((cursor + offset) / TICKS));
          const root = (STEP_PC[step] + alter + 12) % 12;
          const bass = bassStep ? (STEP_PC[bassStep] + Number(text(bassEl, 'bass-alter') || 0) + 12) % 12 : null;
          const row = (harmonies[mIdx] ??= []);
          (row[pulse] ??= []).push({ root, kind: KIND_FROM_XML[kindText] ?? 'maj', bass: bass === root ? null : bass });
        } else if (el.tagName === 'note') {
          if (child(el, 'grace')) continue;
          const isChord = !!child(el, 'chord');
          const dur = toTicks(Number(text(el, 'duration') || 0));
          if (isChord) { warnings.add('Chords inside one voice were reduced to their first note.'); continue; }
          const voice = text(el, 'voice') || '1';
          const staff = text(el, 'staff') || '1';
          const key = `${pid}:${voice}`;
          const start = measureStart + cursor;
          if (!streams.has(key)) {
            streams.set(key, { key, name: partNames[pid] || pid, clef: clefs[staff] ?? clefs['1'] ?? 'G', notes: [] });
          }
          const pitch = child(el, 'pitch');
          let midi: number | null = null, step: string | undefined;
          if (pitch && !child(el, 'rest')) {
            step = text(pitch, 'step');
            midi = 12 * (Number(text(pitch, 'octave')) + 1) + STEP_PC[step] + Number(text(pitch, 'alter') || 0);
          }
          const artic: Articulation[] = [];
          if (el.querySelector('articulations > accent')) artic.push('accent');
          if (el.querySelector('articulations > strong-accent')) artic.push('marcato');
          if (el.querySelector('articulations > staccato, articulations > staccatissimo')) artic.push('staccato');
          if (el.querySelector('articulations > tenuto')) artic.push('tenuto');
          if (el.querySelector('notations > fermata')) artic.push('fermata');
          const lyr = el.querySelector('lyric');
          streams.get(key)!.notes.push({
            start, dur, midi, step, artic,
            tieStop: Array.from(el.querySelectorAll('tie')).some(t => t.getAttribute('type') === 'stop'),
            lyric: lyr ? { text: text(lyr, 'text'), syllabic: text(lyr, 'syllabic') || 'single' } : undefined,
          });
          cursor += dur;
        }
        maxPos = Math.max(maxPos, cursor);
      }
      if (partIdx === 0) {
        bars.push({ start: measureStart, len: maxPos, num: beats, den: beatType, marks });
      } else if (bars[mIdx]) {
        for (const m of marks) if (!bars[mIdx].marks.includes(m) && !/^\d+\/\d+$/.test(m)) bars[mIdx].marks.push(m);
      }
      measureStart += maxPos;
    });
  });

  const doh = fifthsToKey(fifths);
  const list = [...streams.values()].filter(s => s.notes.some(n => n.midi !== null));
  const voices = assignVoices(list);
  const first = bars[0];
  const pickup = !!first && first.len > 0 && first.len < first.num * TICKS;

  const parts: PartDoc[] = list.map((s, i) => {
    const voice = voices[i];
    const noteBars: string[] = [], lyricBars: string[] = [];
    bars.forEach((bar, b) => {
      const pulses = b === 0 && pickup ? Math.ceil(bar.len / TICKS) : bar.num;
      const { notes, lyrics } = formatBar(s.notes, bar.start, pulses, bar.num, doh, voice, warnings);
      noteBars.push(notes); lyricBars.push(lyrics);
    });
    return {
      id: `p${i + 1}`,
      name: list.length === 4 ? ['Soprano', 'Alto', 'Tenor', 'Bass'][i] : s.name + (countByName(list, s.name) > 1 ? ` ${i + 1}` : ''),
      voice, notes: noteBars.join(' | '), lyrics: lyricBars.some(l => l.trim()) ? lyricBars.join(' | ') : '',
    };
  });

  const title = doc.querySelector('work > work-title')?.textContent?.trim()
    || doc.querySelector('movement-title')?.textContent?.trim() || 'Imported score';
  const composer = doc.querySelector('identification > creator[type="composer"]')?.textContent?.trim() ?? '';
  const chordBars = bars.map((bar, b) => {
    const pulses = b === 0 && pickup ? Math.ceil(bar.len / TICKS) : bar.num;
    return Array.from({ length: pulses }, (_, i) => {
      const h = harmonies[b]?.[i]?.[0];
      return h ? chordName(h.root, h.kind, h.bass, doh).replace(/♯/g, '#').replace(/♭/g, 'b') : '';
    });
  });
  while (chordBars.length && chordBars[chordBars.length - 1].every(c => !c)) chordBars.pop();
  const chords = chordBars.length ? joinChords(chordBars) : '';
  const markSegs = bars.map(b => b.marks.join(', '));
  while (markSegs.length && !markSegs[markSegs.length - 1]) markSegs.pop();
  const marks = markSegs.join(' | ');

  return {
    score: {
      title, subtitle: '', composer, doh, mode, timeNum: first?.num ?? 4, timeDen: first?.den ?? 4,
      tempoText, bpm: tempo ? Math.round(tempo * ((first?.den ?? 4) / 4)) : 90, barsPerRow: 4, pickup,
      parts, marks, chords, footer: '',
    },
    warnings: [...warnings],
  };
}

const countByName = (list: Stream[], name: string) => list.filter(s => s.name === name).length;

function assignVoices(list: Stream[]): VoiceType[] {
  const byName = (n: string): VoiceType | null => {
    const l = n.toLowerCase();
    if (/sop|treble/.test(l)) return 'S';
    if (/alt|contralto/.test(l)) return 'A';
    if (/ten/.test(l)) return 'T';
    if (/bass|bari/.test(l)) return 'B';
    return null;
  };
  if (list.length === 4 && list.every(s => !byName(s.name) || countByName(list, s.name) > 1)) return ['S', 'A', 'T', 'B'];
  return list.map((s, i) => {
    const named = countByName(list, s.name) === 1 ? byName(s.name) : null;
    if (named) return named;
    const upper = list.slice(0, i).filter(o => o.clef === s.clef).length === 0;
    if (s.clef === 'F') return upper ? 'T' : 'B';
    if (s.clef === 'G8') return 'T';
    return upper ? 'S' : 'A';
  });
}

/** Writes one bar of a voice as sol-fa pulses (`d :-.r :m`, triplets `d;r;m`) plus its lyric syllables. */
function formatBar(notes: RawNote[], barStart: number, pulses: number, timeNum: number, doh: string, voice: VoiceType, warnings: Set<string>) {
  const accents = mediumAccents(timeNum);
  const sounding = (t: number) => notes.find(n => n.start <= t && t < n.start + n.dur);
  const out: string[] = [];
  const syls: string[] = [];
  let barHasLyric = false;

  const token = (n: RawNote | undefined, isStart: boolean) => {
    if (!n || n.midi === null) return '';
    if (!isStart || n.tieStop) return '-';
    const s = toSolfa(doh, voice, n.midi, n.step);
    if (n.lyric) {
      barHasLyric = true;
      const cont = n.lyric.syllabic === 'begin' || n.lyric.syllabic === 'middle';
      syls.push(n.lyric.text.replace(/\s+/g, '_') + (cont ? '-' : ''));
    } else syls.push('_');
    return n.artic.map(a => PREFIX_OF[a]).join('') + s.syl + octaveSuffix(s.octave);
  };

  for (let p = 0; p < pulses; p++) {
    const ps = barStart + p * TICKS;
    const onsets = notes.filter(n => n.start >= ps && n.start < ps + TICKS);
    const triplet = onsets.some(n => (n.start - ps) % 3 !== 0);
    const grid = triplet ? [0, 4, 8] : [0, 3, 6, 9];
    const slots = new Map<number, RawNote>();
    for (const n of onsets) {
      let off = n.start - ps;
      if (!grid.includes(off)) {
        warnings.add('Some notes did not fall on a half-, quarter- or third-pulse and were moved to the nearest one.');
        off = grid.reduce((a, b) => (Math.abs(b - off) < Math.abs(a - off) ? b : a));
      }
      if (!slots.has(off)) slots.set(off, n);
    }
    const at = (o: number) => (slots.has(o) ? token(slots.get(o), true) : token(sounding(ps + o), false));
    let str: string;
    if (triplet) {
      str = [0, 4, 8].map(at).join(';');
    } else {
      str = at(0);
      const offs = [...slots.keys()].filter(o => o > 0).sort((a, b) => a - b);
      for (const o of offs) {
        const sep = o === 6 ? '.' : o === 3 ? ',' : offs.includes(6) ? ',' : '.,';
        str += sep + token(slots.get(o), true);
      }
    }
    out.push(p === 0 ? str : `${accents.includes(p) ? '/' : ':'}${str}`);
  }
  // "Al- le- lu- ia" → "Al-le-lu-ia"; a "_" (melisma) stays a separate token.
  const lyrics = barHasLyric ? syls.join(' ').replace(/- (?!_)/g, '-') : '';
  return { notes: out.join(' ').replace(/\s+$/, ''), lyrics };
}
