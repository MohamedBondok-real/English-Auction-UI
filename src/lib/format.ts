/** Formatting helpers — all formatters are constructed once and reused. */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** £1,240,000 */
export const gbp = (value: number): string => GBP.format(value);

/** £1.24m · £840k · £950 */
export function gbpShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `£${m >= 10 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')}m`;
  }
  if (value >= 100_000) return `£${Math.round(value / 1000)}k`;
  if (value >= 10_000) return `£${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return gbp(value);
}

export const num = (value: number): string => NUM.format(value);

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** mm:ss, clamped at zero. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** 18:42 using en-GB 24h clock. */
export function hhmm(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 18:42:07 */
export function hhmmss(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** "just now" · "42s ago" · "3m ago" */
export function timeAgo(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 1500) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

/** Lot 001 */
export const lotLabel = (n: number): string => `Lot ${String(n).padStart(3, '0')}`;

/** Thursday 14 November, 6:00 pm */
export function longDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}
