import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../examples';
import { analyzeScore } from './analyze';
import { fromMusicXML, toMusicXML } from './musicxml';
import { parseLyricStream, parseNotes } from './parse';
import { blankScore } from '../storage';
import type { ScoreDoc } from './types';

const score = (over: Partial<ScoreDoc>, notes: string[], lyrics: string[] = []): ScoreDoc => ({
  ...blankScore(), ...over,
  parts: notes.map((n, i) => ({ id: `p${i}`, name: ['Soprano', 'Alto', 'Tenor', 'Bass'][i], voice: (['S', 'A', 'T', 'B'] as const)[i], notes: n, lyrics: lyrics[i] ?? '' })),
});

describe('pulse parsing', () => {
  it('reads halves, quarters and dotted rhythms', () => {
    const { bars, issues } = parseNotes('d.,r :d,r.m,f :-.m :');
    expect(issues).toEqual([]);
    const p = bars[0].pulses;
    expect(p.map(x => x.items.map(i => [i.start, i.dur]))).toEqual([
      [[0, 9], [9, 3]], [[0, 3], [3, 3], [6, 3], [9, 3]], [[0, 6], [6, 6]], [[0, 12]],
    ]);
  });

  it('reads octave marks in typed and printed form', () => {
    const { bars } = parseNotes("d' :l1 :s₁ :m¹ :l2");
    const notes = bars[0].pulses.map(p => p.items[0].item);
    expect(notes.map(n => (n.kind === 'note' ? n.octave : null))).toEqual([1, -1, -1, 1, -2]);
  });

  it('explains common mistakes', () => {
    const { issues } = parseNotes('D :mm :x');
    expect(issues.map(i => i.message)).toEqual([
      expect.stringContaining('lower case'),
      expect.stringContaining('division mark'),
      expect.stringContaining('not a sol-fa note'),
    ]);
  });
});

describe('validation', () => {
  it('counts pulses against the time signature', () => {
    const a = analyzeScore(score({ timeNum: 3 }, ['d :r :m | f :s']));
    expect(a.issues).toContainEqual(expect.objectContaining({ category: 'rhythm', bar: 1 }));
  });

  it('allows a short pick-up bar only when enabled', () => {
    expect(analyzeScore(score({ timeNum: 3, pickup: true }, ['s | d :r :m'])).issues).toEqual([]);
    expect(analyzeScore(score({ timeNum: 3 }, ['s | d :r :m'])).issues.length).toBe(1);
  });

  it('flags a hold after a rest and mismatched bar counts', () => {
    const a = analyzeScore(score({ timeNum: 2 }, [' :- | d :r', 'd :d']));
    const cats = a.issues.map(i => i.category);
    expect(cats).toContain('rhythm');
    expect(cats).toContain('structure');
  });

  it('matches syllables to notes per bar', () => {
    const a = analyzeScore(score({ timeNum: 3 }, ['d :r :m | f :- :s'], ['Al-le-lu | ia']));
    expect(a.issues).toContainEqual(expect.objectContaining({ category: 'lyrics', bar: 1 }));
    expect(a.parts[0].events[0].lyric).toEqual({ text: 'Al', hyphen: true, syllabic: 'begin' });
  });

  it('spots consecutive fifths', () => {
    const a = analyzeScore(score({ timeNum: 2 }, ['s :l', 'd :r']));
    expect(a.issues).toContainEqual(expect.objectContaining({ category: 'parallels' }));
  });

  it('parses hyphenated lyrics and melismas', () => {
    expect(parseLyricStream('A-men _ O').map(s => s && s.text)).toEqual(['A', 'men', null, 'O']);
  });
});

describe('sample scores', () => {
  for (const ex of EXAMPLES) {
    it(`${ex.title} has no errors`, () => {
      const a = analyzeScore(ex);
      expect(a.issues.filter(i => i.severity === 'error')).toEqual([]);
      expect(a.parts.every(p => p.bars.length === a.barCount)).toBe(true);
    });

    it(`${ex.title} survives a MusicXML round trip`, () => {
      const a = analyzeScore(ex);
      const back = fromMusicXML(toMusicXML(ex, a));
      const b = analyzeScore({ ...back.score, id: 'x', updatedAt: 0 });
      expect(b.barCount).toBe(a.barCount);
      const pitches = (an: typeof a) => an.parts.map(p => p.events.map(e => [e.start, e.dur, e.midi]));
      expect(pitches(b)).toEqual(pitches(a));
    });
  }
});

