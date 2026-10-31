import {
  Fragment, createContext, useContext, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode,
} from 'react';
import type { Analysis, AnalyzedPart } from '../music/analyze';
import { showChord, splitChords } from '../music/chords';
import { lyricsByBar } from '../music/edit';
import { jumpSymbol, type Mark } from '../music/marks';
import { displayKey, mediumAccents, parseKey } from '../music/solfa';
import { DEFAULT_STYLE, TICKS, type Articulation, type Issue, type Item, type Pulse, type ScoreDoc } from '../music/types';
import { PageMarginPreview } from './PrintStyle';
import { Rich, fontCss } from './Rich';

const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const ARTIC_SYMBOL: Record<Articulation, string> = { accent: '>', marcato: '^', staccato: '•', tenuto: '–', fermata: '𝄐' };

export function keyLine(score: ScoreDoc): string {
  const k = parseKey(score.doh);
  let s = `Key ${displayKey(score.doh)}`;
  if (k && score.mode === 'minor') s += ` (${MINOR_NAMES[(k.pc + 9) % 12]} minor)`;
  return s;
}

/** The cell being edited on the sheet: one pulse of a part, one bar of its lyrics, or one pulse of the chord row. */
export interface Cursor { partId: string; bar: number; pulse: number; field: 'notes' | 'lyrics' | 'chords' }

/** `partId` used by the cursor when it is on the chord row. */
export const CHORD_ROW = '__chords';

interface Props {
  score: ScoreDoc;
  analysis: Analysis;
  selectedBar: number | null;
  playingBar: number;
  onSelectBar: (bar: number) => void;
  cursor: Cursor | null;
  onCursor: (c: Cursor | null) => void;
  onEditPulse: (partId: string, bar: number, pulse: number, content: string) => void;
  onEditLyric: (partId: string, bar: number, text: string) => void;
  onEditChord: (bar: number, pulse: number, text: string) => void;
}

interface Ctx extends Props {
  /** The cell input being typed in, for the on-screen key row. */
  inputRef: { current: HTMLInputElement | null };
  barCount: number;
  lyricLines: boolean[];
  /** Chord text per bar and pulse, as typed. */
  chordText: string[][];
  showChords: boolean;
  severityByBar: Map<number, Issue['severity']>;
  pulsesAt: (b: number) => number;
  timeAt: (b: number) => { num: number; den: number };
}
const SheetCtx = createContext<Ctx | null>(null);
const useSheet = () => useContext(SheetCtx)!;

/** Rough printed width of a bar in characters, used to choose bars per row automatically. */
function barChars(analysis: Analysis, b: number): number {
  let max = 0;
  for (const p of analysis.parts) {
    const bar = p.bars[b];
    if (!bar) continue;
    let n = 0;
    for (const pulse of bar.pulses) n += 2 + pulse.raw.replace(/\s+/g, '').replace(/[()]/g, '').length;
    let lyr = 0;
    for (const e of p.events) if (e.bar === b && e.lyric) lyr += e.lyric.text.length + 1;
    max = Math.max(max, n, lyr + bar.pulses.length);
  }
  return Math.max(max, 8);
}

