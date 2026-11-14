import { useEffect, useState } from 'react';
import { engine } from '../auction/engine';
import { gbp } from '../lib/format';
import { IconGavel } from './icons';

interface Won {
  lotNumber: number;
  amount: number;
  title: string;
}

const DURATION = 5200;

/**
 * The fall of the hammer, when it falls for you: a short full-screen
 * celebration. Pure CSS animation, one timeout, no layout thrash.
 */
export function HammerMoment() {
  const [won, setWon] = useState<Won | null>(null);

  useEffect(() => {
    const off = engine.hammer.subscribe((event) => setWon(event));
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    if (!won) return;
    const timer = setTimeout(() => setWon(null), DURATION);
    return () => clearTimeout(timer);
  }, [won]);

  useEffect(() => {
    if (!won) return;
    const onKey = () => setWon(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [won]);

  if (!won) return null;

  return (
    <div className="hammer" role="status" aria-live="assertive" onClick={() => setWon(null)}>
      <div className="hammer__rays" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="hammer__card">
        <span className="hammer__icon" aria-hidden="true">
          <IconGavel size={26} />
        </span>
        <p className="hammer__eyebrow smallcaps">The hammer falls</p>
        <p className="hammer__amount num">{gbp(won.amount)}</p>
        <p className="hammer__lot">
          Lot {String(won.lotNumber).padStart(3, '0')} · {won.title}
        </p>
        <p className="hammer__note">Taken by paddle 118. Subject to settlement.</p>
      </div>
      <span className="hammer__progress" aria-hidden="true" />
    </div>
  );
}
