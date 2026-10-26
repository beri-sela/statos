import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { Analysis } from '../music/analyze';
import { countPulses, tidyNotes } from '../music/format';
import { DYNAMIC_MARKS, JUMP_MARKS, TEMPO_MARKS, addMark, classify, marksForBar, removeMark } from '../music/marks';
import { DEFAULT_STYLE, type PartDoc, type ScoreDoc, type SheetStyle, type TextBlock, type VoiceType } from '../music/types';
import { newId } from '../storage';
import { FONTS } from './Rich';

export const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
export const TIMES: [number, number][] = [[2, 4], [3, 4], [4, 4], [6, 8], [6, 4], [9, 8], [12, 8], [2, 2], [3, 2], [3, 8], [5, 4], [7, 8]];
export const VOICES: { v: VoiceType; label: string }[] = [
  { v: 'S', label: 'Soprano' }, { v: 'A', label: 'Alto' }, { v: 'T', label: 'Tenor' }, { v: 'B', label: 'Bass' },
];
export const keyLabel = (k: string) => k.replace('#', '♯').replace(/b$/, '♭');

const ARTIC_BUTTONS: { text: string; label: string; title: string }[] = [
  { text: '>', label: '>', title: 'Accent: type > before the note' },
  { text: '^', label: '^', title: 'Marcato (strong accent): ^ before the note' },
  { text: '!', label: '•', title: 'Staccato: ! before the note' },
  { text: '~', label: '–', title: 'Tenuto: ~ before the note' },
  { text: '*', label: '𝄐', title: 'Fermata (pause): * before the note' },
  { text: "'", label: 'd¹', title: "Octave up: ' after the note" },
  { text: '1', label: 'd₁', title: 'Octave down: 1 after the note (2 for two octaves)' },
  { text: ';', label: '3', title: 'Triplet: three notes in one pulse, d;r;m' },
  { text: '.', label: '.', title: 'Half-pulse division: d.r' },
  { text: ',', label: ',', title: 'Quarter-pulse division: d,r.m,f' },
  { text: '-', label: '–', title: 'Hold the previous note' },
  { text: '(', label: '(', title: 'Start slur' },
  { text: ')', label: ')', title: 'End slur' },
];

export interface EditorHandle { focusBar: (partId: string, bar: number, tries?: number) => void }

interface Props {
  score: ScoreDoc;
  analysis: Analysis;
  selectedBar: number | null;
  autoTidy: boolean;
  onAutoTidy: (v: boolean) => void;
  onChange: (s: ScoreDoc) => void;
}