describe('tidy (automatic colons and bar lines)', () => {
  it('groups space-separated pulses into bars', async () => {
    const { tidyNotes } = await import('./format');
    expect(tidyNotes('d r m f s l t d\'', 4, 4, '', false)).toBe("d :r /m :f | s :l /t :d'");
    expect(tidyNotes('d :r | m f s', 3, 4, '', false)).toBe('d :r :m | f :s');
    expect(tidyNotes("d r m f s l t d' - :", 3, 4, '', false)).toBe("d :r :m | f :s :l | t :d' :- | ");
    expect(tidyNotes('d _ m', 3, 4, '', false)).toBe('d : :m');
  });

  it('follows time changes and keeps a pick-up', async () => {
    const { tidyNotes } = await import('./format');
    expect(tidyNotes('s | d r m d r m l t', 3, 4, ' | | 2/4', true)).toBe('s | d :r :m | d :r | m :l | t');
  });
});

describe('triplets, articulations and time changes', () => {
  it('parses a triplet pulse and articulation prefixes', () => {
    const { bars, issues } = parseNotes('d;r;m :>!s :*d');
    expect(issues).toEqual([]);
    expect(bars[0].pulses[0].items.map(i => [i.start, i.dur])).toEqual([[0, 4], [4, 4], [8, 4]]);
    const n = bars[0].pulses[1].items[0].item;
    expect(n.kind === 'note' && n.artic).toEqual(['accent', 'staccato']);
  });

  it('checks bars against a changed time signature', () => {
    const a = analyzeScore(score({ timeNum: 3, marks: ' | 2/4' }, ['d :r :m | f :s | l :t']));
    expect(a.issues).toEqual([]);
    expect(a.times.map(t => t.num)).toEqual([3, 2, 2]);
  });

  it('round-trips triplets, articulations, marks and time changes through MusicXML', () => {
    const s = score({ timeNum: 3, marks: 'p, #A | 2/4, D.C. | repeat end' },
      ['d;r;m :>s :*d | f :m | r;-;d :t1'], ['Al-le-lu-ia A-men | O | lu-ia _']);
    const a = analyzeScore(s);
    const back = fromMusicXML(toMusicXML(s, a));
    expect(back.score.parts[0].notes).toBe('d;r;m :>s :*d | f :m | r;-;d :t1');
    expect(back.score.marks).toBe('p, #A | 2/4, D.C. | repeat end');
  });
});

describe('editing on the sheet', () => {
  it('replaces one pulse and extends the part when typing past the end', async () => {
    const { setPulse } = await import('./edit');
    const three = () => 3;
    expect(setPulse('d :r :m | f :s :l', 1, 2, 't', three)).toBe('d :r :m | f :s :t');
    expect(setPulse('d :r :m', 1, 0, 's', three)).toBe('d :r :m | s : :');
    expect(setPulse('', 0, 1, 'm', three)).toBe(':m :');
  });

  it('rewrites one bar of lyrics', async () => {
    const { setLyricBar, lyricsByBar } = await import('./edit');
    const a = analyzeScore(score({ timeNum: 3 }, ['d :r :m | f :- :s'], ['Al-le-lu ia _']));
    expect(lyricsByBar(a.parts[0], 2)).toEqual(['Al-le-lu', 'ia']);
    expect(setLyricBar(a.parts[0], 2, 1, 'i-a')).toBe('Al-le-lu | i-a');
  });
});

describe('tempo', () => {
  it('follows metronome marks, rit. and a tempo', async () => {
    const { buildTempoMap } = await import('./tempo');
    const a = analyzeScore(score({ timeNum: 2, marks: ' | = 120 | rit. | | a tempo' }, ['d :d | d :d | d :d | d :d | d :d']));
    const t = buildTempoMap(a, 60);
    expect(t.pulsesPerMinute(0)).toBe(60);
    expect(t.pulsesPerMinute(24)).toBe(120);
    expect(t.pulsesPerMinute(3 * 24)).toBeLessThan(120);
    expect(t.pulsesPerMinute(4 * 24)).toBe(120);
    expect(t.secondsPerTick(0)).toBeCloseTo(60 / 60 / 12);
  });
});