export function SolfaView(props: Props) {
  const { score, analysis, cursor } = props;
  const style = { ...DEFAULT_STYLE, ...score.style };
  const host = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    if (!host.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(host.current);
    return () => ro.disconnect();
  }, []);

  const severityByBar = new Map<number, Issue['severity']>();
  for (const i of analysis.issues) {
    if (i.bar === undefined) continue;
    if (severityByBar.get(i.bar) !== 'error') severityByBar.set(i.bar, i.severity);
  }

  // Show at least one bar (so an empty score can be typed into) and the bar being typed past the end.
  const barCount = Math.max(analysis.barCount, 1, cursor ? cursor.bar + 1 : 0);
  const lastTime = analysis.times[analysis.times.length - 1] ?? { num: score.timeNum, den: score.timeDen };
  const timeAt = (b: number) => analysis.times[b] ?? lastTime;
  const pulsesAt = (b: number) => Math.max(1, ...analysis.parts.map(p => p.bars[b]?.pulses.length ?? 0), analysis.parts.some(p => p.bars[b]) ? 0 : timeAt(b).num);
  const chordText = splitChords(score.chords ?? '');
  const showChords = chordText.some(r => r.some(Boolean)) || cursor?.field === 'chords';
  // Chords sit above each row's rectangle, so rows with chords are always drawn apart.
  const separateRows = style.separateRows || showChords;
  const lyricLines = analysis.parts.map(p => p.events.some(e => e.lyric) || (cursor?.field === 'lyrics' && cursor.partId === p.doc.id));

  // Split the music into rectangles at section breaks and text blocks.
  const sections = [...(score.sections ?? [])].filter(s => s.bar >= 0).sort((a, b) => a.bar - b.bar);
  const texts = [...(score.texts ?? [])].sort((a, b) => a.bar - b.bar);
  const cuts = [...new Set([0, ...sections.map(s => s.bar), ...texts.map(t => t.bar)].filter(b => b < barCount))].sort((a, b) => a - b);
  const blocks: ReactNode[] = [];
  cuts.forEach((from, i) => {
    const to = cuts[i + 1] ?? barCount;
    for (const t of texts.filter(t => t.bar === from)) blocks.push(<TextBlockView key={`t${t.id}`} title={t.title} body={t.body} />);
    const sec = sections.filter(s => s.bar === from).pop();
    // On narrow screens always fit bars to the width so the music never needs sideways scrolling.
    const perRow = width < 600 ? 0 : score.barsPerRow;
    const rows = layoutRows(analysis, from, to, perRow, width, style.size);
    blocks.push(
      <section key={`s${from}`} className="music-block">
        {sec?.title && <h3 className="block-title"><Rich text={sec.title} /></h3>}
        {separateRows
          ? rows.map((row, r) => <div className="sheet-grid" key={r}><SheetRow row={row} fill={perRow || row.length} /></div>)
          : <div className="sheet-grid">{rows.map((row, r) => <SheetRow key={r} row={row} fill={perRow || row.length} />)}</div>}
      </section>,
    );
  });
  for (const t of texts.filter(t => t.bar >= barCount)) blocks.push(<TextBlockView key={`t${t.id}`} title={t.title} body={t.body} />);

  const sheetVars = {
    '--sheet-font': fontCss(style.font),
    '--title-font': fontCss(style.titleFont),
    '--note-size': `${style.size}px`,
  } as CSSProperties;

  return (
    <SheetCtx.Provider value={{ ...props, inputRef, barCount, lyricLines, chordText, showChords, severityByBar, pulsesAt, timeAt }}>
      <div ref={host} className={`solfa-sheet layout-${style.layout}${separateRows ? ' rows-apart' : ''}${showChords ? ' has-chords' : ''}${style.lyricsItalic ? ' lyr-italic' : ''}${style.notesBold ? '' : ' notes-light'}`} style={sheetVars}>
        <PageMarginPreview score={score} edge="top" />
        <header className="sheet-head">
          <h1><Rich text={score.title || 'Untitled'} /></h1>
          {score.subtitle && <div className="sheet-sub"><Rich text={score.subtitle} /></div>}
          <div className="sheet-meta">
            <span><b>{keyLine(score)}</b>&ensp;<b>{score.timeNum}/{score.timeDen}</b>&ensp;<i><Rich text={score.tempoText} /></i></span>
            <span><Rich text={score.composer} /></span>
          </div>
        </header>
        {blocks}
        {score.footer && <footer className="sheet-foot"><Rich text={score.footer} /></footer>}
        <PageMarginPreview score={score} edge="bottom" />
        {cursor && <KeyRow />}
        <p className="sheet-tip">Click a note to edit it. <kbd>Space</kbd>/<kbd>Tab</kbd> next pulse, <kbd>↑</kbd><kbd>↓</kbd> other parts, <kbd>Ctrl</kbd>+<kbd>L</kbd> lyrics, <kbd>Esc</kbd> done.</p>
      </div>
    </SheetCtx.Provider>
  );
}

