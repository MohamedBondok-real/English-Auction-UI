import { useEffect, useState } from 'react';
import { useTheme } from '../state/theme';
import { useNow, useStats } from '../state/hooks';
import { engine } from '../auction/engine';
import { gbpShort, hhmm } from '../lib/format';
import { IconMoon, IconPause, IconPlay, IconSun } from './icons';

const SPEEDS = [0.5, 1, 2, 4] as const;

export function Masthead() {
  const { theme, toggle } = useTheme();
  const stats = useStats();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let last = false;
    const onScroll = () => {
      const next = window.scrollY > 24;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`masthead ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="masthead__inner shell">
        <a className="brand" href="#top" aria-label="Martlet, auction house — top of page">
          <Mark />
          <span className="brand__type">
            <span className="brand__name">Martlet</span>
            <span className="brand__sub">Auctioneers · London</span>
          </span>
        </a>

        <nav className="masthead__links" aria-label="Saleroom sections">
          <a href="#lots">Catalogue</a>
          <a href="#saleroom">Saleroom</a>
          <a href="#the-room">The Room</a>
          <a href="#conditions">Conditions</a>
        </nav>

        <div className="masthead__tools">
          <span className="masthead__stat" title="Lots under the hammer right now">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="mono">{stats.live}</span>
            <span className="masthead__stat-label">live</span>
          </span>
          <span className="masthead__stat masthead__stat--desk" title="Total hammer so far">
            <span className="mono">{gbpShort(stats.totalHammer)}</span>
            <span className="masthead__stat-label">hammered</span>
          </span>

          <SaleClock />

          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="theme-toggle__thumb" aria-hidden="true">
              {theme === 'dark' ? <IconMoon size={15} /> : <IconSun size={15} />}
            </span>
            <span className="theme-toggle__track" aria-hidden="true">
              <IconSun size={13} className="theme-toggle__i theme-toggle__i--sun" />
              <IconMoon size={13} className="theme-toggle__i theme-toggle__i--moon" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity="0.4" />
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <rect x="11.5" y="15" width="17" height="7.5" rx="1.6" transform="rotate(38 20 18.7)" fill="currentColor" fillOpacity="0.9" stroke="none" />
          <path d="M23.4 26.2 35 39" />
          <path d="M10 39.5h12.5" strokeWidth="3.2" />
        </g>
      </svg>
    </span>
  );
}

function SaleClock() {
  const now = useNow();
  return (
    <span className="saleclock" title="Saleroom clock — the sale has priority">
      <span className="saleclock__label smallcaps">Saleroom</span>
      <span className="saleclock__time mono tnum">{hhmm(now)}</span>
    </span>
  );
}

export function SpeedControls() {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    engine.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    engine.setPaused(paused);
  }, [paused]);

  return (
    <div className="speedctl" role="group" aria-label="Auction pace">
      <button
        type="button"
        className="speedctl__btn"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        title={paused ? 'Resume the sale' : 'Hold the sale'}
      >
        {paused ? <IconPlay size={13} /> : <IconPause size={13} />}
        <span>{paused ? 'Resume' : 'Hold'}</span>
      </button>
      <span className="speedctl__divider" aria-hidden="true" />
      <div className="speedctl__speeds" role="radiogroup" aria-label="Sale speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            className={`speedctl__speed ${speed === s ? 'is-active' : ''}`}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