export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { score, analysis, selectedBar, autoTidy, onAutoTidy, onChange }, ref,
) {
  const areas = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const lastArea = useRef<{ id: string; field: 'notes' | 'lyrics' } | null>(null);
  const [help, setHelp] = useState(false);
  // Most editing happens on the sheet; the text boxes stay folded away until wanted.
  const [showText, setShowText] = useState(false);
  const style: SheetStyle = { ...DEFAULT_STYLE, ...score.style };

  useImperativeHandle(ref, () => ({
    focusBar(partId, bar, tries = 0) {
      const el = areas.current[partId];
      if (!el) {
        // The text boxes are folded away: open them, then try again once they are on screen.
        setShowText(true);
        if (tries < 5) requestAnimationFrame(() => this.focusBar(partId, bar, tries + 1));
        return;
      }
      const part = analysis.parts.find(p => p.doc.id === partId);
      const pb = part?.bars[bar];
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (pb) {
        el.setSelectionRange(pb.offset, pb.offset + pb.raw.length);
        const line = el.value.slice(0, pb.offset).split('\n').length - 1;
        el.scrollTop = Math.max(0, line * 20 - 20);
      }
    },
  }), [analysis, showText]);

  const set = <K extends keyof ScoreDoc>(k: K, v: ScoreDoc[K]) => onChange({ ...score, [k]: v });
  const setStyle = (patch: Partial<SheetStyle>) => onChange({ ...score, style: { ...style, ...patch } });
  const setPart = (id: string, patch: Partial<PartDoc>) =>
    onChange({ ...score, parts: score.parts.map(p => (p.id === id ? { ...p, ...patch } : p)) });

  const addPart = () => {
    const used = new Set(score.parts.map(p => p.voice));
    const voice = VOICES.find(v => !used.has(v.v)) ?? VOICES[0];
    onChange({ ...score, parts: [...score.parts, { id: newId(), name: voice.label, voice: voice.v, notes: '', lyrics: '' }] });
  };
  const movePart = (i: number, d: number) => {
    const parts = [...score.parts];
    const [p] = parts.splice(i, 1);
    parts.splice(i + d, 0, p);
    onChange({ ...score, parts });
  };
  const tidy = (p: PartDoc) => {
    const t = tidyNotes(p.notes, score.timeNum, score.timeDen, score.marks, score.pickup);
    if (t !== p.notes) setPart(p.id, { notes: t });
  };

  /** Inserts text at the caret of the notes box used last. */
  const insert = (text: string) => {
    const target = lastArea.current ?? (score.parts[0] && { id: score.parts[0].id, field: 'notes' as const });
    if (!target) return;
    const el = areas.current[target.id];
    const part = score.parts.find(p => p.id === target.id);
    if (!el || !part) return;
    const start = el.selectionStart ?? part.notes.length, end = el.selectionEnd ?? start;
    const value = part.notes.slice(0, start) + text + part.notes.slice(end);
    setPart(part.id, { notes: value });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length); });
  };

  const barCountOf = (id: string) => analysis.parts.find(p => p.doc.id === id)?.bars.length ?? 0;
  const timeValue = `${score.timeNum}/${score.timeDen}`;

  return (
    <div className="editor">
      <section className="card">
        <h2>Score</h2>
        <div className="fields">
          <label className="wide">Title<input value={score.title} onChange={e => set('title', e.target.value)} /></label>
          <label className="wide">Subtitle<input value={score.subtitle} onChange={e => set('subtitle', e.target.value)} /></label>
          <label className="wide">Composer / arranger<input value={score.composer} onChange={e => set('composer', e.target.value)} /></label>
          <label>Doh is
            <select value={score.doh} onChange={e => set('doh', e.target.value)}>
              {!KEYS.includes(score.doh) && <option value={score.doh}>{score.doh}</option>}
              {KEYS.map(k => <option key={k} value={k}>{keyLabel(k)}</option>)}
            </select>
          </label>
          <label>Mode
            <select value={score.mode} onChange={e => set('mode', e.target.value as ScoreDoc['mode'])}>
              <option value="major">major</option>
              <option value="minor">minor (lah-mode)</option>
            </select>
          </label>
          <label>Time signature
            <select value={timeValue} onChange={e => {
              const [n, d] = e.target.value.split('/').map(Number);
              onChange({ ...score, timeNum: n, timeDen: d });
            }}>
              {!TIMES.some(([n, d]) => `${n}/${d}` === timeValue) && <option value={timeValue}>{timeValue}</option>}
              {TIMES.map(([n, d]) => <option key={`${n}/${d}`} value={`${n}/${d}`}>{n}/{d}</option>)}
            </select>
          </label>
          <label>Speed (pulses/min)<input type="number" min={30} max={240} value={score.bpm} onChange={e => set('bpm', Number(e.target.value) || 90)} /></label>
          <label className="wide">Tempo marking<input value={score.tempoText} placeholder="e.g. Lively" onChange={e => set('tempoText', e.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={score.pickup} onChange={e => set('pickup', e.target.checked)} />First bar is a pick-up (shorter bar)</label>
        </div>
        <p className="hint">Text fields accept <code>**bold**</code> and <code>*italic*</code>.</p>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <div className="fields">
          <label className="wide">Boxes
            <select value={style.layout} onChange={e => setStyle({ layout: e.target.value as SheetStyle['layout'] })}>
              <option value="bar">One box per bar (all parts inside)</option>
              <option value="lines">Separate box for each part’s line</option>
            </select>
          </label>
          <label>Bars per row
            <select value={score.barsPerRow} onChange={e => set('barsPerRow', Number(e.target.value))}>
              <option value={0}>Auto (fit the width)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Text size<input type="number" min={9} max={24} value={style.size} onChange={e => setStyle({ size: Math.min(24, Math.max(9, Number(e.target.value) || 13)) })} /></label>
          <label>Music font
            <select value={style.font} onChange={e => setStyle({ font: e.target.value })}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label>Title font
            <select value={style.titleFont} onChange={e => setStyle({ titleFont: e.target.value })}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={style.separateRows} onChange={e => setStyle({ separateRows: e.target.checked })} />Each row of bars in its own rectangle</label>
          <label className="check"><input type="checkbox" checked={style.notesBold} onChange={e => setStyle({ notesBold: e.target.checked })} />Bold notes</label>
          <label className="check"><input type="checkbox" checked={style.lyricsItalic} onChange={e => setStyle({ lyricsItalic: e.target.checked })} />Italic lyrics</label>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Parts</h2>
          <button className="link" onClick={() => setHelp(h => !h)}>{help ? 'Hide help' : 'How to type sol-fa'}</button>
        </div>
        {help && <Help />}
        <p className="hint">Click any note on the sheet to type there. Or type whole parts as text:
          {' '}<button className="link" onClick={() => setShowText(t => !t)} aria-expanded={showText}>{showText ? 'Hide text boxes' : 'Show text boxes'}</button></p>
        {showText && <>
        <label className="check auto-tidy">
          <input type="checkbox" checked={autoTidy} onChange={e => onAutoTidy(e.target.checked)} />
          <span>Add colons and bar lines for me (type pulses separated by spaces: <code>d r m f</code>, <code>_</code> for a rest)</span>
        </label>
        <div className="palette" aria-label="Insert into notes">
          {ARTIC_BUTTONS.map(b => (
            <button key={b.text} title={b.title} onMouseDown={e => e.preventDefault()} onClick={() => insert(b.text)}>{b.label}</button>
          ))}
        </div>
        </>}
        {score.parts.map((p, i) => {
          const pulses = countPulses(p.notes);
          return (
            <div className="part" key={p.id}>
              <div className="part-head">
                <input className="part-name" value={p.name} aria-label="Part name" onChange={e => setPart(p.id, { name: e.target.value })} />
                <select value={p.voice} aria-label="Voice type" onChange={e => setPart(p.id, { voice: e.target.value as VoiceType })}>
                  {VOICES.map(v => <option key={v.v} value={v.v}>{v.label} range</option>)}
                </select>
                <span className="count" title={`${pulses} pulses`}>{barCountOf(p.id)} bars</span>
                <button className="icon" title="Add colons and bar lines now" onClick={() => tidy(p)}>⇥ Tidy</button>
                <button className="icon" title="Move up" disabled={i === 0} onClick={() => movePart(i, -1)}>↑</button>
                <button className="icon" title="Move down" disabled={i === score.parts.length - 1} onClick={() => movePart(i, 1)}>↓</button>
                <RemoveButton onConfirm={() => onChange({ ...score, parts: score.parts.filter(x => x.id !== p.id) })} />
              </div>
              {showText && <>
              <textarea ref={el => { areas.current[p.id] = el; }} className="mono" rows={4} spellCheck={false}
                placeholder={autoTidy ? 'd r m f s l t d\'  (colons and bar lines are added when you leave the box)' : 'd :r :m | f :- :- | …'}
                value={p.notes}
                onFocus={() => { lastArea.current = { id: p.id, field: 'notes' }; }}
                onBlur={() => { if (autoTidy) tidy({ ...p, notes: p.notes.trimEnd() }); }}
                onChange={e => {
                  const v = e.target.value, el = e.target;
                  // Typing at the end: tidy as soon as a pulse is finished with a space, keeping the caret at the end.
                  if (autoTidy && v.endsWith(' ') && el.selectionStart === v.length && v.trim()) {
                    const t = tidyNotes(v, score.timeNum, score.timeDen, score.marks, score.pickup) + ' ';
                    setPart(p.id, { notes: t });
                    requestAnimationFrame(() => el.setSelectionRange(t.length, t.length));
                  } else setPart(p.id, { notes: v });
                }} />
              <textarea className="lyrics-input" rows={2} spellCheck={false}
                placeholder="Lyrics, e.g. Al-le-lu-ia | A-men" value={p.lyrics} onChange={e => setPart(p.id, { lyrics: e.target.value })} />
              </>}
            </div>
          );
        })}
        <button onClick={addPart}>+ Add part</button>
      </section>

      <MarksCard score={score} selectedBar={selectedBar} onChange={m => set('marks', m)} />

      <BlocksCard score={score} selectedBar={selectedBar} barCount={analysis.barCount} onChange={onChange} />

      <section className="card">
        <h2>Footer</h2>
        <input className="full" value={score.footer} placeholder="e.g. Composed 2021. © …" onChange={e => set('footer', e.target.value)} />
      </section>
    </div>
  );
});

