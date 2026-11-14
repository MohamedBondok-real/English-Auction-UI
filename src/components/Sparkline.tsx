import { useMemo } from 'react';

interface Props {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Minimal SVG price-history line. Points are normalised in a single pass —
 * O(n) in the bid count, capped upstream at 40 records.
 */
export function Sparkline({ values, width = 104, height = 30, className = '' }: Props) {
  const path = useMemo(() => {
    if (values.length < 2) return '';
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    const stepX = width / (values.length - 1);
    const pad = 2;
    let d = '';
    for (let i = 0; i < values.length; i++) {
      const x = i * stepX;
      const y = height - pad - ((values[i] - min) / span) * (height - pad * 2);
      d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }, [values, width, height]);

  if (!path) return <div className={`spark spark--empty ${className}`} style={{ width, height }} />;

  return (
    <svg
      className={`spark ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
