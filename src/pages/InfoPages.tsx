import { href } from '../router';
import { REPO_URL, SiteLayout } from './SiteLayout';

const UPDATED = '26 October 2026';
const ISSUES_URL = `${REPO_URL}/issues`;

export function AboutPage() {
  return (
    <SiteLayout current="about">
      <article className="prose">
        <p className="eyebrow">About</p>
        <h1>Statos — Staff and Tonic Sol-fa</h1>
        <p className="lead">
          Statos is a free music editor that runs in your web browser. It is made for choirs, choir directors,
          composers and arrangers who write and read music in <b>tonic sol-fa</b>, and for anyone who needs to move
          music between sol-fa and <b>staff notation</b>.
        </p>

        <h2>Why Statos</h2>
        <p>
          Tonic sol-fa is how a great deal of choral music is written and taught, especially in churches and schools
          across Africa. Much of it still lives in handwritten manuscripts and photocopies, and there have been few
          good tools for typing it, checking it, and sharing it in the familiar boxed layout. Statos aims to make that
          easy, on a computer or a phone, without accounts, installation or cost.
        </p>

        <h2>What it does</h2>
        <ul>
          <li><b>Write sol-fa the way it is printed</b>: boxed bars, colons and medium accents, octave marks, lyrics under each part, sections, refrains and verse text.</li>
          <li><b>Type directly on the sheet</b>, with automatic colons and bar lines, undo and redo, and on-screen keys on phones.</li>
          <li><b>Catch mistakes as you type</b>: wrong pulse counts, lyrics that don’t fit, notes out of range, voices crossing, consecutive fifths and octaves.</li>
          <li><b>Hear it</b>: playback that follows tempo marks, <i>rit.</i>, <i>accel.</i> and fermatas.</li>
          <li><b>Go between sol-fa and staff</b>: see staff notation side by side, export MusicXML for MuseScore, Sibelius, Finale and Dorico, and import their files as sol-fa.</li>
          <li><b>Print and share</b>: print just the music, or save a file to send to someone else.</li>
        </ul>
        <p><a className="button primary" href={href('')}>Open the editor</a> <a className="button" href={href('help/first-score')}>Your first score in two minutes</a></p>

        <h2>Your music stays yours</h2>
        <p>
          Statos has no accounts and no servers that store music. Everything you write is kept in your own browser,
          and nothing is collected about you or your scores. Read the <a href={href('privacy')}>privacy policy</a> for
          the details.
        </p>

        <h2>Plans</h2>
        <ul>
          <li>An optional browser extension to read scanned sheets and photos of handwritten sol-fa (PDF and images, several pages) and open them in Statos for proofreading.</li>
          <li>Key changes within a piece, several verses of lyrics per part, and compressed MusicXML (.mxl) files.</li>
        </ul>
        <p>Suggestions and bug reports are welcome on <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub</a>.</p>

        <h2>Thanks</h2>
        <ul>
          <li>Staff notation is drawn with <a href="https://opensheetmusicdisplay.org" target="_blank" rel="noreferrer">OpenSheetMusicDisplay</a> and VexFlow.</li>
          <li>Built with <a href="https://react.dev" target="_blank" rel="noreferrer">React</a> and <a href="https://vitejs.dev" target="_blank" rel="noreferrer">Vite</a>.</li>
          <li>The sample scores, <i>Mimọ</i> by Alex Ugwu and <i>Alleluia Amen</i> by Ndem Brian, were typed from the composers’ handwritten manuscripts. They remain the composers’ work.</li>
        </ul>
        <p className="meta">Version {__APP_VERSION__}. Source code: <a href={REPO_URL} target="_blank" rel="noreferrer">{REPO_URL.replace('https://', '')}</a></p>
      </article>
    </SiteLayout>
  );
}