function MarksCard({ score, selectedBar, onChange }: { score: ScoreDoc; selectedBar: number | null; onChange: (m: string) => void }) {
  const [text, setText] = useState('');
  const [reh, setReh] = useState('A');
  const [tn, setTn] = useState(3);
  const [td, setTd] = useState(4);
  const [raw, setRaw] = useState(false);
  const [metro, setMetro] = useState(score.bpm);
  const textRef = useRef<HTMLInputElement>(null);
  const bar = selectedBar;
  const current = bar === null ? [] : marksForBar(score.marks, bar);
  const add = (token: string) => { if (bar !== null && token.trim()) onChange(addMark(score.marks, bar, token.trim())); };
  const wrap = (mark: string) => {
    const el = textRef.current;
    if (!el) return;
    const s = el.selectionStart ?? 0, e = el.selectionEnd ?? s;
    setText(text.slice(0, s) + mark + text.slice(s, e) + mark + text.slice(e));
  };
  const nextLetter = (l: string) => (/^[A-Y]$/.test(l) ? String.fromCharCode(l.charCodeAt(0) + 1) : l);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Bar marks</h2>
        <button className="link" onClick={() => setRaw(r => !r)}>{raw ? 'Hide text' : 'Edit as text'}</button>
      </div>
      {bar === null ? (
        <p className="hint">Click a bar in the sheet to add dynamics, jumps, repeats, rehearsal marks, time changes or text to it.</p>
      ) : (
        <>
          <div className="mark-current">
            <b>Bar {bar + 1}:</b>
            {current.length === 0 && <span className="hint">no marks yet</span>}
            {current.map((m, i) => (
              <span key={i} className={`chip chip-${classify(m).kind}`}>
                {m}<button aria-label={`Remove ${m}`} onClick={() => onChange(removeMark(score.marks, bar, i))}>✕</button>
              </span>
            ))}
          </div>
          <div className="mark-group"><span>Dynamics</span>
            {DYNAMIC_MARKS.map(d => <button key={d} className="dyn" onClick={() => add(d)}>{d}</button>)}
          </div>
          <div className="mark-group"><span>Jumps</span>
            {JUMP_MARKS.map(j => <button key={j} onClick={() => add(j)}>{j === 'segno' ? '𝄋 Segno' : j === 'coda' ? '𝄌 Coda' : j}</button>)}
          </div>
          <div className="mark-group"><span>Repeats</span>
            <button onClick={() => add('repeat start')}>𝄆 Start repeat</button>
            <button onClick={() => add('repeat end')}>𝄇 End repeat</button>
          </div>
          <div className="mark-group"><span>Tempo</span>
            {TEMPO_MARKS.map(t => <button key={t} className="dyn" onClick={() => add(t)}>{t}</button>)}
            <span className="metro-add">♩ =
              <input type="number" min={20} max={300} value={metro} onChange={e => setMetro(Number(e.target.value))} aria-label="Pulses per minute" />
              <button data-tip="Speed from this bar on (pulses per minute); playback follows it" onClick={() => add(`= ${metro}`)}>Set</button>
            </span>
          </div>
          <div className="mark-group"><span>Time change</span>
            <input type="number" min={1} max={12} value={tn} onChange={e => setTn(Number(e.target.value))} aria-label="Beats" />
            /
            <select value={td} onChange={e => setTd(Number(e.target.value))} aria-label="Beat type">
              {[2, 4, 8, 16].map(d => <option key={d}>{d}</option>)}
            </select>
            <button onClick={() => add(`${tn}/${td}`)}>Set from this bar</button>
          </div>
          <div className="mark-group"><span>Rehearsal</span>
            <input value={reh} onChange={e => setReh(e.target.value)} aria-label="Rehearsal mark" style={{ width: 52 }} />
            <button onClick={() => { add(`#${reh}`); setReh(nextLetter(reh)); }}>Add box</button>
          </div>
          <div className="mark-group"><span>Text</span>
            <input ref={textRef} value={text} onChange={e => setText(e.target.value)} placeholder="e.g. FIRST TIME, dolce, Solo"
              onKeyDown={e => { if (e.key === 'Enter') { add(`"${text.replace(/"/g, '')}"`); setText(''); } }} />
            <button title="Bold (wrap selection in **)" onClick={() => wrap('**')}><b>B</b></button>
            <button title="Italic (wrap selection in *)" onClick={() => wrap('*')}><i>I</i></button>
            <button onClick={() => { add(`"${text.replace(/"/g, '')}"`); setText(''); }}>Add text</button>
            <button onClick={() => { add(`[${text.replace(/[[\]]/g, '')}]`); setText(''); }} title="Black label, e.g. FIRST TIME">Add label</button>
          </div>
        </>
      )}
      {raw && (
        <>
          <p className="hint">One entry per bar, separated by <code>|</code>; several marks in a bar separated by commas.</p>
          <textarea className="mono" rows={3} spellCheck={false} value={score.marks} onChange={e => onChange(e.target.value)} />
        </>
      )}
    </section>
  );
}

