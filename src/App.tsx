import { useCallback, useEffect, useState } from 'react';
import { Ambient } from './components/Ambient';
import { Catalogue } from './components/Catalogue';
import { CommandPalette } from './components/CommandPalette';
import { Conditions } from './components/Conditions';
import { Footer } from './components/Footer';
import { Masthead } from './components/Header';
import { HammerMoment } from './components/HammerMoment';
import { Hero } from './components/Hero';
import { LotDetail } from './components/LotDetail';
import { Saleroom } from './components/Saleroom';
import { TheRoom } from './components/TheRoom';
import { Ticker } from './components/Ticker';
import { engine } from './auction/engine';
import { LOTS } from './auction/lots';

export default function App() {
  const [openLot, setOpenLot] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The sale starts as soon as the room is entered.
  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, []);

  // Global keyboard: ⌘K / Ctrl-K palette, "/" focuses the catalogue search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === 'p') {
        // the catalogue is designed to print
        e.preventDefault();
        window.print();
        return;
      }
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '/' && !typing && !openLot) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.catbar__search input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openLot]);

  // Deep links: /#lot-003 opens that lot.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('lot-') && LOTS.some((lot) => lot.id === hash)) setOpenLot(hash);
  }, []);

  const open = useCallback((lotId: string) => {
    setOpenLot(lotId);
    window.history.replaceState(null, '', `#${lotId}`);
  }, []);

  // a shared deep link (…/#lot-006) should close cleanly on the back button
  useEffect(() => {
    const onHashChange = () => {
      const next = window.location.hash.replace('#', '');
      setOpenLot(next.startsWith('lot-') ? next : null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const close = useCallback(() => {
    setOpenLot(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const navigate = useCallback((lotId: string) => {
    if (!LOTS.some((lot) => lot.id === lotId)) return;
    setOpenLot(lotId);
    window.history.replaceState(null, '', `#${lotId}`);
  }, []);

  return (
    <>
      <a className="skip-link" href="#lots">
        Skip to the catalogue
      </a>
      <Ambient />
      <Masthead />
      <Ticker />
      <main>
        <Hero />
        <Catalogue onOpen={open} />
        <Saleroom onOpen={open} />
        <TheRoom />
        <Conditions />
      </main>
      <Footer onOpenPalette={() => setPaletteOpen(true)} />
      {openLot && <LotDetail lotId={openLot} onClose={close} onNavigate={navigate} />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenLot={open} />
      <HammerMoment />
    </>
  );
}
