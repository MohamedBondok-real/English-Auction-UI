/** Tiny typed event emitter — O(1) subscribe/unsubscribe, zero dependencies. */
export class Emitter<T> {
  private handlers = new Set<(value: T) => void>();

  subscribe = (handler: (value: T) => void): (() => void) => {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  };

  emit = (value: T): void => {
    for (const handler of this.handlers) handler(value);
  };
}
