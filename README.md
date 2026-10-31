# Statos — Staff and Tonic Sol-fa

Statos is a browser-based editor for writing choral music in **tonic sol-fa** and converting it to and from **staff notation**. It runs entirely in the browser (React, no backend, no login). Scores are saved in the browser's local storage, and you can download them as files to back them up or share them.

**Use it online at [statos.site](https://statos.site)** — nothing to install. Or [download the offline copy](#download-and-run-it-on-your-computer) to run it from your own computer. See the [changelog](CHANGELOG.md) for what's new.

## What it does

- **Edit directly on the sheet**, like MuseScore: click a note in the boxed sol-fa and type. Space or Tab moves to the next pulse (new bars are added as you go), the arrow keys move between pulses and parts, Ctrl+L types lyrics for the bar, Esc finishes. An on-screen key row gives octave marks, divisions, triplets, articulations and navigation, which helps most on phones.
- **Or write sol-fa as text** in the editor panel; the sheet updates as you type.
- **Undo and redo** (↶ ↷, Ctrl+Z / Ctrl+Y) for every change. Everything is saved automatically.
- **Live checking** while you type:
  - *errors*: wrong number of pulses for the time signature, unknown syllables, a hold (`-`) with nothing to hold, parts with different numbers of bars;
  - *warnings*: lyrics that don't match the notes, notes outside the usual range of each voice, voices crossing or spaced too widely, and (optional) consecutive fifths and octaves.
  Click a problem to jump to the bar in the editor.
- **Automatic colons and bar lines**: type pulses separated by spaces (`d r m f s`) and Statos adds `:`, `/` and `|` for the time signature, including time-signature changes.
- **Staff notation**: the same score drawn on staves (tenor in treble-8, bass in bass clef).
- **Sol-fa ↔ staff conversion** through MusicXML:
  - *Export MusicXML* opens in MuseScore, Sibelius, Finale or Dorico.
  - *Import* a MusicXML file and it is converted to sol-fa (each staff voice becomes a part).
- **Bar marks**: dynamics, jumps (D.C., D.S., Fine, Segno, Coda), repeats, rehearsal marks, tempo changes, labels such as *FIRST TIME*, free text with **bold** and *italic*, and time-signature changes.
- **Articulations and rhythms**: accents, marcato, staccato, tenuto, fermata, slurs, half and quarter pulses, dotted rhythms and triplets.
- **Layout and appearance**: one box per bar or a separate box for each part's line; bars per row (or automatic); fonts, text size, bold notes and italic lyrics. Boxes grow to fit their contents.
- **Playback** of all parts, from the start or from the selected bar. It follows the tempo: the base speed, `♩ = N` marks, gradual *rit.*/*rall.*/*accel.*, *a tempo*, and fermatas. Changing the speed or the notes while it plays is heard straight away.
- **Rectangles where you want them**: start a new box at any bar (a refrain, a verse, a coda) with its own heading, draw each row of bars as its own rectangle, and add **text blocks** for verses sung to the same melody.
- **Phones and tablets**: a tab bar switches between *Details*, *Sol-fa* and *Staff*; menus open as bottom sheets; controls are sized for touch. On desktop, buttons show tooltips.
- **Printing**: *Print* gives just the music, with a small credit, “Compose and transcribe at https://statos.site”, bottom-right on every page. **Page numbers** are set in *Appearance*: position (top/bottom × left/centre/right), format, font, size, bold/italic, the first page's number, and an option to leave the first page unnumbered.
- **Welcome wizard**: a first-time visitor (or anyone with no scores) starts at a welcome screen that offers a new score, importing a file, opening an example, or the lessons.
- **Help page** (`#/help`, toolbar or F1): searchable lessons from a first score to marks, boxes, playback, MusicXML and phones, plus a cheat sheet and shortcuts. Each lesson has its own link, e.g. `#/help/lyrics`.
- **About, Privacy and Terms pages** (`#/about`, `#/privacy`, `#/terms`). Statos collects no data: no accounts, cookies, analytics or third-party requests.
- **Desktop layout**: the side panel and the music scroll separately; drag the divider to resize the panel or hide it with ⇤; *Both* shows sol-fa and staff side by side; the speed (♩ =) sits next to Play.
- A **wizard** for starting a new score (key, time signature, voices, layout) or importing one.

Two sample scores are included (*Mimọ* by Alex Ugwu and *Alleluia Amen* by Ndem Brian, typed from handwritten manuscripts).

## Download and run it on your computer

No installation or web server needed:

1. Download **Statos-vX.Y.Z-offline.zip** from the [latest release](https://github.com/beri-sela/statos/releases/latest).
2. Unzip it.
3. Double-click **Statos.html**. It opens in your browser and works without an internet connection.

Scores are saved in that browser on that computer; keep `Statos.html` in the same folder, and use **Save** for backup files.

## Getting started (development)

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
npm install
npm run dev
```

Then open the address it prints (normally http://localhost:5173).

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run the tests (parser, checker, conversion) |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm run preview` | Serve the built site locally |

The built `dist/` folder is a static site: it can be hosted anywhere (GitHub Pages, Netlify, any web server).

`npm run build:offline` builds the whole app into one self-contained file, `release/statos/index.html`, that works when opened straight from disk (`file://`).

### Making a release

1. Set the new version (e.g. `npm version 0.2.0 --no-git-tag-version`), add an entry to `CHANGELOG.md`, and commit.
2. Tag and push: `git tag v0.2.0 && git push origin v0.2.0`.

The *Release* workflow (`.github/workflows/release.yml`) then runs the tests, builds the offline file, and publishes a GitHub release with `Statos-v0.2.0-offline.zip` (the HTML file plus `packaging/README.txt`).

## Typing sol-fa

Each part has a **notes** box and a **lyrics** box.

| Type | Meaning |
|---|---|
| `d r m f s l t` | the notes |
| `de ra re ma fe ba se lo le ta` | chromatic notes |
| `d'` `d''` | one / two octaves up (shown d¹) |
| `l1` `l2` | one / two octaves down (shown l₁) |
| `\|` | bar line |
| `:` | between pulses; `/` marks the medium accent (placed automatically) |
| `-` | hold the previous note |
| empty pulse, or `_` when typing with spaces | rest |
| `d.r` | two half-pulses |
| `d.,r` | three-quarters + one quarter |
| `d,r.m,f` | four quarter-pulses |
| `d;r;m` | triplet (three notes in one pulse) |
| `>d` `^d` `!d` `~d` `*d` | accent, marcato, staccato, tenuto, fermata |
| `(m.m :r)` | slur |

Men's parts (tenor, bass) are written at the same letters as the women's and sound an octave lower, as is usual in tonic sol-fa. Minor pieces are written in lah-mode: doh is the relative major, and the key line shows the minor key, e.g. *Key B♭ (G minor)*.

**Lyrics**: hyphenate words (`Al-le-lu-ia A-men`). Each syllable goes to the next note that starts. Use `_` for a note that keeps the previous syllable (a melisma). Put `|` between bars to match lyrics bar by bar, so a mistake stays in one bar.

**Text formatting**: titles, subtitles, the footer and text marks accept `**bold**` and `*italic*`.

## Bar marks

Select a bar in the sheet and use the **Bar marks** panel, or edit the marks as text: one entry per bar separated by `|`, several marks in a bar separated by commas.

| Mark | Example |
|---|---|
| Dynamics | `p`, `mf`, `ff`, `sfz`, `cresc.`, `dim.` |
| Jumps | `segno`, `coda`, `Fine`, `D.C.`, `D.S. al Fine`, `To Coda` |
| Repeats | `repeat start`, `repeat end` |
| Time change | `3/4` (applies from that bar on) |
| Rehearsal mark | `#A` |
| Tempo | `rit.`, `a tempo`, `accel.`, `= 120` (♩ = 120 pulses per minute from that bar) |
| Label | `[FIRST TIME]` |
| Text | `"*dolce*, softly"` (quotes allow commas) |

## Boxes and text blocks

In **Boxes & text blocks**, *New box at bar N* starts a separate rectangle at the selected bar, with an optional heading such as *Refrain* or *Verse 1*. *Text block* adds a framed block of text, before any bar or at the end, e.g. further verses sung to the refrain's melody; leave a blank line between verses. *Appearance → Each row of bars in its own rectangle* separates every row.

## Project layout

```
src/
  music/          score model and logic (no React)
    types.ts        score format
    parse.ts        sol-fa text → bars, pulses, timed events; lyrics
    analyze.ts      checking: rhythm, structure, lyrics, ranges, voicing, parallels
    marks.ts        bar marks and time-signature changes
    format.ts       automatic colons and bar lines
    edit.ts         editing one pulse or one bar of lyrics from the sheet
    tempo.ts        tempo map for playback (♩ = N, rit., accel., fermatas)
    musicxml.ts     MusicXML export and import (staff ↔ sol-fa)
    solfa.ts        syllables, keys, pitch spelling
    playback.ts     Web Audio playback
  components/     React UI (editor, boxed sheet, staff view, wizard, issue list)
  storage.ts      local storage and file download/upload
  examples.ts     sample scores
```

## Limitations and plans

- Compressed `.mxl` files are not read yet; export *uncompressed* MusicXML.
- One key per piece (key changes in imported files are ignored); one verse of lyrics per part.
- Chords inside a single staff voice are reduced to one note on import.
- Planned: a browser extension that reads scanned sheets and photos (PDF and images, several pages) with AI and opens the result in Statos for proofreading.

## Data and privacy

Everything stays in your browser. Clearing your browser's site data deletes saved scores, so use **Save file** to keep copies.
