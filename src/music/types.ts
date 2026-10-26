/**
 * The stored score. The sol-fa text in each part is the source of truth;
 * everything else (boxes, staff notation, MusicXML, playback) is derived from it.
 */
export type VoiceType = 'S' | 'A' | 'T' | 'B';

export interface PartDoc {
  id: string;
  name: string;
  voice: VoiceType;
  /** Bars separated by `|`, pulses by `:` (or `/` for the medium accent). */
  notes: string;
  /** Syllables, words hyphenated (`Al-le-lu-ia`). `_` skips a note. Optional `|` aligns with bars. */
  lyrics: string;
}

export type Articulation = 'accent' | 'marcato' | 'staccato' | 'tenuto' | 'fermata';

/** Typed prefixes for articulations, e.g. `>d`, `!m`, `*s`. */
export const ARTIC_PREFIX: Record<string, Articulation> = {
  '>': 'accent', '^': 'marcato', '!': 'staccato', '~': 'tenuto', '*': 'fermata',
};

export interface SheetStyle {
  /** `bar`: one box per bar holding every part; `lines`: each part's line gets its own box. */
  layout: 'bar' | 'lines';
  font: string;
  titleFont: string;
  /** Note size in px; lyrics use the same size. */
  size: number;
  lyricsItalic: boolean;
  notesBold: boolean;
  /** Draw each row of bars as its own rectangle instead of one big grid. */
  separateRows: boolean;
}

export const DEFAULT_STYLE: SheetStyle = {
  layout: 'bar', font: 'sans', titleFont: 'serif', size: 13, lyricsItalic: false, notesBold: true, separateRows: false,
};

/** A new rectangle starting at a bar, e.g. a refrain or verse, with an optional heading. */
export interface SectionBreak { id: string; bar: number; title: string }

/** A block of text placed before a bar (or at the end), e.g. further verses sung to the same melody. */
export interface TextBlock { id: string; bar: number; title: string; body: string }

export interface ScoreDoc {
  id: string;
  title: string;
  subtitle: string;
  composer: string;
  /** Pitch name of doh, e.g. `Bb`, `C`, `F#`. */
  doh: string;
  /** Shown next to the key; minor pieces are written lah-mode (doh = relative major). */
  mode: 'major' | 'minor';
  timeNum: number;
  timeDen: number;
  tempoText: string;
  bpm: number;
  barsPerRow: number;
  /** First bar is a pick-up (anacrusis) and may be shorter. */
  pickup: boolean;
  style?: SheetStyle;
  parts: PartDoc[];
  /**
   * One entry per bar, separated by `|`; comma-separated marks: dynamics (`p`, `cresc.`), jumps (`D.C.`, `Fine`, `segno`),
   * time changes (`3/4`), rehearsal marks (`#A`), repeats (`repeat start`, `repeat end`), labels (`[FIRST TIME]`) or quoted text (`"*dolce*"`).
   */
  marks: string;
  sections?: SectionBreak[];
  texts?: TextBlock[];
  footer: string;
  updatedAt: number;
}

/** 12 ticks per pulse: allows halves (6), quarters (3) and triplet thirds (4). */
export const TICKS = 12;

export interface NoteItem {
  kind: 'note';
  syl: string;
  /** Semitones above doh within the octave (0–11). */
  semis: number;
  /** +1 per `'`, −1 per lower mark (`d1` = one octave down, `d2` = two). */
  octave: number;
  artic: Articulation[];
  slurStart: boolean;
  slurEnd: boolean;
}
export interface HoldItem { kind: 'hold' }
export interface RestItem { kind: 'rest' }
export type Item = NoteItem | HoldItem | RestItem;

/** One item placed inside a pulse. `sep` is the division mark typed before it (`''` for the first). */
export interface PlacedItem {
  item: Item;
  /** Offset from the start of the bar, in ticks. */
  start: number;
  dur: number;
  /** `;` separates the thirds of a triplet pulse. */
  sep: '' | '.' | ',' | '.,' | ';';
}

export interface Pulse {
  /** Separator typed before this pulse: `''` for the first, `:` or `/`. */
  sep: '' | ':' | '/';
  items: PlacedItem[];
  raw: string;
}

export interface ParsedBar {
  pulses: Pulse[];
  /** Character offset of the bar in the part's notes text (for jumping to errors). */
  offset: number;
  raw: string;
}

/** A sounding event after holds are merged into their notes. */
export interface Event {
  /** Absolute start from the beginning of the piece, in ticks. */
  start: number;
  dur: number;
  bar: number;
  /** null = rest */
  midi: number | null;
  note: NoteItem | null;
  lyric?: Syllable;
}

export interface Syllable {
  text: string;
  /** Word continues after this syllable (draw a hyphen). */
  hyphen: boolean;
  syllabic: 'single' | 'begin' | 'middle' | 'end';
}

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  category: 'syntax' | 'rhythm' | 'structure' | 'lyrics' | 'range' | 'voicing' | 'parallels';
  message: string;
  partId?: string;
  /** 0-based bar index */
  bar?: number;
}
