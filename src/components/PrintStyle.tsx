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