/** Section boxes (a new rectangle with a heading, e.g. Refrain) and text blocks (e.g. further verses). */
function BlocksCard({ score, selectedBar, barCount, onChange }: {
  score: ScoreDoc; selectedBar: number | null; barCount: number; onChange: (s: ScoreDoc) => void;
}) {
  const sections = score.sections ?? [];
  const texts = score.texts ?? [];
  const at = selectedBar ?? 0;
  const setSections = (list: ScoreDoc['sections']) => onChange({ ...score, sections: list });
  const setTexts = (list: TextBlock[]) => onChange({ ...score, texts: list });
  const barInput = (value: number, onSet: (n: number) => void, allowEnd = false) => (
    <select value={value >= barCount && allowEnd ? 'end' : value} onChange={e => onSet(e.target.value === 'end' ? 9999 : Number(e.target.value))} aria-label="Position">
      {Array.from({ length: Math.max(barCount, 1) }, (_, b) => <option key={b} value={b}>before bar {b + 1}</option>)}
      {allowEnd && <option value="end">at the end</option>}
    </select>
  );
  return (
    <section className="card">
      <h2>Boxes &amp; text blocks</h2>
      <p className="hint">Start a separate rectangle wherever the music changes section (a refrain, verse, coda), and add blocks of text, e.g. more verses sung to the same melody.</p>
      {sections.map(sec => (
        <div className="block-row" key={sec.id}>
          <span className="block-kind">Box</span>
          {barInput(sec.bar, n => setSections(sections.map(x => (x.id === sec.id ? { ...x, bar: n } : x))))}
          <input value={sec.title} placeholder="Heading, e.g. Refrain" onChange={e => setSections(sections.map(x => (x.id === sec.id ? { ...x, title: e.target.value } : x)))} />
          <button className="icon" data-tip="Remove this box break" onClick={() => setSections(sections.filter(x => x.id !== sec.id))}>✕</button>
        </div>
      ))}
      {texts.map(t => (
        <div className="block-row text" key={t.id}>
          <div className="block-row-head">
            <span className="block-kind">Text</span>
            {barInput(t.bar, n => setTexts(texts.map(x => (x.id === t.id ? { ...x, bar: n } : x))), true)}
            <input value={t.title} placeholder="Heading, e.g. Verse 2" onChange={e => setTexts(texts.map(x => (x.id === t.id ? { ...x, title: e.target.value } : x)))} />
            <button className="icon" data-tip="Remove this text block" onClick={() => setTexts(texts.filter(x => x.id !== t.id))}>✕</button>
          </div>
          <textarea rows={4} value={t.body} placeholder={'Lines of text. Leave a blank line between verses.\n**bold** and *italic* work too.'}
            onChange={e => setTexts(texts.map(x => (x.id === t.id ? { ...x, body: e.target.value } : x)))} />
        </div>
      ))}
      <div className="block-add">
        <button onClick={() => setSections([...sections, { id: newId(), bar: at, title: '' }])}
          data-tip="Begin a new rectangle at the selected bar">+ New box at bar {at + 1}</button>
        <button onClick={() => setTexts([...texts, { id: newId(), bar: 9999, title: 'Verse 2', body: '' }])}
          data-tip="A block of text after the music (change its position afterwards)">+ Text block</button>
      </div>
    </section>
  );
}

