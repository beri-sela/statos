import type { ReactNode } from 'react';
import { DEFAULT_PAGE_NUMBERS, DEFAULT_STYLE, type PageNumberStyle, type ScoreDoc } from '../music/types';
import { fontCss } from './Rich';

const CREDIT = '"Compose and transcribe at https://statos.site"';

/** CSS `content` for a page-number format. A total (“of 3”) is only correct when counting starts at 1. */
export function numberContent(p: PageNumberStyle): string {
  switch (p.format) {
    case 'page-of': return p.start === 1 ? '"Page " counter(page) " of " counter(pages)' : '"Page " counter(page)';
    case 'page': return '"Page " counter(page)';
    case 'dashes': return '"– " counter(page) " –"';
    default: return 'counter(page)';
  }
}

/**
 * Print-only rules for page numbers, built from the score's settings. The Statos credit is in the
 * bottom-right margin (styles.css); if the page number takes that corner, the credit moves to bottom-left.
 */
export function PrintStyle({ score }: { score: ScoreDoc }) {
  const style = { ...DEFAULT_STYLE, ...score.style };
  const p: PageNumberStyle = { ...DEFAULT_PAGE_NUMBERS, ...style.pageNumbers };
  if (!p.show) return null;
  const top = p.position.startsWith('top');
  const font = `${p.italic ? 'italic ' : ''}${p.weight} ${p.size}pt ${fontCss(p.font === 'music' ? style.font : p.font)}`;
  const box = `@${p.position}`;
  const creditMoves = p.position === 'bottom-right';
  const css = `@media print {
  html { counter-reset: page ${Math.round(p.start) - 1}; }
  @page {
    ${top ? 'margin-top: 13mm;' : ''}
    ${box} { content: ${numberContent(p)}; font: ${font}; color: #555; vertical-align: ${top ? 'bottom' : 'top'}; padding-${top ? 'bottom' : 'top'}: 3mm; }
    ${creditMoves ? `@bottom-left { content: ${CREDIT}; font: 7pt 'Segoe UI', system-ui, sans-serif; color: #888; vertical-align: top; padding-top: 3mm; }` : ''}
  }
  ${p.skipFirst ? `@page :first { ${box} { content: none; } }` : ''}
}`;
  return <style>{css}</style>;
}

/** What the page number reads on a given page, for showing on screen (the total is unknown until printing). */
function numberText(p: PageNumberStyle, n: number): string {
  switch (p.format) {
    case 'page-of': return p.start === 1 ? `Page ${n} of N` : `Page ${n}`;
    case 'page': return `Page ${n}`;
    case 'dashes': return `– ${n} –`;
    default: return String(n);
  }
}

/**
 * On-screen stand-in for the printed page margins: shows the page number and the Statos credit where
 * they will be printed. Hidden when printing, where the real page margins (above) take over.
 */
export function PageMarginPreview({ score, edge }: { score: ScoreDoc; edge: 'top' | 'bottom' }) {
  const style = { ...DEFAULT_STYLE, ...score.style };
  const p: PageNumberStyle = { ...DEFAULT_PAGE_NUMBERS, ...style.pageNumbers };
  const [vert, side] = p.position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
  const slots: Record<'left' | 'center' | 'right', ReactNode> = { left: null, center: null, right: null };
  if (p.show && vert === edge) {
    slots[side] = (
      <span title="Page number, as printed on each page (set in Appearance → Page numbers)" style={{
        fontFamily: fontCss(p.font === 'music' ? style.font : p.font), fontWeight: p.weight, fontStyle: p.italic ? 'italic' : 'normal',
        fontSize: `${p.size}pt`,
      }}>{p.skipFirst ? numberText(p, p.start + 1) + ' (from page 2)' : numberText(p, p.start)}</span>
    );
  }
  if (edge === 'bottom') {
    slots[p.show && p.position === 'bottom-right' ? 'left' : 'right'] = (
      <span className="credit" title="Printed small at the bottom of every page">Compose and transcribe at https://statos.site</span>
    );
  }
  if (!slots.left && !slots.center && !slots.right) return null;
  return (
    <div className={`page-margin ${edge}`} aria-hidden>
      <span>{slots.left}</span><span>{slots.center}</span><span>{slots.right}</span>
    </div>
  );
}