/** Rows within one rectangle: a fixed number of bars, or (0 = auto) as many as fit the width. */
function layoutRows(analysis: Analysis, from: number, to: number, perRow: number, width: number, size: number): number[][] {
  const rows: number[][] = [];
  if (perRow > 0) {
    for (let b = from; b < to; b += perRow) rows.push(Array.from({ length: Math.min(perRow, to - b) }, (_, k) => b + k));
    return rows;
  }
  const charW = size * 0.62, pad = 16;
  let row: number[] = [], used = 0;
  for (let b = from; b < to; b++) {
    const w = barChars(analysis, b) * charW + pad;
    if (row.length && used + w > width - 4) { rows.push(row); row = []; used = 0; }
    row.push(b); used += w;
  }
  if (row.length) rows.push(row);
  return rows;
}

function TextBlockView({ title, body }: { title: string; body: string }) {
  const paras = body.split(/\n\s*\n/);
  return (
    <section className="text-block">
      {title && <h3 className="block-title"><Rich text={title} /></h3>}
      <div className="text-body">
        {paras.map((p, i) => (
          <p key={i}>{p.split('\n').map((line, j) => <Fragment key={j}>{j > 0 && <br />}<Rich text={line} /></Fragment>)}</p>
        ))}
      </div>
    </section>
  );
}

function SheetRow({ row, fill }: { row: number[]; fill: number }) {
  const { analysis, lyricLines, showChords } = useSheet();
  // Shared row tracks (marks band, chord row, then notes + lyrics per part) keep every bar's lines level.
  const tracks = ['auto', ...(showChords ? ['auto'] : []), ...analysis.parts.flatMap((_, i) => (lyricLines[i] ? ['auto', 'auto'] : ['auto']))];
  const cols = `${row.map(b => `minmax(max-content, ${barChars(analysis, b)}fr)`).join(' ')}${row.length < fill ? ` minmax(0, ${(fill - row.length) * 10}fr)` : ''}`;
  return (
    <div className="sheet-row" style={{ gridTemplateColumns: cols, gridTemplateRows: tracks.join(' ') }}>
      {row.map(b => <BarBox key={b} b={b} rowCount={tracks.length} />)}
    </div>
  );
}

function BarBox({ b, rowCount }: { b: number; rowCount: number }) {
  const { analysis, lyricLines, showChords, severityByBar, selectedBar, playingBar, onSelectBar, pulsesAt, timeAt } = useSheet();
  const marks = analysis.marks[b] ?? [];
  const severity = severityByBar.get(b);
  const cls = [
    'bar', severity ? `has-${severity}` : '', selectedBar === b ? 'selected' : '', playingBar === b ? 'playing' : '',
    marks.some(m => m.kind === 'repeatStart') ? 'rep-start' : '', marks.some(m => m.kind === 'repeatEnd') ? 'rep-end' : '',
  ].join(' ');
  const cells: ReactNode[] = [];
  const marksRow = showChords ? 2 : 1;
  let row = marksRow + 1;
  if (showChords) cells.push(<ChordCells key="chords" b={b} gridRow={1} />);
  analysis.parts.forEach((p, i) => {
    const notesRow = row++;
    const lyricRow = lyricLines[i] ? row++ : null;
    if (i > 0) cells.push(<div key={`${p.doc.id}rule`} className="line-rule" style={{ gridRow: notesRow, gridColumn: '1 / -1' }} />);
    cells.push(<VoiceCells key={p.doc.id} part={p} b={b} timeNum={timeAt(b).num} pulses={pulsesAt(b)} notesRow={notesRow} lyricRow={lyricRow} />);
  });
  return (
    <div className={cls} onClick={() => onSelectBar(b)} data-bar={b}
      style={{ gridRow: `1 / span ${rowCount}`, gridTemplateColumns: `repeat(${pulsesAt(b)}, auto)` }}>
      {/* With chords, the box is drawn by this frame so the chord line can sit above it, outside the box. */}
      {showChords && <div className="bar-frame" style={{ gridRow: `${marksRow} / -1`, gridColumn: '1 / -1' }} />}
      <div className="bar-marks" style={{ gridRow: marksRow, gridColumn: '1 / -1' }}>
        {marks.filter(m => m.kind !== 'repeatStart' && m.kind !== 'repeatEnd').map((m, i) => <MarkView key={i} m={m} />)}
        <span className="bar-num">{b + 1}</span>
      </div>
      {cells}
    </div>
  );
}