describe('chords', () => {
  it('reads chord symbols in several spellings', async () => {
    const { parseChord } = await import('./chords');
    expect(parseChord('G7')).toMatchObject({ root: 7, kind: '7', bass: null });
    expect(parseChord('F#m')).toMatchObject({ root: 6, kind: 'min' });
    expect(parseChord('Bbmaj7')).toMatchObject({ root: 10, kind: 'maj7' });
    expect(parseChord('C/E')).toMatchObject({ root: 0, kind: 'maj', bass: 4 });
    expect(parseChord('Hm')).toBeNull();
  });

  it('flags symbols it cannot read', () => {
    const a = analyzeScore({ ...score({ timeNum: 2 }, ['d :r']), chords: 'C :Xq' });
    expect(a.issues).toContainEqual(expect.objectContaining({ category: 'syntax', bar: 0 }));
    expect(a.chords[0][0]).toMatchObject({ root: 0, kind: 'maj' });
  });

  it('works out I – IV – V7 – I in C, and a first inversion', async () => {
    const { detectChords } = await import('./chords');
    const s = score({ timeNum: 2, doh: 'C' }, [
      "m :- | f :- | f :- | m :-",
      "s1 :- | l1 :- | t1 :- | s1 :-",
      "d' :- | d' :- | r :- | d' :-".replace(/d'/g, 'd'),
      "d :- | f1 :- | s1 :- | d :-".replace(/^d/, 'd1').replace(/\| d :-$/, '| d1 :-'),
    ]);
    const a = analyzeScore(s);
    expect(detectChords(a, 'C', 0, 'bar')).toBe('C : | F : | G7 : | C :');
    const inv = analyzeScore(score({ timeNum: 1, doh: 'C' }, ['s', 'd', 'm1'.replace('m1', 'm1')]));
    expect(detectChords(inv, 'C', 0, 'bar')).toBe('C/E');
  });

  it('finds the minor chord and spells flats in flat keys', async () => {
    const { detectChords } = await import('./chords');
    const a = analyzeScore(score({ timeNum: 1, doh: 'F' }, ['m', 'd', 'l1']));
    expect(detectChords(a, 'F', 5, 'bar')).toBe('Dm');
    const b = analyzeScore(score({ timeNum: 1, doh: 'F' }, ['l', 'd', 'f']));
    expect(detectChords(b, 'F', 5, 'bar')).toBe('B♭');
  });
});

describe('chords: numerals, editing and MusicXML', () => {
  it('reads and shows Roman numerals in the key, with inversion figures', async () => {
    const { parseRoman, romanName, parseChord } = await import('./chords');
    expect(parseRoman('V7', 'D', 'major')).toMatchObject({ root: 9, kind: '7' });
    expect(parseRoman('ii', 'F', 'major')).toMatchObject({ root: 7, kind: 'min' });
    expect(parseRoman('bVII', 'C', 'major')).toMatchObject({ root: 10, kind: 'maj' });
    expect(romanName(parseChord('Fmaj7')!, 'C', 'major')).toBe('IVmaj7');
    expect(romanName(parseChord('Em')!, 'C', 'major')).toBe('iii');
    expect(romanName(parseChord('C/E')!, 'C', 'major')).toBe('I⁶');
    expect(romanName(parseChord('G7/B')!, 'C', 'major')).toBe('V⁶₅');
    expect(romanName(parseChord('Bb')!, 'C', 'major')).toBe('♭VII');
    // Minor (lah-mode) pieces count from lah: in doh = B♭, G minor is i and D is V.
    expect(romanName(parseChord('Gm')!, 'Bb', 'minor')).toBe('i');
    expect(romanName(parseChord('D')!, 'Bb', 'minor')).toBe('V');
  });

  it('accepts typed numerals in the score', () => {
    const a = analyzeScore({ ...score({ timeNum: 2, doh: 'G' }, ['d :r']), chords: 'I :V7' });
    expect(a.issues).toEqual([]);
    expect(a.chords[0].map(c => c && c.root)).toEqual([7, 2]);
  });

  it('places a typed chord on a pulse', async () => {
    const { setChordAt } = await import('./chords');
    expect(setChordAt('', 1, 2, 'G7', () => 3)).toBe(': : | : :G7');
    expect(setChordAt('C : : | : :G7', 1, 2, '', () => 3)).toBe('C : :');
  });

  it('round-trips chords through MusicXML', () => {
    const s = { ...score({ timeNum: 3, doh: 'F' }, ['d :r :m | f :- :-', 'd1 :t2 :d1 | l2 :- :-']), chords: 'F : :C/E | Bbmaj7 : :' };
    const back = fromMusicXML(toMusicXML(s, analyzeScore(s)));
    expect(back.score.chords).toBe('F : :C/E | Bbmaj7 : :');
  });
});
