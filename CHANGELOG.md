# Changelog

All notable changes to Statos. Versions follow [semantic versioning](https://semver.org/).

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

[0.1.1]: https://github.com/beri-sela/statos/releases/tag/v0.1.1
[0.1.0]: https://github.com/beri-sela/statos/releases/tag/v0.1.0