function MarkView({ m }: { m: Mark }) {
  switch (m.kind) {
    case 'dynamic': return <span className="mark-dyn">{m.text}</span>;
    case 'time': return <span className="mark-time"><span>{m.num}</span><span>{m.den}</span></span>;
    case 'rehearsal': return <span className="mark-reh">{m.text}</span>;
    case 'jump': return <span className={`mark-jump${/^(segno|coda)$/i.test(m.text) ? ' sym' : ''}`}>{jumpSymbol(m.text)}</span>;
    case 'label': return <span className="mark-label"><Rich text={m.text} /></span>;
    case 'tempo': return <span className="mark-tempo">{m.text}</span>;
    case 'metronome': return <span className="mark-metro">{m.text}</span>;
    case 'text': return <span className="mark-text"><Rich text={m.text} /></span>;
    default: return null;
  }
}

/** One part's pulses (and lyrics) in one bar, placed on the bar's shared grid. Fragments keep cells as grid items. */
function VoiceCells({ part, b, timeNum, pulses, notesRow, lyricRow }: {
  part: AnalyzedPart; b: number; timeNum: number; pulses: number; notesRow: number; lyricRow: number | null;
}) {
  const sheet = useSheet();
  const { cursor, onCursor } = sheet;
  const bar = part.bars[b];
  const accents = mediumAccents(timeNum);
  const barStart = part.barStarts[b] ?? 0;
  const slurs = slurStates(part, b);
  const count = bar ? bar.pulses.length : pulses;
  const id = part.doc.id;
  const cells: ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const p = bar?.pulses[i];
    const editing = cursor?.field === 'notes' && cursor.partId === id && cursor.bar === b && cursor.pulse === i;
    const cls = ['pulse', slurs[i] ? `slur-${slurs[i]}` : '', !bar && part.bars.length ? 'missing' : '', editing ? 'editing' : ''].join(' ');
    cells.push(
      <div key={`n${i}`} className={cls} style={{ gridRow: notesRow, gridColumn: i + 1 }}
        onClick={e => { e.stopPropagation(); onCursor({ partId: id, bar: b, pulse: i, field: 'notes' }); }}>
        {i > 0 && <span className="sep">{accents.includes(i) ? '/' : ':'}</span>}
        {editing ? <PulseInput raw={p?.raw.trim() ?? ''} /> : p ? <PulseView pulse={p} /> : null}
      </div>,
    );
  }
  if (lyricRow !== null) {
    const editing = cursor?.field === 'lyrics' && cursor.partId === id && cursor.bar === b;
    if (editing) {
      cells.push(
        <div key="lyr-edit" className="syl editing" style={{ gridRow: lyricRow, gridColumn: `1 / ${count + 1}` }} onClick={e => e.stopPropagation()}>
          <LyricInput value={lyricsByBar(part, Math.max(sheet.analysis.barCount, b + 1))[b] ?? ''} />
        </div>,
      );
    } else {
      const byPulse: string[] = Array.from({ length: count }, () => '');
      for (const e of part.events) {
        if (!e.lyric || e.bar !== b) continue;
        const p = Math.floor((e.start - barStart) / TICKS);
        if (p < 0 || p >= byPulse.length) continue;
        const prev = byPulse[p];
        byPulse[p] = prev + (prev && !prev.endsWith('-') ? ' ' : '') + e.lyric.text + (e.lyric.hyphen ? '-' : '');
      }
      byPulse.forEach((l, i) => cells.push(
        <div key={`l${i}`} className="syl" style={{ gridRow: lyricRow, gridColumn: i + 1 }}
          onClick={e => { e.stopPropagation(); onCursor({ partId: id, bar: b, pulse: 0, field: 'lyrics' }); }}>{l}</div>,
      ));
    }
  }
  return <>{cells}</>;
}

