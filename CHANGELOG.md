# Changelog

All notable changes to Statos. Versions follow [semantic versioning](https://semver.org/).

## [Unreleased]

### Added
- **Chords** above the music, over the beat where each chord starts:
  - **Add chords automatically** works them out from the notes all the parts sing, one per bar, half bar or beat (inversions such as C/E included; chords in the key preferred). Optionally keeps chords already typed.
  - Type chords on the sheet as letters (`C`, `G7`, `F#m`, `Bbmaj7`, `C/E`) or as numbers in the key (`I`, `ii`, `V7`, `IVmaj7`).
  - *Show chords as* letters (C, Dm, Fmaj7) or numbers (I, ii, IVmaj7, with inversion figures such as I⁶ and V⁶₅); minor pieces are numbered from lah.
  - Chords appear in the staff view and in MusicXML export, and are read from imported MusicXML.
  - Scores with chords always draw each row as its own rectangle so the chord line fits above it.

### Fixed
- The collapsed problems bar no longer gets squeezed on short screens.

## [0.1.2] — 2026-10-31

### Added
- The page number and the Statos credit are now also shown on screen, in a strip above or below the sheet where they will be printed, so it's clear they are there before printing.

## [0.1.1] — 2026-10-31

### Added
- **Page numbers** on printouts and PDFs, set in *Appearance → Page numbers*:
  - position: top or bottom, left, centre or right;
  - format: *Page 1 of 3*, *Page 1*, *1* or *– 1 –*;
  - font (or the same as the music), size, bold and italic;
  - the number the first page gets, and an option to leave the first page (e.g. a title page) unnumbered.
- A small credit, “Compose and transcribe at https://statos.site”, at the bottom of every printed page. It moves to the bottom left if the page number takes the bottom-right corner.
- The README links to the online version at [statos.site](https://statos.site).

### Notes
- Browsers can only leave the *first* page unnumbered, and a page total (“of 3”) is left out when counting doesn't start at 1.

## [0.1.0] — 2026-10-26

First release.

- Boxed tonic sol-fa editor: type on the sheet or as text, automatic colons and bar lines, undo/redo, autosave in the browser.
- Live checking: pulse counts, syntax, lyrics, voice ranges, voicing and (optional) parallels.
- Time-signature changes, triplets, articulations, slurs, dynamics, jumps, repeats, rehearsal marks, section boxes and verse text blocks.
- Staff view, MusicXML export and import, and playback that follows tempo marks.
- Welcome wizard, Help page with lessons, About, Privacy and Terms pages, phone layout.
- Offline single-file download (`Statos-v0.1.0-offline.zip`).

[0.1.2]: https://github.com/beri-sela/statos/releases/tag/v0.1.2
[0.1.1]: https://github.com/beri-sela/statos/releases/tag/v0.1.1
[0.1.0]: https://github.com/beri-sela/statos/releases/tag/v0.1.0
