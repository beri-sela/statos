import { EXAMPLES } from './examples';
import type { ScoreDoc } from './music/types';

const KEY = 'statos.scores.v1';
/** Scores saved before the app was renamed from Statoso. */
const LEGACY_KEYS = ['statoso.scores.v1'];
const CURRENT = 'statos.current.v1';

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function blankScore(): ScoreDoc {
  return {
    id: newId(), title: 'Untitled', subtitle: '', composer: '', doh: 'C', mode: 'major',
    timeNum: 4, timeDen: 4, tempoText: '', bpm: 90, barsPerRow: 4, pickup: false,
    parts: [
      { id: 'p1', name: 'Soprano', voice: 'S', notes: '', lyrics: '' },
      { id: 'p2', name: 'Alto', voice: 'A', notes: '', lyrics: '' },
      { id: 'p3', name: 'Tenor', voice: 'T', notes: '', lyrics: '' },
      { id: 'p4', name: 'Bass', voice: 'B', notes: '', lyrics: '' },
    ],
    marks: '', footer: '', updatedAt: Date.now(),
  };
}

/** Loads saved scores; on first run (or if storage is unavailable) starts with the examples. */
export function loadScores(): ScoreDoc[] {
  try {
    const raw = localStorage.getItem(KEY) ?? LEGACY_KEYS.map(k => localStorage.getItem(k)).find(Boolean) ?? null;
    if (raw) {
      const list = JSON.parse(raw) as ScoreDoc[];
      if (Array.isArray(list) && list.length) return list;
    }
  } catch { /* storage blocked or corrupt: fall through */ }
  return EXAMPLES.map(s => ({ ...s, updatedAt: Date.now() }));
}

export function saveScores(list: ScoreDoc[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function loadCurrentId(): string | null {
  try { return localStorage.getItem(CURRENT); } catch { return null; }
}

export function saveCurrentId(id: string) {
  try { localStorage.setItem(CURRENT, id); } catch { /* ignore */ }
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFileName = (s: string) => (s.trim() || 'score').replace(/[\\/:*?"<>|]+/g, '-');

/** Checks that an uploaded JSON file looks like a Statos score (or a list of them). */
export function parseScoreFile(text: string): ScoreDoc[] {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : [data];
  for (const s of list) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.parts) || typeof s.title !== 'string') {
      throw new Error('This JSON file is not a Statos score.');
    }
  }
  return list.map(s => ({ ...blankScore(), ...s, id: newId(), updatedAt: Date.now() }));
}