/** Moves the cursor: ±1 pulse (crossing bars, extending past the end) or ±1 part. */
function useNavigation() {
  const { cursor, onCursor, analysis, pulsesAt, barCount } = useSheet();
  return (dir: 'next' | 'prev' | 'up' | 'down' | 'nextBar' | 'prevBar') => {
    if (!cursor) return;
    const parts = analysis.parts.map(p => p.doc.id);
    const pi = parts.indexOf(cursor.partId);
    const pulsesOf = (b: number) => (pi < 0 ? pulsesAt(b) : analysis.parts[pi]?.bars[b]?.pulses.length ?? pulsesAt(b));
    let { bar, pulse } = cursor;
    // Moving between the chord row (above the top part) and the parts.
    if (cursor.field === 'chords' && dir === 'down' && parts.length) {
      onCursor({ ...cursor, field: 'notes', partId: parts[0] });
      return;
    }
    if (cursor.field === 'chords' && dir === 'up') return;
    if (cursor.field === 'notes' && dir === 'up' && pi === 0) {
      onCursor({ ...cursor, field: 'chords', partId: CHORD_ROW });
      return;
    }
    if (dir === 'next') {
      if (pulse + 1 < pulsesOf(bar)) pulse++;
      else if (bar + 1 <= barCount) { bar++; pulse = 0; }
    } else if (dir === 'prev') {
      if (pulse > 0) pulse--;
      else if (bar > 0) { bar--; pulse = pulsesOf(bar) - 1; }
    } else if (dir === 'nextBar') { bar = Math.min(bar + 1, barCount); pulse = 0; }
    else if (dir === 'prevBar') { bar = Math.max(bar - 1, 0); pulse = 0; }
    else {
      const ni = Math.min(parts.length - 1, Math.max(0, pi + (dir === 'down' ? 1 : -1)));
      onCursor({ ...cursor, partId: parts[ni], pulse: Math.min(pulse, Math.max(0, pulsesOf(bar) - 1)) });
      return;
    }
    onCursor({ ...cursor, bar, pulse });
  };
}

/** The chord symbols of one bar, one cell per pulse, above the top part. */
function ChordCells({ b, gridRow }: { b: number; gridRow: number }) {
  const { chordText, analysis, cursor, onCursor, pulsesAt, score } = useSheet();
  const chordStyle = score.style?.chordStyle ?? 'letters';
  const count = pulsesAt(b);
  const typed = chordText[b] ?? [];
  const cells: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = typed[i] ?? '';
    const editing = cursor?.field === 'chords' && cursor.bar === b && cursor.pulse === i;
    const parsed = analysis.chords[b]?.[i] ?? null;
    const bad = !!t && !parsed;
    cells.push(
      <div key={`c${i}`} className={`chord${editing ? ' editing' : ''}${bad ? ' bad' : ''}`} style={{ gridRow, gridColumn: i + 1 }}
        title={bad ? 'Not a chord symbol (e.g. C, G7, Am, F#m, Bbmaj7, C/E, or I, ii, V7)' : 'Click to type a chord'}
        onClick={e => { e.stopPropagation(); onCursor({ partId: CHORD_ROW, bar: b, pulse: i, field: 'chords' }); }}>
        {editing ? <ChordInput raw={t} /> : parsed ? showChord(parsed, score.doh, score.mode, chordStyle) : t}
      </div>,
    );
  }
  return <>{cells}</>;
}

function ChordInput({ raw }: { raw: string }) {
  const { cursor, onCursor, onEditChord, inputRef } = useSheet();
  const move = useNavigation();
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, [cursor?.bar, cursor?.pulse]);
  if (!cursor) return null;
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    if (e.key === ' ' || (e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') { e.preventDefault(); move('next'); }
    else if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); move('prev'); }
    else if (e.key === '|') { e.preventDefault(); move('nextBar'); }
    else if (e.key === 'ArrowRight' && atEnd) { e.preventDefault(); move('next'); }
    else if (e.key === 'ArrowLeft' && atStart) { e.preventDefault(); move('prev'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move('down'); }
    else if (e.key === 'Backspace' && el.value === '') { e.preventDefault(); move('prev'); }
    else if (e.key === 'Escape') { e.preventDefault(); onCursor(null); }
  };
  return (
    <input ref={el => { ref.current = el; inputRef.current = el; }} className="cell-input chord-input" value={raw} spellCheck={false}
      aria-label={`Chord, bar ${cursor.bar + 1}, pulse ${cursor.pulse + 1}`} placeholder="C"
      size={Math.max(3, raw.length + 1)} onKeyDown={onKey} onClick={e => e.stopPropagation()}
      onChange={e => onEditChord(cursor.bar, cursor.pulse, e.target.value)} />
  );
}

