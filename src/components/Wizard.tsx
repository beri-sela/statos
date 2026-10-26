import logo from '../assets/logo.svg';
import { useRef, useState } from 'react';
import { DEFAULT_STYLE, type PartDoc, type ScoreDoc, type SheetStyle, type VoiceType } from '../music/types';
import { EXAMPLES } from '../examples';
import { href } from '../router';
import { blankScore, exampleCopy } from '../storage';
import { KEYS, TIMES, keyLabel } from './Editor';

const VOICINGS: { id: string; label: string; parts: [string, VoiceType][] }[] = [
  { id: 'satb', label: 'SATB choir', parts: [['Soprano', 'S'], ['Alto', 'A'], ['Tenor', 'T'], ['Bass', 'B']] },
  { id: 'sab', label: 'SAB', parts: [['Soprano', 'S'], ['Alto', 'A'], ['Baritone', 'B']] },
  { id: 'sa', label: 'SA (two upper voices)', parts: [['Soprano', 'S'], ['Alto', 'A']] },
  { id: 'ttbb', label: 'TTBB (male choir)', parts: [['Tenor 1', 'T'], ['Tenor 2', 'T'], ['Bass 1', 'B'], ['Bass 2', 'B']] },
  { id: 'unison', label: 'Melody / unison', parts: [['Melody', 'S']] },
];

type Step = 'start' | 'details' | 'import';

interface Props {
  initialStep?: Step;
  onCreate: (s: ScoreDoc) => void;
  onImport: (f: File) => void;
  /** Omitted in welcome mode (no scores yet): the wizard is the whole screen and cannot be dismissed. */
  onClose?: () => void;
}

