import type { ReactNode } from 'react';

/** Renders `**bold**` and `*italic*` inside a short piece of text. */
export function Rich({ text }: { text: string }) {
  return <>{render(text)}</>;
}

function render(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, k = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <b key={k++}>{render(m[1])}</b> : <i key={k++}>{render(m[2])}</i>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const FONTS: Record<string, { label: string; css: string }> = {
  sans: { label: 'Sans (Segoe UI)', css: "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif" },
  arial: { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  serif: { label: 'Serif (Georgia)', css: "Georgia, 'Times New Roman', serif" },
  times: { label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  book: { label: 'Book (Palatino)', css: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
  mono: { label: 'Monospace', css: "Consolas, 'Cascadia Mono', Menlo, monospace" },
};

export const fontCss = (key: string) => (FONTS[key] ?? FONTS.sans).css;