function PulseInput({ raw }: { raw: string }) {
  const { cursor, onCursor, onEditPulse, inputRef } = useSheet();
  const move = useNavigation();
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, [cursor?.bar, cursor?.pulse, cursor?.partId]);
  if (!cursor) return null;
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    if (e.key === ' ' || e.key === ':' || (e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') { e.preventDefault(); move('next'); }
    else if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); move('prev'); }
    else if (e.key === '|') { e.preventDefault(); move('nextBar'); }
    else if (e.key === 'ArrowRight' && atEnd) { e.preventDefault(); move('next'); }
    else if (e.key === 'ArrowLeft' && atStart) { e.preventDefault(); move('prev'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move('up'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move('down'); }
    else if (e.key === 'Backspace' && el.value === '') { e.preventDefault(); move('prev'); }
    else if (e.key === 'Escape') { e.preventDefault(); onCursor(null); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); onCursor({ ...cursor, field: 'lyrics' }); }
  };
  return (
    <input ref={el => { ref.current = el; inputRef.current = el; }} className="cell-input" value={raw} spellCheck={false} aria-label={`Bar ${cursor.bar + 1}, pulse ${cursor.pulse + 1}`}
      size={Math.max(2, raw.length + 1)} onKeyDown={onKey} onClick={e => e.stopPropagation()}
      onChange={e => onEditPulse(cursor.partId, cursor.bar, cursor.pulse, e.target.value)} />
  );
}

function LyricInput({ value }: { value: string }) {
  const { cursor, onCursor, onEditLyric, barCount, inputRef } = useSheet();
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); }, [cursor?.bar, cursor?.partId]);
  if (!cursor) return null;
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const bar = e.shiftKey ? Math.max(0, cursor.bar - 1) : Math.min(barCount - 1, cursor.bar + 1);
      onCursor({ ...cursor, bar });
    } else if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l')) {
      e.preventDefault();
      onCursor({ ...cursor, field: 'notes' });
    }
  };
  return (
    <input ref={el => { ref.current = el; inputRef.current = el; }} className="cell-input lyric" value={value} spellCheck={false} placeholder="Al-le-lu-ia (use _ to hold a syllable)"
      aria-label={`Lyrics, bar ${cursor.bar + 1}`} onKeyDown={onKey} onChange={e => onEditLyric(cursor.partId, cursor.bar, e.target.value)} />
  );
}

/** Chord-entry keys: accidentals, qualities and the slash for inversions. */
const CHORD_KEYS: [string, string, string][] = [
  ['#', '♯', 'Sharp'], ['b', '♭', 'Flat'], ['m', 'm', 'Minor'], ['7', '7', 'Seventh'], ['maj7', 'maj7', 'Major seventh'],
  ['m7', 'm7', 'Minor seventh'], ['dim', 'dim', 'Diminished'], ['sus4', 'sus4', 'Suspended fourth'], ['/', '/', 'Bass note (inversion), e.g. C/E'],
];

const KEYS: { text: string; label: string; tip: string }[] = [
  { text: "'", label: 'd¹', tip: 'Octave up' }, { text: '1', label: 'd₁', tip: 'Octave down' },
  { text: '.', label: '.', tip: 'Half pulse (d.r)' }, { text: ',', label: ',', tip: 'Quarter pulse (d,r.m,f)' },
  { text: ';', label: '3', tip: 'Triplet (d;r;m)' }, { text: '-', label: '–', tip: 'Hold' },
  { text: '>', label: '>', tip: 'Accent' }, { text: '!', label: '•', tip: 'Staccato' }, { text: '*', label: '𝄐', tip: 'Fermata' },
  { text: '(', label: '(', tip: 'Start slur' }, { text: ')', label: ')', tip: 'End slur' },
];

