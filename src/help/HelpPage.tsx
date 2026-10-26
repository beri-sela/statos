import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SiteLayout } from '../pages/SiteLayout';
import { href } from '../router';
import { LESSONS, type HelpAction, type Lesson } from './lessons';

interface Props {
  /** Lesson id from the address (#/help/<id>), if any. */
  lessonId?: string;
  onAction: (a: HelpAction) => void;
}

const GROUPS: Lesson['group'][] = ['Start here', 'Lessons', 'Reference'];

/** The Help page: search, grouped lessons, and previous / next navigation. Each lesson has its own address. */
export function HelpPage({ lessonId, onAction }: Props) {
  const [query, setQuery] = useState('');
  const lesson = LESSONS.find(l => l.id === lessonId) ?? LESSONS[0];
  // On phones the topic list and the lesson are shown one at a time.
  const [showList, setShowList] = useState(() => !lessonId && window.innerWidth <= 760);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => { if (window.innerWidth > 760) search.current?.focus(); }, []);
  useEffect(() => { if (lessonId) setShowList(false); }, [lessonId]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    return LESSONS
      .map(l => {
        const hay = `${l.title} ${l.summary} ${l.keywords} ${l.body}`.toLowerCase();
        if (!terms.every(t => hay.includes(t))) return null;
        const score = terms.reduce((n, t) => n + (l.title.toLowerCase().includes(t) ? 3 : 0) + (l.keywords.includes(t) ? 2 : 0) + 1, 0);
        return { l, score, snippet: snippet(l.body, terms[0]) };
      })
      .filter((x): x is { l: Lesson; score: number; snippet: string } => !!x)
      .sort((a, b) => b.score - a.score);
  }, [query]);

  const idx = LESSONS.indexOf(lesson);
  const link = (l: Lesson) => (
    <a className={l.id === lesson.id ? 'on' : ''} href={href(`help/${l.id}`)} onClick={() => setShowList(false)}
      aria-current={l.id === lesson.id ? 'page' : undefined}>
      <b>{l.title}</b><span>{l.summary}</span>
    </a>
  );

  return (
    <SiteLayout current="help" wide>
      <div className="help-top">
        <h1>Help</h1>
        <input ref={search} type="search" className="help-search" placeholder="Search help, e.g. triplet, lyrics, print"
          value={query} onChange={e => { setQuery(e.target.value); setShowList(true); }} aria-label="Search help" />
      </div>
      <div className={`help-main${showList ? ' list-open' : ''}`}>
        <nav className="help-nav" aria-label="Help topics">
          {results ? (
            results.length ? (
              <ul className="help-results">
                {results.map(({ l, snippet: s }) => <li key={l.id}>{link({ ...l, summary: s })}</li>)}
              </ul>
            ) : <p className="hint help-empty">Nothing matches “{query}”. Try another word, e.g. <i>rest</i>, <i>octave</i>, <i>repeat</i>.</p>
          ) : GROUPS.map(g => (
            <div key={g} className="help-group">
              <h3>{g}</h3>
              <ul>{LESSONS.filter(l => l.group === g).map(l => <li key={l.id}>{link(l)}</li>)}</ul>
            </div>
          ))}
        </nav>
        <article className="help-body">
          <button className="link help-back" onClick={() => setShowList(true)}>← All topics</button>
          <p className="help-crumb">{lesson.group}</p>
          <h1>{lesson.title}</h1>
          <Markup text={lesson.body} />
          {lesson.actions && (
            <div className="help-actions">
              {lesson.actions.map(a => <button key={a.action} className="primary" onClick={() => onAction(a.action)}>{a.label}</button>)}
            </div>
          )}
          <div className="help-pager">
            {idx > 0 ? <a href={href(`help/${LESSONS[idx - 1].id}`)}>← {LESSONS[idx - 1].title}</a> : <span />}
            {idx < LESSONS.length - 1 && <a href={href(`help/${LESSONS[idx + 1].id}`)}>{LESSONS[idx + 1].title} →</a>}
          </div>
        </article>
      </div>
    </SiteLayout>
  );
}

function snippet(text: string, term: string): string {
  const plain = text.replace(/[`*#[\]]/g, '').replace(/\s+/g, ' ');
  const i = plain.toLowerCase().indexOf(term);
  if (i < 0) return plain.slice(0, 90) + '…';
  const start = Math.max(0, i - 35);
  return (start > 0 ? '…' : '') + plain.slice(start, start + 100) + '…';
}

/** Renders the small help markup: headings, bullet and numbered lists, paragraphs, inline code, bold, italic, keys. */
function Markup({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('## ')) { out.push(<h2 key={k++}>{inline(line.slice(3))}</h2>); i++; continue; }
    if (/^(- |1\. )/.test(line)) {
      const ordered = line.startsWith('1. ');
      const items: string[] = [];
      while (i < lines.length && /^(- |1\. )/.test(lines[i])) { items.push(lines[i].replace(/^(- |1\. )/, '')); i++; }
      const List = ordered ? 'ol' : 'ul';
      out.push(<List key={k++}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</List>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(## |- |1\. )/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(<p key={k++}>{inline(para.join(' '))}</p>);
  }
  return <div className="markup">{out}</div>;
}

function inline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|\[\[(.+?)\]\]/g;
  let last = 0, k = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<code key={k++}>{m[1]}</code>);
    else if (m[2] !== undefined) parts.push(<b key={k++}>{inline(m[2])}</b>);
    else if (m[3] !== undefined) parts.push(<i key={k++}>{inline(m[3])}</i>);
    else parts.push(<kbd key={k++}>{m[4]}</kbd>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.map((p, j) => <Fragment key={`f${j}`}>{p}</Fragment>);
}
