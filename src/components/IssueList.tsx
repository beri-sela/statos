import { useState } from 'react';
import type { Issue, ScoreDoc } from '../music/types';

const CATEGORY_LABEL: Record<Issue['category'], string> = {
  syntax: 'Notation', rhythm: 'Rhythm', structure: 'Structure', lyrics: 'Lyrics',
  range: 'Range', voicing: 'Voicing', parallels: 'Parallels',
};
/** Style checks that experienced writers may break on purpose; they can be hidden. */
const OPTIONAL: Issue['category'][] = ['range', 'voicing', 'parallels'];

interface Props {
  issues: Issue[];
  score: ScoreDoc;
  hidden: Set<Issue['category']>;
  onToggle: (c: Issue['category']) => void;
  onPick: (issue: Issue) => void;
}

export function IssueList({ issues, score, hidden, onToggle, onPick }: Props) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 760);
  const shown = issues.filter(i => !hidden.has(i.category));
  const errors = shown.filter(i => i.severity === 'error').length;
  const warnings = shown.length - errors;
  const partName = (id?: string) => score.parts.find(p => p.id === id)?.name;

  return (
    <div className={`issues ${errors ? 'bad' : warnings ? 'warn' : 'ok'}`}>
      <button className="issues-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{errors === 0 && warnings === 0 ? '✓ No problems found'
          : `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          <div className="issue-filters">
            Style checks:
            {OPTIONAL.map(c => (
              <label key={c}><input type="checkbox" checked={!hidden.has(c)} onChange={() => onToggle(c)} />{CATEGORY_LABEL[c]}</label>
            ))}
          </div>
          {shown.length > 0 && (
            <ul>
              {shown.map((i, k) => (
                <li key={k} className={i.severity}>
                  <button onClick={() => onPick(i)}>
                    <span className="tag">{CATEGORY_LABEL[i.category]}</span>
                    {i.bar !== undefined && <b>Bar {i.bar + 1}</b>}
                    {partName(i.partId) && <span className="who">{partName(i.partId)}</span>}
                    <span className="msg">{i.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
