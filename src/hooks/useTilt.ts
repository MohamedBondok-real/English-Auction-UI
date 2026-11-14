import { useCallback, useRef } from 'react';

const MAX_DEG = 4.5;

/**
 * Pointer-driven 3D tilt for cards.
 *
 * Writes CSS custom properties straight to the node's style rather than
 * setting React state — a pointer move costs one style write, zero renders.
 * The whole effect is skipped for touch and for reduced-motion users.
 */
export function useTilt<T extends HTMLElement>() {
  const frame = useRef(0);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onPointerMove = useCallback(
    (event: React.PointerEvent<T>) => {
      if (prefersReduced || event.pointerType !== 'mouse') return;
      const node = event.currentTarget;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0) return;
        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;
        node.style.setProperty('--tilt-x', `${(-py * MAX_DEG).toFixed(2)}deg`);
        node.style.setProperty('--tilt-y', `${(px * MAX_DEG).toFixed(2)}deg`);
        node.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(1)}%`);
        node.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(1)}%`);
        node.dataset.tilting = 'true';
      });
    },
    [prefersReduced],
  );

  const onPointerLeave = useCallback((event: React.PointerEvent<T>) => {
    const node = event.currentTarget;
    cancelAnimationFrame(frame.current);
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
    delete node.dataset.tilting;
  }, []);

  return { onPointerMove, onPointerLeave };
}