function RemoveButton({ onConfirm }: { onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className="icon" title="Remove part" onClick={() => setAsk(true)}>✕</button>;
  return (
    <span className="confirm">Remove?
      <button className="danger" onClick={onConfirm}>Yes</button>
      <button onClick={() => setAsk(false)}>No</button>
    </span>
  );
}

function Help() {
  return (
    <div className="help">
      <table>
        <tbody>
          <tr><td><code>d r m f s l t</code></td><td>notes; chromatic: <code>de ra re ma fe ba se lo le ta</code></td></tr>
          <tr><td><code>d r m</code></td><td>with “Add colons” on, separate pulses with spaces; colons and bar lines are added for the time signature</td></tr>
          <tr><td><code>|</code> <code>:</code> <code>/</code></td><td>bar line, pulse division, medium accent (placed automatically)</td></tr>
          <tr><td><code>d'</code> <code>l1</code></td><td>octave up (d¹) / down (l₁); <code>l2</code> two octaves down</td></tr>
          <tr><td><code>-</code></td><td>hold the previous note</td></tr>
          <tr><td>empty pulse</td><td>rest: leave the pulse blank, e.g. <code>d : :m</code></td></tr>
          <tr><td><code>d.r</code> <code>d.,r</code> <code>d,r.m,f</code></td><td>halves; ¾ + ¼; quarters</td></tr>
          <tr><td><code>d;r;m</code></td><td>triplet (three notes in one pulse)</td></tr>
          <tr><td><code>&gt;d ^d !d ~d *d</code></td><td>accent, marcato, staccato, tenuto, fermata</td></tr>
          <tr><td><code>(m.m :r)</code></td><td>slur</td></tr>
        </tbody>
      </table>
      <p>Men’s parts (tenor, bass) are written at the same letters as the women’s and sound an octave lower.</p>
      <p><b>Lyrics:</b> hyphenate words (<code>A-men</code>); each syllable goes to the next note that starts. Use <code>_</code> for a note that keeps the previous syllable. Add <code>|</code> to match lyrics bar by bar.</p>
    </div>
  );
}
