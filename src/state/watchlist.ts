import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'martlet.watchlist';
let watched: ReadonlySet<string> = load();
const listeners = new Set<() => void>();

function load(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set<string>();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set<string>();
  }
}

function commit(next: Set<string>) {
  watched = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function toggleWatch(lotId: string): void {
  const next = new Set(watched);
  if (next.has(lotId)) next.delete(lotId);
  else next.add(lotId);
  commit(next);
}

export function useWatched(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => watched, () => watched);
}

export function useToggleWatch(): (lotId: string) => void {
  return useCallback((lotId: string) => toggleWatch(lotId), []);
}
