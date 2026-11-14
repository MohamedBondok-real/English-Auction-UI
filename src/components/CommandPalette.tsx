import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LOTS } from '../auction/lots';
import { engine } from '../auction/engine';
import { gbpShort } from '../lib/format';
import { IconCommand, IconGavel, IconMoon, IconSearch, IconSun, IconArrowRight } from './icons';
import { useTheme } from '../state/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLot: (lotId: string) => void;
}

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: string;
};

export function CommandPalette({ open, onClose, onOpenLot }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const commands = useMemo<Command[]>(() => {
    const lotCommands: Command[] = LOTS.map((lot) => ({
      id: `lot:${lot.id}`,
      label: lot.title,
      hint: `${String(lot.number).padStart(3, '0')} · ${lot.category} · ${gbpShort(lot.estimate[0])}`,
      icon: <IconGavel size={15} />,
      group: 'Lots',
      run: () => onOpenLot(lot.id),
    }));
    const navCommands: Command[] = [
      { id: 'nav-catalogue', label: 'Go to the catalogue', icon: <IconArrowRight size={15} />, group: 'Navigate', run: () => scrollTo('#lots') },
      { id: 'nav-saleroom', label: 'Go to the saleroom', icon: <IconArrowRight size={15} />, group: 'Navigate', run: () => scrollTo('#saleroom') },
      { id: 'nav-room', label: 'How the sale is conducted', icon: <IconArrowRight size={15} />, group: 'Navigate', run: () => scrollTo('#the-room') },
      { id: 'nav-conditions', label: 'Conditions of sale', icon: <IconArrowRight size={15} />, group: 'Navigate', run: () => scrollTo('#conditions') },
    ];
    const actionCommands: Command[] = [
      {
        id: 'act-theme',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        icon: theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />,
        group: 'Actions',
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'act-speed',
        label: 'Set sale speed to 2×',
        icon: <IconCommand size={15} />,
        group: 'Actions',
        run: () => engine.setSpeed(2),
      },
    ];
    return [...navCommands, ...actionCommands, ...lotCommands];
  }, [onOpenLot, theme, setTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 9);
    return commands
      .filter((c) => `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase().includes(q))
      .slice(0, 9);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = filtered[active];
        if (pick) {
          pick.run();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  let lastGroup = '';

  return createPortal(
    <div className="cmdk" role="presentation">
      <div className="cmdk__scrim" onClick={onClose} aria-hidden="true" />
      <div className="cmdk__panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk__search">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lots, jump to a section, switch the mood…"
            aria-label="Command"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="cmdk__list" role="listbox" aria-label="Results">
          {filtered.length === 0 && <li className="cmdk__empty">No results. The catalogue is finite, but patient.</li>}
          {filtered.map((command, i) => {
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;
            return (
              <li key={command.id} role="option" aria-selected={i === active}>
                {showGroup && <p className="cmdk__group">{command.group}</p>}
                <button
                  type="button"
                  className={`cmdk__item ${i === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    command.run();
                    onClose();
                  }}
                >
                  <span className="cmdk__icon">{command.icon}</span>
                  <span className="cmdk__label">{command.label}</span>
                  {command.hint && <span className="cmdk__hint mono">{command.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <footer className="cmdk__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⌘</kbd><kbd>K</kbd> toggle</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function scrollTo(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
