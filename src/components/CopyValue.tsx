import { useCallback, useRef, useState, type ReactNode } from 'react';
import { IconCheck, IconCopy } from './icons';

interface Props {
  /** the text that lands on the clipboard */
  value: string;
  /** what the user sees — defaults to `value` */
  children?: ReactNode;
  className?: string;
  label?: string;
  /** prefer an inline chip (default) or a bare inline span */
  variant?: 'chip' | 'bare';
}

/**
 * Hover the figure, click to copy it — the utility-tool gesture, applied to
 * the saleroom's most copied data: prices, lot numbers and paddles.
 *
 * The clipboard call is guarded and self-reverting; nothing is stored, and a
 * failed write (insecure context, denied permission) still confirms nothing.
 */
export function CopyValue({ value, children, className = '', label, variant = 'chip' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      try {
        await navigator.clipboard.writeText(value);
        setState('copied');
      } catch {
        // fall back for insecure contexts and older engines
        try {
          const input = document.createElement('textarea');
          input.value = value;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(input);
          setState(ok ? 'copied' : 'failed');
        } catch {
          setState('failed');
        }
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('idle'), 1400);
    },
    [value],
  );

  const copied = state === 'copied';

  return (
    <button
      type="button"
      className={`copy copy--${variant} ${copied ? 'is-copied' : ''} ${className}`}
      onClick={copy}
      title={copied ? 'Copied' : `Copy ${label ?? value}`}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${label ?? value} to clipboard`}
      data-state={state}
    >
      <span className="copy__text">{children ?? value}</span>
      <span className="copy__glyph" aria-hidden="true">
        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
      </span>
      <span className="copy__flash" aria-hidden="true" />
    </button>
  );
}
