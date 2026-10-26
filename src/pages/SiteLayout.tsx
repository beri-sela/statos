import logo from '../assets/logo.svg';
import type { ReactNode } from 'react';
import { href } from '../router';

export const REPO_URL = 'https://github.com/beri-sela/statos';

const LINKS: [string, string][] = [['help', 'Help'], ['about', 'About'], ['privacy', 'Privacy'], ['terms', 'Terms']];

/** Frame for the help and information pages: header with navigation, content, footer. */
export function SiteLayout({ current, children, wide = false }: { current: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="site">
      <header className="site-head">
        <a className="brand" href={href('')} aria-label="Statos editor"><img src={logo} alt="" width={26} height={26} />Statos</a>
        <nav className="site-nav" aria-label="Pages">
          {LINKS.map(([path, label]) => (
            <a key={path} href={href(path)} aria-current={current === path ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
        <a className="site-open" href={href('')}>Open the editor →</a>
      </header>
      <main className={`site-main${wide ? ' wide' : ''}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <span>Statos — Staff and Tonic Sol-fa</span>
      <nav aria-label="Site">
        <a href={href('')}>Editor</a>
        {LINKS.map(([path, label]) => <a key={path} href={href(path)}>{label}</a>)}
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
      </nav>
      <span>No accounts. No tracking. Your music stays in your browser.</span>
    </footer>
  );
}
