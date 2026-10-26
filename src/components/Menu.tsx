import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  hint?: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** A drop-down menu like a desktop app's File menu; opens as a bottom sheet on phones. */
export function Menu({ label, items, title }: { label: ReactNode; items: (MenuItem | 'sep')[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="menu" ref={box}>
      <button className={`menu-button${open ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={open} data-tip={title}
        onClick={() => setOpen(o => !o)}>{label}</button>
      {open && (
        <>
          <div className="menu-scrim" onClick={() => setOpen(false)} />
          <div className="menu-list" role="menu">
            {items.map((it, i) => it === 'sep' ? <div key={i} className="menu-sep" role="separator" /> : (
              <button key={i} role="menuitem" className={it.danger ? 'danger-text' : ''} disabled={it.disabled}
                onClick={() => { setOpen(false); it.onSelect(); }}>
                <span className="menu-icon" aria-hidden>{it.icon}</span>
                <span className="menu-label">{it.label}</span>
                {it.hint && <span className="menu-hint">{it.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
