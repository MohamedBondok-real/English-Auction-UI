import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { engine, PLAYER } from '../auction/engine';
import type { FeedEvent } from '../auction/types';

export interface Toast {
  id: number;
  kind: FeedEvent['kind'];
  text: string;
  amount?: number;
  lotNumber?: number;
}

const Ctx = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);
const TTL = 4200;
const MAX = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((prev) => {
        const next = [{ ...toast, id }, ...prev];
        return next.slice(0, MAX);
      });
      const timer = setTimeout(() => dismiss(id), TTL);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Engine → toast bridge (single subscription for the session)
  useEffect(() => {
    const off = engine.toasts.subscribe((event) => {
      push({ kind: event.kind, text: event.text, amount: event.amount, lotNumber: event.lotNumber });
    });
    return () => {
      off();
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, [push]);

  // Light haptic on your own wins, where supported.
  useEffect(() => {
    const off = engine.toasts.subscribe((event) => {
      if (event.kind === 'win' && navigator.vibrate) navigator.vibrate(24);
    });
    return off;
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), TTL - 320);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      className={`toast toast--${toast.kind}${leaving ? ' is-leaving' : ''}`}
      onClick={onDismiss}
      data-player={toast.kind === 'win' ? 'yes' : undefined}
    >
      <span className="toast__glyph" aria-hidden="true" />
      <span className="toast__body">
        <span className="toast__text">{toast.text}</span>
        {toast.lotNumber !== undefined && (
          <span className="toast__meta mono">
            {toast.kind === 'win' ? 'Congratulations' : 'Saleroom'} · Lot{' '}
            {String(toast.lotNumber).padStart(3, '0')}
          </span>
        )}
      </span>
    </button>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export { PLAYER };
