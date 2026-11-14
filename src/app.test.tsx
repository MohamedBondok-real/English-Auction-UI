// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { act } from 'react';

/* jsdom has no canvas, and the artwork is decorative: stub just enough that
   the generative layer runs its code paths without drawing. */
const ctxStub = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'canvas') return {};
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
        return () => ({ addColorStop: () => {} });
      if (prop === 'measureText') return () => ({ width: 0 });
      return () => {};
    },
    set: () => true,
  },
) as unknown as CanvasRenderingContext2D;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxStub);
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { value: RO, writable: true, configurable: true });
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount() {
  const { default: App } = await import('./App');
  const { ThemeProvider } = await import('./state/theme');
  const { ToastProvider } = await import('./state/toasts');
  return render(
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('Martlet app', () => {
  it('renders the saleroom without runtime errors', async () => {
    await mount();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Gilded');
    expect(screen.getAllByText('Martlet').length).toBeGreaterThan(0);
  });

  it('lists every lot in the catalogue', async () => {
    await mount();
    const { LOTS } = await import('./auction/lots');
    for (const lot of LOTS) {
      expect(screen.getAllByText(lot.title).length).toBeGreaterThan(0);
    }
  });

  it('filters the catalogue by category', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    await mount();
    const grid = () => within(document.querySelector('#lots') as HTMLElement);
    const chips = screen.getByRole('group', { name: /filter by category/i });
    fireEvent.click(within(chips).getByRole('button', { name: /^Silver/ }));
    expect(grid().queryByText('The Martlet Codex')).toBeNull();
    expect(grid().queryByText('A George III silver ewer')).toBeTruthy();
  });

  it('searches the catalogue', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    await mount();
    const box = screen.getByRole('searchbox', { name: /search the catalogue/i });
    fireEvent.change(box, { target: { value: 'meteorite' } });
    const grid = () => within(document.querySelector('#lots') as HTMLElement);
    expect(grid().getByText('A slice of the Chelyabinsk meteorite')).toBeTruthy();
    expect(grid().queryByText('The Martlet Codex')).toBeNull();
  });

  it('toggles the mood, dark being the house default', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    await mount();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const toggle = screen.getByRole('button', { name: /switch to light mode/i });
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('opens a lot and shows its bidding panel', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    await mount();
    const open = screen.getByRole('button', { name: /open Lot 1:/i });
    act(() => {
      fireEvent.click(open);
    });
    const dialog = await screen.findByRole('dialog', { name: /The Martlet Codex/ });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText(/Live bidding/i)).toBeTruthy();
    expect(within(dialog).getByRole('tab', { name: /Provenance/i })).toBeTruthy();
  });

  it('copies a lot reference to the clipboard', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await mount();
    const grid = within(document.querySelector('#lots') as HTMLElement);
    const copyLot002 = grid.getByRole('button', { name: /copy Lot 2 reference/i });
    await act(async () => {
      fireEvent.click(copyLot002);
    });
    expect(writeText).toHaveBeenCalledWith('Lot 002');
    expect(copyLot002.getAttribute('aria-label')).toMatch(/copied to clipboard/i);
  });

  it('opens the command palette with the keyboard', async () => {
    const { fireEvent } = await import('@testing-library/dom');
    await mount();
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(await screen.findByRole('dialog', { name: /command palette/i })).toBeTruthy();
  });
});
