import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { engine, PLAYER } from '../auction/engine';
import type { LotSale, SaleStats } from '../auction/types';

/** Subscribe to a single lot's snapshot. Only that lot re-renders on a bid. */
export function useSale(lotId: string): LotSale {
  const subscribe = useCallback(
    (onChange: () => void) => engine.subscribeLot(lotId, onChange),
    [lotId],
  );
  const getSnapshot = useCallback(() => engine.getSale(lotId), [lotId]);
  const sale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!sale) throw new Error(`Unknown lot: ${lotId}`);
  return sale;
}

/** Snapshot getter identity is stable per lot id. */
export function usePlayerLeading(lotId: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => engine.subscribeLot(lotId, onChange),
    [lotId],
  );
  return useSyncExternalStore(
    subscribe,
    () => engine.isPlayerLeading(lotId),
    () => engine.isPlayerLeading(lotId),
  );
}

export function usePlayerMax(lotId: string): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => engine.subscribeLot(lotId, onChange),
    [lotId],
  );
  return useSyncExternalStore(
    subscribe,
    () => engine.getPlayerMax(lotId),
    () => engine.getPlayerMax(lotId),
  );
}

export function useStats(): SaleStats {
  return useSyncExternalStore(engine.subscribeGlobal, () => engine.getStats(), () => engine.getStats());
}

export function useFeed() {
  return useSyncExternalStore(engine.subscribeGlobal, () => engine.getFeed(), () => engine.getFeed());
}

/** Re-renders on the shared engine clock. Use sparingly: countdowns, gauges. */
export function useNow(): number {
  return useSyncExternalStore(engine.subscribeClock, () => engine.now, () => engine.now);
}

/** Clock rounded to whole seconds: re-renders at most once a second. */
export function useNowSeconds(): number {
  return useSyncExternalStore(
    engine.subscribeClock,
    () => Math.floor(engine.now / 1000),
    () => Math.floor(engine.now / 1000),
  );
}

/**
 * requestAnimationFrame loop for genuine canvas animation. The callback
 * receives elapsed seconds and runs only while `active` is true.
 */
export function useRaf(callback: (t: number, dt: number) => void, active = true): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      cbRef.current(t / 1000, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export { PLAYER };