export function PrivacyPage() {
  return (
    <SiteLayout current="privacy">
      <article className="prose">
        <p className="eyebrow">Privacy policy</p>
        <h1>Statos collects no data</h1>
        <p className="lead">
          Statos has no accounts, no analytics, no advertising and no tracking. Your music and your settings are
          stored only in your own browser, on your own device. We never receive them.
        </p>
        <p className="meta">Last updated {UPDATED}.</p>

        <h2>The short version</h2>
        <table className="facts">
          <tbody>
            <tr><th>Accounts or sign-in</th><td>None</td></tr>
            <tr><th>Personal information collected</th><td>None</td></tr>
            <tr><th>Your scores sent to us</th><td>Never</td></tr>
            <tr><th>Cookies</th><td>None</td></tr>
            <tr><th>Analytics, tracking pixels, advertising</th><td>None</td></tr>
            <tr><th>Data sold or shared</th><td>Nothing to sell or share</td></tr>
          </tbody>
        </table>

        <h2>Where your music is kept</h2>
        <p>
          Scores, and preferences such as the panel width or which checks are switched on, are saved in your
          browser’s <i>local storage</i> on your device, so they are there when you come back. They are not uploaded
          anywhere. Other people, other browsers and other devices cannot see them.
        </p>
        <p>
          Because they live in your browser, clearing your browser’s site data, or using a private window, removes
          them. Use <b>Save</b> in the editor to keep a copy as a file.
        </p>

        <h2>Files you open and save</h2>
        <ul>
          <li><b>Import</b> reads the file you choose inside your browser. It is not uploaded.</li>
          <li><b>Save</b>, <b>MusicXML</b> and <b>Print</b> create the file or printout on your device. Nothing passes through a server of ours.</li>
          <li><b>Playback</b> is generated by your browser’s audio system.</li>
        </ul>

        <h2>Loading the website</h2>
        <p>
          Like any website, Statos has to be delivered to your browser by a web host. When you load it, your browser
          sends the host the usual technical details needed to deliver a page, such as your IP address and browser
          type, and the host may keep standard server logs under its own policies. We do not use these to identify or
          track you, and the page itself loads no third-party scripts, fonts, trackers or ads.
        </p>

        <h2>Links to other sites</h2>
        <p>
          Pages such as this one link to other websites (for example GitHub). Those sites have their own privacy
          policies, which apply if you follow the links.
        </p>

        <h2>Children</h2>
        <p>Statos collects no personal information from anyone, including children.</p>

        <h2>Future features</h2>
        <p>
          If optional features that need to send data off your device are ever added, such as AI reading of scanned
          sheets, they will be off unless you choose to use them, they will say clearly what is sent and to whom, and
          this policy will be updated before they are released.
        </p>

        <h2>Changes and questions</h2>
        <p>
          If this policy changes, the date at the top will change too. Questions are welcome on <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub</a>.
        </p>
      </article>
    </SiteLayout>
  );
}

export function TermsPage() {
  return (
    <SiteLayout current="terms">
      <article className="prose">
        <p className="eyebrow">Terms of use</p>
        <h1>Terms of use</h1>
        <p className="lead">Statos is free to use. These terms explain what you can expect from it and what is expected of you.</p>
        <p className="meta">Last updated {UPDATED}.</p>

        <h2>1. Using Statos</h2>
        <p>
          You may use Statos, free of charge, to write, check, convert, play, print and share music, for personal,
          church, educational or professional purposes. No account is needed. By using Statos you agree to these terms.
        </p>

        <h2>2. Your music</h2>
        <p>
          You own what you write in Statos. We do not receive, store or claim any rights over your scores; they stay on
          your device (see the <a href={href('privacy')}>privacy policy</a>).
        </p>
        <p>
          You are responsible for having the right to copy, arrange, print and share the music you enter. Many hymns
          and choral works are protected by copyright; get the composer’s or publisher’s permission where it is needed.
        </p>

        <h2>3. Acceptable use</h2>
        <p>Please don’t use Statos to infringe anyone’s copyright or other rights, or to interfere with the website or other people’s use of it.</p>

        <h2>4. Keep your own backups</h2>
        <p>
          Scores are stored in your browser and can be lost if browser data is cleared, the device is lost, or the
          browser fails. Save important scores as files and keep copies.
        </p>

        <h2>5. Check the results</h2>
        <p>
          Statos’ checks, conversions between sol-fa and staff notation, MusicXML import and export, and playback are
          aids, not guarantees. Always check music before performing, printing or publishing it.
        </p>

        <h2>6. No warranty</h2>
        <p>
          Statos is provided “as is” and “as available”, without warranties of any kind, express or implied, including
          fitness for a particular purpose, accuracy, or uninterrupted availability.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, the makers of Statos are not liable for any loss or damage arising from
          its use or inability to use it, including lost scores or data. Nothing in these terms limits liability that
          cannot be limited by law.
        </p>

        <h2>8. Changes</h2>
        <p>
          Statos may change, gain or lose features, or become unavailable. These terms may also be updated; the date at
          the top shows when. Continuing to use Statos after a change means you accept the updated terms.
        </p>

        <h2>9. Third-party software</h2>
        <p>Statos includes open-source components, such as OpenSheetMusicDisplay, VexFlow and React, which are used under their own licences.</p>

        <h2>10. Contact</h2>
        <p>Questions about these terms are welcome on <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub</a>.</p>
      </article>
    </SiteLayout>
  );
}