/** Guides the user through starting a score: type a new one, or import a file. */
export function Wizard({ initialStep = 'start', onCreate, onImport, onClose }: Props) {
  const welcome = !onClose;
  const [step, setStep] = useState<Step>(initialStep);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [composer, setComposer] = useState('');
  const [doh, setDoh] = useState('C');
  const [mode, setMode] = useState<'major' | 'minor'>('major');
  const [time, setTime] = useState('4/4');
  const [customN, setCustomN] = useState(5);
  const [customD, setCustomD] = useState(4);
  const [pickup, setPickup] = useState(false);
  const [tempoText, setTempoText] = useState('');
  const [bpm, setBpm] = useState(90);
  const [voicing, setVoicing] = useState('satb');
  const [layout, setLayout] = useState<SheetStyle['layout']>('bar');
  const file = useRef<HTMLInputElement>(null);

  const create = () => {
    const [n, d] = time === 'custom' ? [customN, customD] : time.split('/').map(Number);
    const v = VOICINGS.find(x => x.id === voicing)!;
    const parts: PartDoc[] = v.parts.map(([name, voice], i) => ({ id: `p${i + 1}`, name, voice, notes: '', lyrics: '' }));
    onCreate({
      ...blankScore(), title: title.trim() || 'Untitled', subtitle, composer, doh, mode, timeNum: n, timeDen: d,
      pickup, tempoText, bpm, parts, barsPerRow: 0, style: { ...DEFAULT_STYLE, layout },
    });
  };

  return (
    <div className={`wizard-backdrop${welcome ? ' welcome' : ''}`} role="dialog" aria-modal="true" aria-label="Start a score">
      <div className="wizard">
        {welcome && step === 'start' && (
          <div className="welcome-hero">
            <img src={logo} alt="" width={64} height={64} />
            <h1>Welcome to Statos</h1>
            <p>Write tonic sol-fa in the familiar boxed layout, check it as you type, hear it, and turn it into staff notation. Free, no account, and your music stays on your device.</p>
          </div>
        )}
        <div className="wizard-head">
          <h2>{step === 'start' ? (welcome ? 'How would you like to start?' : 'Start a score') : step === 'details' ? 'New score' : 'Import a score'}</h2>
          {onClose && <button className="icon" onClick={onClose} aria-label="Close">✕</button>}
        </div>

        {step === 'start' && (
          <div className="choices">
            <button className="choice" onClick={() => setStep('details')}>
              <b>Type a new score</b><span>Choose key, time signature and voices, then type the sol-fa.</span>
            </button>
            <button className="choice" onClick={() => setStep('import')}>
              <b>Import a file</b><span>MusicXML from MuseScore, Sibelius, Finale or Dorico (converted to sol-fa), or a saved Statos file.</span>
            </button>
            <div className="choice examples">
              <b>Open an example</b><span>See how a finished score looks, then change it or play it.</span>
              <div className="example-list">
                {EXAMPLES.map(ex => (
                  <button key={ex.id} onClick={() => { const c = exampleCopy(ex.id); if (c) onCreate(c); }}>
                    {ex.title}<small>{ex.composer.replace(/^'Messiah' /, '')}</small>
                  </button>
                ))}
              </div>
            </div>
            <a className="choice" href={href('help/first-score')}>
              <b>Learn how it works</b><span>Short lessons: your first score in two minutes, typing notes, lyrics, marks and more.</span>
            </a>
            <button className="choice" disabled>
              <b>Read a scan or photo</b><span>Coming with the Statos browser extension (AI reading of PDFs and images).</span>
            </button>
          </div>
        )}
        {welcome && step === 'start' && (
          <p className="welcome-links">
            <a href={href('about')}>About</a> · <a href={href('help')}>Help</a> · <a href={href('privacy')}>Privacy</a> · <a href={href('terms')}>Terms</a>
          </p>
        )}

        {step === 'details' && (
          <>
            <div className="fields">
              <label className="wide">Title<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Alleluia Amen" /></label>
              <label className="wide">Subtitle<input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. cf Jn 17:17" /></label>
              <label className="wide">Composer / arranger<input value={composer} onChange={e => setComposer(e.target.value)} /></label>
              <label>Doh is
                <select value={doh} onChange={e => setDoh(e.target.value)}>
                  {KEYS.map(k => <option key={k} value={k}>{keyLabel(k)}</option>)}
                </select>
              </label>
              <label>Mode
                <select value={mode} onChange={e => setMode(e.target.value as 'major' | 'minor')}>
                  <option value="major">major</option>
                  <option value="minor">minor (lah-mode)</option>
                </select>
              </label>
            </div>
            <div className="field-block">
              <span className="field-title">Time signature</span>
              <div className="time-pick">
                {TIMES.map(([n, d]) => (
                  <button key={`${n}/${d}`} className={time === `${n}/${d}` ? 'on' : ''} onClick={() => setTime(`${n}/${d}`)}>
                    <span className="frac"><span>{n}</span><span>{d}</span></span>
                  </button>
                ))}
                <button className={time === 'custom' ? 'on' : ''} onClick={() => setTime('custom')}>Other…</button>
              </div>
              {time === 'custom' && (
                <div className="custom-time">
                  <input type="number" min={1} max={12} value={customN} onChange={e => setCustomN(Number(e.target.value))} aria-label="Beats per bar" />
                  /
                  <select value={customD} onChange={e => setCustomD(Number(e.target.value))} aria-label="Beat type">
                    {[2, 4, 8, 16].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <p className="hint">The time signature can change later in the piece: select a bar and use “Time change”.</p>
              <label className="check"><input type="checkbox" checked={pickup} onChange={e => setPickup(e.target.checked)} />Starts with a pick-up (shorter first bar)</label>
            </div>
            <div className="fields">
              <label>Tempo marking<input value={tempoText} onChange={e => setTempoText(e.target.value)} placeholder="e.g. Lively" /></label>
              <label>Speed (pulses/min)<input type="number" min={30} max={240} value={bpm} onChange={e => setBpm(Number(e.target.value) || 90)} /></label>
              <label className="wide">Voices
                <select value={voicing} onChange={e => setVoicing(e.target.value)}>
                  {VOICINGS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
              <label className="wide">Boxes
                <select value={layout} onChange={e => setLayout(e.target.value as SheetStyle['layout'])}>
                  <option value="bar">One box per bar (all parts inside)</option>
                  <option value="lines">Separate box for each part’s line</option>
                </select>
              </label>
            </div>
            <div className="wizard-foot">
              <button onClick={() => setStep('start')}>Back</button>
              <button className="primary" onClick={create}>Create score</button>
            </div>
          </>
        )}

        {step === 'import' && (
          <>
            <p>Choose a <b>MusicXML</b> file (<code>.musicxml</code> or <code>.xml</code>) exported from a notation program, or a <b>Statos</b> file (<code>.json</code>).</p>
            <p className="hint">In MuseScore: File → Export → MusicXML, and choose <i>uncompressed</i>. Each staff voice becomes a sol-fa part; check the result against the original.</p>
            <input ref={file} type="file" accept=".json,.musicxml,.xml,.mxl"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onImport(f); onClose?.(); } }} />
            <div className="wizard-foot">
              <button onClick={() => setStep('start')}>Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
