/**
 * Help content. Text uses a small markup: `## heading`, `- bullet`, `1. step`, blank line = new paragraph,
 * `code`, **bold**, *italic*, and [[key]] for a keyboard key.
 */
export type HelpAction = 'new' | 'import' | 'example';

export interface Lesson {
  id: string;
  group: 'Start here' | 'Lessons' | 'Reference';
  title: string;
  summary: string;
  keywords: string;
  body: string;
  actions?: { label: string; action: HelpAction }[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'welcome', group: 'Start here', title: 'Welcome to Statos',
    summary: 'What Statos does and where everything is on the screen.',
    keywords: 'intro overview screen layout toolbar panel staff tonic solfa',
    body: `Statos (**Sta**ff and **To**nic **S**ol-fa) is for writing choral music in tonic sol-fa, the boxed notation used in many choirs, and turning it into staff notation (and back).

## The screen
- **Toolbar** (top): your scores, *New*, *Import*, *Save*, *MusicXML*, *Print*, undo and redo, the view switch (*Sol-fa*, *Staff*, *Both*), *Play*, and *Help*.
- **Details panel** (left): title, key, time signature, appearance, the parts as text, bar marks, boxes and text blocks.
- **Sheet** (right): the boxed sol-fa. Click any note on it to edit it.
- **Problems list** (above the sheet): mistakes and suggestions. Click one to jump to it.

On a phone, the tabs at the bottom switch between **Details**, **Sol-fa** and **Staff**.

Everything you do is saved automatically in this browser. There is no account and nothing is uploaded.`,
    actions: [{ label: 'Start a new score', action: 'new' }],
  },
  {
    id: 'first-score', group: 'Start here', title: 'Your first score in two minutes',
    summary: 'Create a score with the wizard and type a first line of music.',
    keywords: 'new create wizard start begin quick',
    body: `1. Click **New** in the toolbar. The wizard opens.
1. Choose **Type a new score**.
1. Give it a title, pick the key (*Doh is*), and click a **time signature**, e.g. 3/4.
1. Choose the voices (SATB, SAB, unison…) and click **Create score**.
1. On the sheet, click the first empty pulse of the first part.
1. Type \`d\`, press [[Space]], type \`r\`, [[Space]], \`m\`, [[Space]]… Each [[Space]] moves to the next pulse, and new bars appear as you go.
1. Press [[↓]] to move to the next part and carry on.
1. Press [[Esc]] when you are done, then **Play** to listen.

You never need to type colons or bar lines: Statos adds them for the time signature.`,
    actions: [{ label: 'Start a new score', action: 'new' }],
  },
  {
    id: 'typing', group: 'Lessons', title: 'Typing notes on the sheet',
    summary: 'Click a note and type; move with Space, Tab and the arrow keys.',
    keywords: 'inline edit click type cursor keyboard navigation space tab arrows key row',
    body: `Click any pulse (beat) in the boxed sol-fa to edit it. A small box appears where you type.

- [[Space]], [[Tab]] or [[Enter]]: next pulse. Typing past the end of a part adds a new bar.
- [[Shift]]+[[Tab]]: previous pulse. [[Backspace]] in an empty pulse also goes back.
- [[←]] [[→]] at the edge of the text: previous / next pulse.
- [[↑]] [[↓]]: the same pulse in the part above / below.
- [[|]]: jump to the next bar.
- [[Ctrl]]+[[L]]: type the lyrics of this bar.
- [[Esc]]: stop editing.

While you edit, a row of keys appears under the sheet with the symbols that are awkward to type (octave marks, divisions, triplets, accents, slurs) and buttons to move around. They are especially handy on a phone.

You can also type a whole part as text in the **Details** panel. With *Add colons and bar lines for me* ticked, type pulses separated by spaces (\`d r m f\`) and Statos lays them out as you type.`,
  },
  {
    id: 'pitch', group: 'Lessons', title: 'Notes, octaves and chromatic notes',
    summary: 'd r m f s l t, octave marks, sharpened and flattened notes, minor keys.',
    keywords: 'pitch octave up down mark chromatic sharp flat fe ta se de minor lah mode doh key',
    body: `## The notes
\`d r m f s l t\` (doh ray me fah soh lah te).

## Octaves
- One octave up: \`d'\` (shown d¹). Two octaves up: \`d''\`.
- One octave down: \`l1\` (shown l₁). Two octaves down: \`l2\`.

Tenor and bass are written with the same letters as soprano and alto and sound an octave lower, as is usual in tonic sol-fa.

## Chromatic notes
- Sharpened: \`de re fe se le\`
- Flattened: \`ra ma ba lo ta\`

## Minor keys
Minor pieces are written in *lah-mode*: doh is the relative major. Choose the major key's doh and set *Mode* to *minor*; the key line then reads e.g. *Key B♭ (G minor)*.`,
  },
  {
    id: 'rhythm', group: 'Lessons', title: 'Rhythm: holds, rests, divisions and triplets',
    summary: 'How long notes last, rests, half and quarter pulses, dotted notes and triplets.',
    keywords: 'rhythm duration hold dash rest silence half quarter dotted triplet division pulse beat',
    body: `Each box is one bar and each column is one **pulse** (beat).

- \`-\` holds the previous note through the pulse: \`d :- :r\`
- An **empty pulse** is a rest: \`d : :r\` (when typing with spaces, use \`_\` for a rest)
- \`d.r\` — two half-pulses
- \`d.,r\` — three-quarters + one quarter (dotted rhythm)
- \`d,r.m,f\` — four quarter-pulses
- \`-.r\` — hold for half a pulse, then r
- \`d;r;m\` — a **triplet**: three notes in one pulse (shown with a small 3)

The checker tells you if a bar has the wrong number of pulses for its time signature.`,
  },
  {
    id: 'lyrics', group: 'Lessons', title: 'Lyrics',
    summary: 'Hyphenate words, hold a syllable over several notes, edit lyrics bar by bar.',
    keywords: 'words text syllable hyphen melisma underscore verse lyric',
    body: `Each syllable goes to the next note that starts (holds and rests are skipped).

- Hyphenate words: \`Al-le-lu-ia A-men\`
- Use \`_\` for a note that keeps the previous syllable (a melisma): \`A-men _\`
- Put \`|\` between bars to match the lyrics bar by bar, so a mistake stays in one bar.

On the sheet, click a lyric (or press [[Ctrl]]+[[L]] while on a note) to type the words of that bar. [[Tab]] goes to the next bar's lyrics.

The checker warns when a bar has more syllables than notes, or more notes than syllables.

For further verses sung to the same music, use a **text block** (see *Boxes, refrains and verses*).`,
  },
  {
    id: 'time', group: 'Lessons', title: 'Time signatures, changes and pick-up bars',
    summary: 'Choose a time signature, change it mid-piece, and start with a short bar.',
    keywords: 'time signature meter change 3/4 4/4 6/8 pickup anacrusis upbeat medium accent slash',
    body: `Choose the time signature in the wizard or in *Details → Time signature*. The number of pulses in a bar is the top number (6/8 has six pulses).

## Changing the time signature
1. Click the bar where the new time signature starts.
1. In **Bar marks → Time change**, choose it (e.g. 2/4) and click *Set from this bar*.

Bars after it are checked and laid out with the new number of pulses, and the staff notation and MusicXML show the change.

## Pick-up bar
Tick *First bar is a pick-up* when the music starts with a short bar.

The medium accent \`/\` (in 4, 6, 9 and 12 pulses) is placed for you.`,
  },
  {
    id: 'marks', group: 'Lessons', title: 'Dynamics, jumps, repeats and other bar marks',
    summary: 'p, f, cresc., D.C., Segno, Fine, repeats, rehearsal letters, labels and text.',
    keywords: 'dynamics forte piano cresc dim jump dc ds segno coda fine repeat rehearsal letter label text first time bold italic',
    body: `Click a bar on the sheet, then use **Bar marks** in the Details panel.

- **Dynamics**: \`ppp\` … \`fff\`, \`sfz\`, \`cresc.\`, \`dim.\`
- **Jumps**: Segno 𝄋, Coda 𝄌, Fine, D.C., D.S., D.C. al Fine, D.S. al Coda, To Coda
- **Repeats**: start and end repeat bar lines
- **Tempo**: rit., rall., accel., a tempo, and ♩ = N
- **Time change**
- **Rehearsal marks**: boxed letters A, B, C… (the next letter is suggested)
- **Text** and **labels** (e.g. *FIRST TIME*). Use the **B** and *I* buttons, or type \`**bold**\` and \`*italic*\`.

Marks appear in the top band of the bar's box. Click ✕ on a mark to remove it. *Edit as text* shows all marks in one line (bars separated by \`|\`).`,
  },
  {
    id: 'chords', group: 'Lessons', title: 'Chords above the music',
    summary: 'Add chord symbols automatically or by typing; show them as letters or numbers.',
    keywords: 'chord chords harmony accompaniment guitar keyboard piano roman numeral numbers letters symbol automatic detect',
    body: `Chord symbols sit above each bar, over the beat where the chord starts, for keyboard or guitar players.

## Add them automatically
1. In the **Chords** panel, choose *One chord per* bar, half bar or beat.
1. Click **✨ Add chords automatically**.

Statos looks at the notes all the parts sing at that point (longer notes count more, the lowest note decides inversions such as C/E) and picks the chord that fits best, preferring chords that belong to the key. Tick *Keep chords I've typed* to fill only the empty places. Automatic chords are a starting point: check them by ear.

## Type them
Click **Type chords on the sheet** (or click above a bar, or press [[↑]] from the top part). Type the chord and press [[Space]] or [[Tab]] for the next beat; [[↓]] goes back to the notes.
- Letters: \`C\` \`Dm\` \`G7\` \`F#m\` \`Bbmaj7\` \`Bdim\` \`Csus4\`, and \`C/E\` for a chord with E in the bass.
- Numbers in the key: \`I\` \`ii\` \`V7\` \`IVmaj7\` \`vii°\` \`bVII\` (capitals for major, small letters for minor).

## Letters or numbers
*Show chords as* switches between letter names (C, Dm, Em, Fmaj7) and numbers in the key (I, ii, iii, IVmaj7), whichever way they were typed. Numbers show inversions with figures (I⁶, V⁶₅). Minor pieces are numbered from lah (i, iv, V).

When a score has chords, each row of bars is drawn as its own rectangle so the chord line fits above it. Chords also appear in the staff view and in exported MusicXML.`,
  },
  {
    id: 'articulation', group: 'Lessons', title: 'Accents, staccato, fermatas and slurs',
    summary: 'Articulation signs and slurs, typed before or around notes.',
    keywords: 'articulation accent marcato staccato tenuto fermata pause slur tie phrase',
    body: `Type the sign just before the note (or use the key row):

- \`>d\` accent
- \`^d\` marcato (strong accent)
- \`!d\` staccato (shown •)
- \`~d\` tenuto (shown –)
- \`*d\` fermata / pause (𝄐) — playback holds it longer

**Slurs**: put \`(\` before the first note and \`)\` after the last: \`(m.m :r)\`. A slur can run across bars.`,
  },
  {
    id: 'boxes', group: 'Lessons', title: 'Boxes, refrains and verses',
    summary: 'Separate rectangles for sections and rows, and text blocks for extra verses.',
    keywords: 'box rectangle section refrain chorus verse heading text block separate rows layout',
    body: `## A new box for a section
1. Click the bar where the section begins (e.g. the refrain).
1. In **Boxes & text blocks**, click *New box at bar N*.
1. Type a heading such as *Refrain*.

The music from that bar on is drawn in its own rectangle under the heading.

## Text blocks
When further verses are sung to the same melody, click *Text block*, give it a heading (*Verse 2*) and type the words. Leave a blank line between verses. Choose where it goes: before any bar, or at the end.

## Every row in its own rectangle
*Appearance → Each row of bars in its own rectangle* separates every line of music.

## One box per bar, or per part
*Appearance → Boxes* chooses one box per bar holding all parts, or a separate box for each part's line.`,
  },
  {
    id: 'appearance', group: 'Lessons', title: 'Fonts, sizes and layout',
    summary: 'Music and title fonts, text size, bold notes, italic lyrics, bars per row.',
    keywords: 'appearance font size bold italic bars per row layout style look',
    body: `In **Appearance**:

- **Bars per row**: a fixed number, or *Auto* to fit as many as the width allows. On phones bars always fit the screen.
- **Text size**: notes and lyrics share one size, and boxes grow to fit their text.
- **Music font** and **Title font**.
- **Bold notes**, **Italic lyrics**.

Titles, subtitles, the footer and text marks accept \`**bold**\` and \`*italic*\`.`,
  },
  {
    id: 'checking', group: 'Lessons', title: 'Checking your work',
    summary: 'What the errors and warnings mean, and how to fix them.',
    keywords: 'errors warnings problems check validation range voicing parallel fifths octaves crossing mistakes',
    body: `The **Problems** list above the sheet updates as you type. Bars with problems have a red (error) or orange (warning) line along the bottom. Click a problem to go to it.

## Errors (must fix)
- A bar with the wrong number of pulses
- Something that is not a sol-fa note
- \`-\` with nothing to hold
- Parts with different numbers of bars

## Warnings (worth checking)
- Lyrics that don't match the notes
- Notes outside the usual range of a voice — often a missing octave mark
- Voices crossing, or more than an octave between neighbouring upper voices
- Consecutive fifths and octaves (off by default; tick *Parallels* to check)

The style checks (Range, Voicing, Parallels) can be switched off when you break the rules on purpose.`,
  },
  {
    id: 'playback', group: 'Lessons', title: 'Listening: playback and tempo',
    summary: 'Play the score, start from a bar, and control the speed.',
    keywords: 'play playback listen audio sound tempo speed bpm metronome rit accel fermata',
    body: `Click **Play**. To start somewhere else, click a bar first; the button then says *Bar N*. The bar being played is highlighted.

- **Speed** (Details) is in pulses per minute.
- A **♩ = N** mark changes the speed from that bar.
- **rit.**, **rall.**, **allarg.** slow down and **accel.** speeds up, over two bars; **a tempo** returns to the speed before.
- **Fermatas** are held longer.

You can change notes or the speed while it plays and hear the change straight away.`,
  },
  {
    id: 'staff', group: 'Lessons', title: 'Staff notation and MusicXML',
    summary: 'See the staff version, export to MuseScore and other programs, import their files.',
    keywords: 'staff notation sheet music musicxml export import musescore sibelius finale dorico convert',
    body: `Switch the view to **Staff** or **Both** to see the music on staves (tenor in treble-8, bass in bass clef).

## Export (sol-fa → staff)
Click **MusicXML** to download a file that opens in MuseScore, Sibelius, Finale, Dorico and most notation programs.

## Import (staff → sol-fa)
Click **Import** and choose a MusicXML file (\`.musicxml\` or \`.xml\`). Each staff voice becomes a sol-fa part. In MuseScore use *File → Export → MusicXML* and choose the uncompressed format.

Check imported music against the original: chords inside one voice become a single note, key changes are ignored, and rhythms finer than a quarter-pulse are rounded.`,
    actions: [{ label: 'Import a file', action: 'import' }],
  },
  {
    id: 'saving', group: 'Lessons', title: 'Saving, backups and printing',
    summary: 'Automatic saving, files for backup and sharing, undo, and printing.',
    keywords: 'save backup file json share print pdf undo redo history delete duplicate',
    body: `Every change is saved automatically in this browser (*✓ Saved* in the toolbar).

- **Save** downloads a \`.statos.json\` file: keep it as a backup, or send it to someone, who can open it with **Import**.
- **Undo** ↶ and **Redo** ↷ (or [[Ctrl]]+[[Z]] / [[Ctrl]]+[[Y]]) step through your changes.
- **Print** prints just the music, with page numbers and a small Statos credit at the bottom of each page. On screen, a dashed strip under the sheet shows where they will be printed. Choose *Save as PDF* in the print window to make a PDF.
- **Appearance → Page numbers** sets where the number goes (top or bottom; left, centre or right), its format (*Page 1 of 3*, *Page 1*, *1*, *– 1 –*), font, size, bold and italic, the number the first page gets, and whether the first page (e.g. a title page) has no number.
- **More** has *Duplicate* and *Delete*.

Clearing your browser's site data deletes saved scores, so keep files of anything important.`,
  },
  {
    id: 'phone', group: 'Lessons', title: 'Using Statos on a phone or tablet',
    summary: 'Tabs, the key row and tips for small screens.',
    keywords: 'phone mobile tablet touch small screen tabs install home screen',
    body: `- The tabs at the bottom switch between **Details**, **Sol-fa** and **Staff**.
- Tap a note on the sheet to edit it. The key row above the tabs has octave marks, divisions, triplets, accents and arrows, so you rarely need the symbol keyboard.
- Turn the phone sideways for more bars per row.
- To use Statos like an app, choose *Add to Home screen* in your browser's menu.`,
  },
  {
    id: 'cheatsheet', group: 'Reference', title: 'Sol-fa typing cheat sheet',
    summary: 'Everything you can type in a notes box, on one page.',
    keywords: 'reference syntax cheat sheet summary symbols',
    body: `- \`d r m f s l t\` — notes
- \`de re fe se le\` / \`ra ma ba lo ta\` — sharpened / flattened
- \`d'\` \`d''\` — octave(s) up; \`l1\` \`l2\` — octave(s) down
- \`|\` bar line, \`:\` pulse, \`/\` medium accent (all added automatically)
- \`-\` hold; empty pulse (or \`_\` when typing with spaces) rest
- \`d.r\` halves; \`d.,r\` ¾ + ¼; \`d,r.m,f\` quarters; \`d;r;m\` triplet
- \`>\` accent, \`^\` marcato, \`!\` staccato, \`~\` tenuto, \`*\` fermata — before the note
- \`(\` … \`)\` slur

**Lyrics**: \`Al-le-lu-ia\`, \`_\` holds a syllable, \`|\` between bars.

**Bar marks as text**: \`p\`, \`cresc.\`, \`D.C.\`, \`segno\`, \`repeat start\`, \`3/4\`, \`#A\`, \`= 120\`, \`[FIRST TIME]\`, \`"*dolce*"\`.`,
  },
  {
    id: 'shortcuts', group: 'Reference', title: 'Keyboard shortcuts',
    summary: 'All keys in one list.',
    keywords: 'keyboard shortcuts keys hotkeys',
    body: `- [[Ctrl]]+[[Z]] undo, [[Ctrl]]+[[Y]] or [[Ctrl]]+[[Shift]]+[[Z]] redo
- [[F1]] or [[?]] open Help
- On the sheet: [[Space]] / [[Tab]] / [[Enter]] next pulse, [[Shift]]+[[Tab]] previous, [[←]] [[→]] [[↑]] [[↓]] move, [[|]] next bar, [[Ctrl]]+[[L]] lyrics, [[Esc]] stop editing`,
  },
  {
    id: 'faq', group: 'Reference', title: 'Troubleshooting',
    summary: 'Common questions and fixes.',
    keywords: 'faq problem help trouble fix wrong octave sound no audio missing lost',
    body: `**A note sounds an octave too high or low.** Check the octave mark (\`'\` up, \`1\` down). Range warnings point these out.

**My bar shows a red line.** Open the Problems list and click the error to see what's wrong.

**No sound.** Check the device volume; some phones mute web audio in silent mode.

**My scores are gone.** Scores live in the browser where you made them. A different browser or device, private browsing, or clearing site data won't have them. Use **Save** files as backups.

**The imported file looks wrong.** Export *uncompressed* MusicXML, and check chords, key changes and very fast rhythms by hand.`,
  },
];
