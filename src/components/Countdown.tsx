import { memo } from 'react';
import { useNow } from '../state/hooks';
import { countdown } from '../lib/format';

interface Props {
  /** epoch ms in engine time */
  deadline: number;
  prefix?: string;
  className?: string;
  urgentBelow?: number;
}

/**
 * Isolated clock consumer: only this node re-renders on each engine tick,
 * not the lot card around it.
 */
export const Countdown = memo(function Countdown({
  deadline,
  prefix,
  className = '',
  urgentBelow = 5500,
}: Props) {
  const now = useNow();
  const remaining = Math.max(0, deadline - now);
  const urgent = remaining <= urgentBelow && remaining > 0;

  return (
    <span className={`countdown ${urgent ? 'is-urgent' : ''} ${className}`}>
      {prefix && <span className="countdown__prefix">{prefix}</span>}
      <span className="countdown__digits mono tnum">{countdown(remaining)}</span>
    </span>
  );
});

/** A thin draining bar that mirrors the countdown. */
export const CountdownBar = memo(function CountdownBar({
  deadline,
  windowMs,
  className = '',
}: {
  deadline: number;
  windowMs: number;
  className?: string;
}) {
  const now = useNow();
  const left = Math.max(0, deadline - now);
  const pct = windowMs > 0 ? Math.min(100, (left / windowMs) * 100) : 0;
  return (
    <span className={`countbar ${className}`} aria-hidden="true">
      <span className="countbar__fill" style={{ transform: `scaleX(${pct / 100})` }} />
    </span>
  );
});