/** On-screen keys shown while a cell is being edited: symbols that are awkward to type (especially on phones) and navigation. */
function KeyRow() {
  const { cursor, onCursor, onEditPulse, onEditLyric, onEditChord, inputRef } = useSheet();
  const move = useNavigation();
  if (!cursor) return null;
  const keep = (e: { preventDefault: () => void }) => e.preventDefault(); // keep focus in the cell
  const insert = (ch: string) => {
    const el = inputRef.current;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    const v = el.value.slice(0, s) + ch + el.value.slice(e);
    if (cursor.field === 'lyrics') onEditLyric(cursor.partId, cursor.bar, v);
    else if (cursor.field === 'chords') onEditChord(cursor.bar, cursor.pulse, v);
    else onEditPulse(cursor.partId, cursor.bar, cursor.pulse, v);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + ch.length, s + ch.length); });
  };
  const isLyrics = cursor.field === 'lyrics';
  const isChords = cursor.field === 'chords';
  return (
    <div className="key-row" role="toolbar" aria-label="Note entry keys" onClick={e => e.stopPropagation()}>
      {isChords
        ? CHORD_KEYS.map(([t, label, tip]) => <button key={t} data-tip={tip} aria-label={tip} onMouseDown={keep} onClick={() => insert(t)}>{label}</button>)
        : isLyrics
        ? [['-', 'Hyphen between syllables'], ['_', 'Hold the syllable over the next note']].map(([t, tip]) => (
          <button key={t} data-tip={tip} onMouseDown={keep} onClick={() => insert(t)}>{t}</button>))
        : KEYS.map(k => <button key={k.text} data-tip={k.tip} aria-label={k.tip} onMouseDown={keep} onClick={() => insert(k.text)}>{k.label}</button>)}
      <span className="key-gap" />
      {!isLyrics && <>
        {!isChords && <button data-tip="Chord row above the music" onMouseDown={keep}
          onClick={() => onCursor({ ...cursor, field: 'chords', partId: CHORD_ROW })}>Chords</button>}
        <button data-tip="Previous pulse" aria-label="Previous pulse" onMouseDown={keep} onClick={() => move('prev')}>◀</button>
        <button data-tip="Next pulse" aria-label="Next pulse" onMouseDown={keep} onClick={() => move('next')}>▶</button>
        <button data-tip="Part above" aria-label="Part above" onMouseDown={keep} onClick={() => move('up')}>▲</button>
        <button data-tip="Part below" aria-label="Part below" onMouseDown={keep} onClick={() => move('down')}>▼</button>
      </>}
      {!isChords && <button data-tip={isLyrics ? 'Back to notes' : 'Type lyrics for this bar (Ctrl+L)'} onMouseDown={keep}
        onClick={() => onCursor({ ...cursor, field: isLyrics ? 'notes' : 'lyrics' })}>{isLyrics ? 'Notes' : 'Lyrics'}</button>}
      <button className="primary" onMouseDown={keep} onClick={() => onCursor(null)}>Done</button>
    </div>
  );
}

function PulseView({ pulse }: { pulse: Pulse }) {
  const triplet = pulse.items.some(it => it.sep === ';');
  const inner = pulse.items.map((it, k) => (
    <Fragment key={k}>
      {it.sep && it.sep !== ';' && <span className="div">{it.sep}</span>}
      {it.sep === ';' && <span className="div trip" />}
      <ItemView item={it.item} />
    </Fragment>
  ));
  return triplet ? <span className="triplet">{inner}</span> : <>{inner}</>;
}

/** Which pulses of bar b sit under a slur (slurs may run across bars). */
function slurStates(part: AnalyzedPart, b: number) {
  let open = false;
  for (let i = 0; i < b; i++) {
    for (const p of part.bars[i]?.pulses ?? []) {
      for (const it of p.items) {
        if (it.item.kind !== 'note') continue;
        if (it.item.slurStart) open = true;
        if (it.item.slurEnd) open = false;
      }
    }
  }
  return (part.bars[b]?.pulses ?? []).map(p => {
    let state: 'start' | 'mid' | 'end' | 'both' | null = open ? 'mid' : null;
    for (const it of p.items) {
      if (it.item.kind !== 'note') continue;
      if (it.item.slurStart) { state = state === 'mid' ? 'mid' : 'start'; open = true; }
      if (it.item.slurEnd) { state = state === 'start' ? 'both' : 'end'; open = false; }
    }
    return state;
  });
}

function ItemView({ item }: { item: Item }): ReactNode {
  if (item.kind === 'rest') return null;
  if (item.kind === 'hold') return <span className="hold">–</span>;
  const mark = item.octave > 0
    ? <sup>{item.octave}</sup>
    : item.octave < 0 ? <sub>{-item.octave}</sub> : null;
  const artic = item.artic.map(a => ARTIC_SYMBOL[a]).join('');
  return (
    <span className="note">
      {artic && <span className="artic">{artic}</span>}
      {item.syl}{mark}
    </span>
  );
}
