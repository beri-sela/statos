import logo from './assets/logo.svg';
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type EditorHandle } from './components/Editor';
import { IssueList } from './components/IssueList';
import { Menu } from './components/Menu';
import { PrintStyle } from './components/PrintStyle';
import { SolfaView, type Cursor } from './components/SolfaView';
import { Wizard } from './components/Wizard';
import { HelpPage } from './help/HelpPage';
import { AboutPage, PrivacyPage, TermsPage } from './pages/InfoPages';
import { href, navigate, useRoute } from './router';
import { analyzeScore } from './music/analyze';
import { setLyricBar, setPulse } from './music/edit';
import { barTimes, parseMarks } from './music/marks';
import { fromMusicXML, toMusicXML } from './music/musicxml';
import { play, type Player } from './music/playback';
import type { Issue, ScoreDoc } from './music/types';
import {
  blankScore, downloadFile, loadCurrentId, loadScores, newId, parseScoreFile, safeFileName,
  saveCurrentId, saveScores,
} from './storage';

const PLACEHOLDER = blankScore();

/** Small per-browser preferences (layout, options); storage may be unavailable. */
function pref(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function savePref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

// The staff renderer is large; load it only when the staff view is first opened.
const StaffView = lazy(() => import('./components/StaffView').then(m => ({ default: m.StaffView })));

type View = 'solfa' | 'staff' | 'both';
interface Notice { kind: 'info' | 'error'; text: string; details?: string[] }

export function App() {
  const [scores, setScores] = useState<ScoreDoc[]>(loadScores);
  const [currentId, setCurrentId] = useState<string>(() => {
    const id = loadCurrentId();
    return id && scores.some(s => s.id === id) ? id : scores[0]?.id ?? '';
  });
  const [view, setView] = useState<View>('solfa');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [playingBar, setPlayingBar] = useState(-1);
  const [hidden, setHidden] = useState<Set<Issue['category']>>(() => new Set(['parallels']));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saved, setSaved] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [wizard, setWizard] = useState<null | 'start' | 'import'>(null);
  const [autoTidy, setAutoTidy] = useState(() => {
    return pref('statos.autoTidy', '1') !== '0';
  });
  const [cursor, setCursor] = useState<Cursor | null>(null);
  // Which pane is shown on phones (desktop shows editor and sheet side by side).
  const [pane, setPane] = useState<'edit' | 'sheet' | 'staff'>('sheet');
  const route = useRoute();
  const [sideHidden, setSideHidden] = useState(() => pref('statos.sideHidden', '0') === '1');
  const [sideWidth, setSideWidth] = useState(() => Number(pref('statos.sideWidth', '400')) || 400);
  const player = useRef<Player | null>(null);
  const editor = useRef<EditorHandle>(null);
  // Undo history for the open score. Rapid edits of the same kind are grouped into one step.
  const history = useRef({ id: '', past: [] as ScoreDoc[], future: [] as ScoreDoc[], lastPush: 0, lastKey: '' });
  const [, setHistoryVersion] = useState(0);

  // With no scores the welcome wizard is shown; the placeholder keeps the hooks below simple.
  const score = scores.find(s => s.id === currentId) ?? scores[0] ?? PLACEHOLDER;
  const analysis = useMemo(() => analyzeScore(score), [score]);
  const visible = useMemo(() => ({ ...analysis, issues: analysis.issues.filter(i => !hidden.has(i.category)) }), [analysis, hidden]);
  const xml = useMemo(() => (view === 'solfa' ? '' : toMusicXML(score, analysis)), [view, score, analysis]);
  // Playback reads this on every step, so edits and speed changes are heard while playing.
  const live = useRef({ analysis, bpm: score.bpm, muted: new Set<string>() });
  live.current = { analysis, bpm: score.bpm, muted: live.current.muted };
  if (history.current.id !== score.id) history.current = { id: score.id, past: [], future: [], lastPush: 0, lastKey: '' };

  // Autosave shortly after each change.
  useEffect(() => {
    const t = window.setTimeout(() => setSaved(saveScores(scores)), 400);
    return () => window.clearTimeout(t);
  }, [scores]);
  useEffect(() => saveCurrentId(currentId), [currentId]);
  useEffect(() => { savePref('statos.autoTidy', autoTidy ? '1' : '0'); }, [autoTidy]);
  useEffect(() => () => player.current?.stop(), []);
  useEffect(() => { savePref('statos.sideHidden', sideHidden ? '1' : '0'); }, [sideHidden]);
  useEffect(() => { savePref('statos.sideWidth', String(Math.round(sideWidth))); }, [sideWidth]);
  // F1, or ? outside a text field, opens Help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '');
      if (e.key === 'F1' || (e.key === '?' && !typing)) { e.preventDefault(); navigate('help'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const replace = (s: ScoreDoc) => setScores(list => list.map(x => (x.id === s.id ? s : x)));
  const update = (s: ScoreDoc, key = 'edit') => {
    const h = history.current;
    const now = Date.now();
    if (now - h.lastPush > 800 || key !== h.lastKey) {
      h.past.push(score);
      if (h.past.length > 300) h.past.shift();
      h.lastPush = now;
      h.lastKey = key;
    }
    h.future = [];
    setHistoryVersion(v => v + 1);
    replace({ ...s, updatedAt: now });
  };
  const undo = () => {
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(score); h.lastKey = '';
    setHistoryVersion(v => v + 1);
    replace(prev);
  };
  const redo = () => {
    const h = history.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(score); h.lastKey = '';
    setHistoryVersion(v => v + 1);
    replace(next);
  };
  const undoRef = useRef({ undo, redo });
  undoRef.current = { undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current.undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); undoRef.current.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pulsesInBar = (b: number) => {
    if (b === 0 && score.pickup) {
      const first = analysis.parts.find(p => p.bars[0])?.bars[0];
      if (first) return first.pulses.length;
    }
    return barTimes(parseMarks(score.marks), b + 1, score.timeNum, score.timeDen)[b].num;
  };
  const editPulse = (partId: string, bar: number, pulse: number, content: string) => {
    update({
      ...score,
      parts: score.parts.map(p => (p.id === partId ? { ...p, notes: setPulse(p.notes, bar, pulse, content, pulsesInBar) } : p)),
    }, `pulse:${partId}:${bar}:${pulse}`);
  };
  const editLyric = (partId: string, bar: number, text: string) => {
    const ap = analysis.parts.find(p => p.doc.id === partId);
    if (!ap) return;
    update({
      ...score,
      parts: score.parts.map(p => (p.id === partId ? { ...p, lyrics: setLyricBar(ap, analysis.barCount, bar, text) } : p)),
    }, `lyric:${partId}:${bar}`);
  };
  const addScores = (list: ScoreDoc[]) => {
    setScores(prev => [...list, ...prev]);
    setCurrentId(list[0].id);
    setSelectedBar(null);
  };
  const switchTo = (id: string) => { stop(); setCurrentId(id); setSelectedBar(null); setCursor(null); setConfirmDelete(false); };

  const stop = () => { player.current?.stop(); player.current = null; };
  const togglePlay = () => {
    if (player.current) { stop(); return; }
    player.current = play({ get: () => live.current }, b => {
      setPlayingBar(b);
      if (b < 0) player.current = null;
    }, selectedBar ?? 0);
  };

  const pickBar = (bar: number, partId?: string) => {
    setSelectedBar(bar);
    editor.current?.focusBar(partId ?? score.parts[0]?.id, bar);
    document.querySelector(`[data-bar="${bar}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name)) {
        const list = parseScoreFile(text);
        addScores(list);
        setNotice({ kind: 'info', text: `Imported ${list.length === 1 ? `“${list[0].title}”` : `${list.length} scores`}.` });
      } else if (/\.mxl$/i.test(file.name)) {
        throw new Error('Compressed .mxl files are not supported yet. In MuseScore use File → Export → MusicXML and choose “Uncompressed”.');
      } else {
        const { score: s, warnings } = fromMusicXML(text);
        const doc: ScoreDoc = { ...s, id: newId(), updatedAt: Date.now() };
        addScores([doc]);
        setNotice({
          kind: 'info',
          text: `Converted “${doc.title}” from staff notation to sol-fa (${doc.parts.length} parts). Check it against the original.`,
          details: warnings,
        });
      }
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const errors = analysis.issues.filter(i => i.severity === 'error').length;
  const saveJson = () => downloadFile(`${safeFileName(score.title)}.statos.json`, JSON.stringify(score, null, 2), 'application/json');
  const saveXml = () => downloadFile(`${safeFileName(score.title)}.musicxml`, toMusicXML(score, analysis), 'application/vnd.recordare.musicxml+xml');
  const deleteScore = () => {
    const rest = scores.filter(s => s.id !== score.id);
    setScores(rest);
    switchTo(rest[0]?.id ?? '');
  };
  const showView = (v: View) => { setView(v); setPane(v === 'staff' ? 'staff' : 'sheet'); };
  const setSpeed = (n: number) => update({ ...score, bpm: Math.min(300, Math.max(20, Math.round(n) || score.bpm)) }, 'bpm');
  const hasTempoMarks = analysis.marks.some(list => list.some(m => m.kind === 'metronome'));

  // Drag the divider between the side panel and the music to resize the panel.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX, startW = sideWidth;
    const move = (ev: PointerEvent) => setSideWidth(Math.min(Math.max(260, startW + ev.clientX - startX), window.innerWidth * 0.6));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('resizing'); };
    document.body.classList.add('resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const sheet = (
    <SolfaView score={score} analysis={visible} selectedBar={selectedBar} playingBar={playingBar}
      onSelectBar={b => setSelectedBar(b)} cursor={cursor} onCursor={c => { setCursor(c); if (c) setSelectedBar(c.bar); }}
      onEditPulse={editPulse} onEditLyric={editLyric} />
  );
  const staff = <Suspense fallback={<p className="hint">Loading staff notation…</p>}><StaffView xml={xml} /></Suspense>;

  const noticeBox = notice && (
    <div className={`notice ${notice.kind}`}>
      <div>
        {notice.text}
        {notice.details?.length ? <ul>{notice.details.map((d, i) => <li key={i}>{d}</li>)}</ul> : null}
      </div>
      <button className="icon" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
    </div>
  );

  switch (route[0]) {
    case 'help':
      return <HelpPage lessonId={route[1]} onAction={a => { navigate(''); setWizard(a === 'import' ? 'import' : 'start'); }} />;
    case 'about': return <AboutPage />;
    case 'privacy': return <PrivacyPage />;
    case 'terms': return <TermsPage />;
  }

  if (!scores.length) {
    return (
      <div className="welcome-screen">
        {noticeBox}
        <Wizard initialStep={wizard === 'import' ? 'import' : 'start'} onImport={onImport} onCreate={s => { addScores([s]); setWizard(null); }} />
      </div>
    );
  }

  return (
    <div className="app">
      <PrintStyle score={score} />
      <header className="toolbar">
        <button className="icon-btn panel-toggle desktop-only" onClick={() => setSideHidden(h => !h)} aria-pressed={!sideHidden}
          data-tip={sideHidden ? 'Show the side panel' : 'Hide the side panel'} aria-label="Toggle side panel">{sideHidden ? '⇥' : '⇤'}</button>
        <span className="brand"><img src={logo} alt="" width={24} height={24} />Statos</span>
        <select className="score-pick" value={score.id} onChange={e => switchTo(e.target.value)} aria-label="Open score" data-tip="Switch score">
          {scores.map(s => <option key={s.id} value={s.id}>{s.title || 'Untitled'}</option>)}
        </select>
        <div className="actions" role="group" aria-label="File">
          <button className="act" onClick={() => setWizard('start')} data-tip="Start a new score (wizard)"><span aria-hidden>＋</span>New</button>
          <button className="act" onClick={() => setWizard('import')} data-tip="Open MusicXML or a Statos file"><span aria-hidden>⇪</span>Import</button>
          <button className="act" onClick={saveJson} data-tip="Download a .statos.json file (backup / share)"><span aria-hidden>⇩</span>Save</button>
          <button className="act" onClick={saveXml} data-tip="Download MusicXML for MuseScore, Sibelius…"><span aria-hidden>♫</span>MusicXML</button>
          <button className="act" onClick={() => window.print()} data-tip="Print the music"><span aria-hidden>⎙</span>Print</button>
          <Menu label={<><span aria-hidden>⋯</span>More</>} title="Duplicate or delete this score" items={[
            { icon: '⧉', label: 'Duplicate score', onSelect: () => addScores([{ ...structuredClone(score), id: newId(), title: `${score.title} (copy)`, updatedAt: Date.now() }]) },
            { icon: '✕', label: 'Delete score…', danger: true, onSelect: () => setConfirmDelete(true) },
          ]} />
        </div>
        <span className="sep-v desktop-only" />
        <button className="icon-btn" onClick={undo} disabled={!history.current.past.length} data-tip="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
        <button className="icon-btn" onClick={redo} disabled={!history.current.future.length} data-tip="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
        <div className="seg desktop-only" role="group" aria-label="View">
          {(['solfa', 'staff', 'both'] as View[]).map(v => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}
              data-tip={v === 'solfa' ? 'Boxed tonic sol-fa' : v === 'staff' ? 'Staff notation' : 'Sol-fa and staff side by side'}>
              {v === 'solfa' ? 'Sol-fa' : v === 'staff' ? 'Staff' : 'Both'}
            </button>
          ))}
        </div>
        <div className="transport" role="group" aria-label="Playback">
          <button className="play" onClick={togglePlay} disabled={!analysis.barCount}
            data-tip={playingBar >= 0 ? 'Stop' : selectedBar !== null ? `Play from bar ${selectedBar + 1}` : 'Play from the start'}
            aria-label={playingBar >= 0 ? 'Stop' : 'Play'}>
            {playingBar >= 0 ? '■' : '▶'}<span className="play-label">{playingBar >= 0 ? ' Stop' : selectedBar !== null ? ` Bar ${selectedBar + 1}` : ' Play'}</span>
          </button>
          <label className="tempo" data-tip={hasTempoMarks ? 'Starting speed; ♩ = marks in the music change it later' : 'Speed in pulses per minute; changes apply while playing'}>
            <span aria-hidden>♩ =</span>
            <button className="step" onClick={() => setSpeed(score.bpm - 5)} aria-label="Slower">−</button>
            <input type="number" min={20} max={300} value={score.bpm} aria-label="Speed (pulses per minute)"
              onChange={e => setSpeed(Number(e.target.value))} />
            <button className="step" onClick={() => setSpeed(score.bpm + 5)} aria-label="Faster">+</button>
          </label>
        </div>
        <button className="act help-btn" onClick={() => navigate('help')} data-tip="Lessons and search (F1)"><span aria-hidden>?</span>Help</button>
        <span className={`save-state ${saved ? '' : 'bad'}`} data-tip={saved ? 'Every change is saved automatically in this browser' : undefined}>
          {saved ? '✓ Saved' : 'Not saved: browser storage is unavailable'}
        </span>
      </header>

      {noticeBox}

      <main className={`layout${sideHidden ? ' side-hidden' : ''}`} data-pane={pane} style={{ '--side-w': `${sideWidth}px` } as React.CSSProperties}>
        <aside className="editor-pane" aria-label="Score details">
          <Editor ref={editor} score={score} analysis={analysis} selectedBar={selectedBar}
            autoTidy={autoTidy} onAutoTidy={setAutoTidy} onChange={update} />
          <nav className="side-links" aria-label="Site">
            <a href={href('help')}>Help</a><a href={href('about')}>About</a><a href={href('privacy')}>Privacy</a><a href={href('terms')}>Terms</a>
          </nav>
        </aside>
        <div className="splitter" role="separator" aria-orientation="vertical" aria-label="Resize side panel"
          onPointerDown={startResize} onDoubleClick={() => setSideWidth(400)} data-tip="Drag to resize; double-click to reset" />
        <section className="preview-pane">
          <IssueList issues={analysis.issues} score={score} hidden={hidden}
            onToggle={c => setHidden(h => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n; })}
            onPick={i => (i.bar !== undefined ? pickBar(i.bar, i.partId) : i.partId && editor.current?.focusBar(i.partId, 0))} />
          {errors > 0 && view !== 'solfa' && <p className="hint">Fix the errors above for the staff notation to be accurate.</p>}
          {view === 'both' ? (
            <div className="views-split">
              <div className="view-col">{sheet}</div>
              <div className="view-col">{staff}</div>
            </div>
          ) : view === 'solfa' ? sheet : staff}
        </section>
      </main>

      <nav className="tabbar" aria-label="Sections">
        <button className={pane === 'edit' ? 'on' : ''} onClick={() => setPane('edit')}><span aria-hidden>✎</span>Details</button>
        <button className={pane === 'sheet' ? 'on' : ''} onClick={() => showView('solfa')}><span aria-hidden>▦</span>Sol-fa</button>
        <button className={pane === 'staff' ? 'on' : ''} onClick={() => showView('staff')}><span aria-hidden>♫</span>Staff</button>
        <button onClick={() => navigate('help')}><span aria-hidden>?</span>Help</button>
      </nav>

      {confirmDelete && (
        <div className="wizard-backdrop" role="alertdialog" aria-modal="true" aria-label="Delete score">
          <div className="wizard dialog">
            <h2>Delete “{score.title}”?</h2>
            <p>This removes it from this browser. Use Save first if you want a copy.</p>
            <div className="wizard-foot">
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="danger" onClick={() => { setConfirmDelete(false); deleteScore(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {wizard && (
        <Wizard initialStep={wizard} onClose={() => setWizard(null)} onImport={onImport}
          onCreate={s => { addScores([s]); setWizard(null); }} />
      )}
    </div>
  );
}
