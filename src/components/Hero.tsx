import { useEffect, useRef, useState } from 'react';
import { LOTS, SALE } from '../auction/lots';
import { useNow, useRaf, useStats } from '../state/hooks';
import { engine } from '../auction/engine';
import { gbp, gbpShort, longDate, num } from '../lib/format';
import { LotArt } from './LotArt';
import { CopyValue } from './CopyValue';
import { Countdown, CountdownBar } from './Countdown';
import { IconArrowRight, IconGavel, IconStar } from './icons';
import { useToggleWatch, useWatched } from '../state/watchlist';

const HERO_LOT = LOTS.find((lot) => lot.number === 1) ?? LOTS[0];
const SPOTLIGHT = LOTS.filter((lot) => lot.featured).slice(0, 3);

export function Hero() {
  const stats = useStats();
  const [openedAt] = useState(() => Date.now());

  return (
    <section className="hero" id="top">
      <div className="hero__layout shell">
        <div className="hero__copy">
          <p className="hero__eyebrow">
            <span className="rule" aria-hidden="true" />
            <span className="smallcaps">
              Winter Season 2026 · Sale {SALE.saleNumber} · {longDate(openedAt)}
            </span>
          </p>

          <h1 className="hero__title">
            <span className="hero__title-line">The</span>
            <span className="hero__title-line hero__title-line--accent">Gilded</span>
            <span className="hero__title-line">
              Hour<span className="hero__title-mark">.</span>
            </span>
          </h1>

          <p className="hero__lede">
            Sixteen lots offered in the <em>English manner</em> — open, ascending bids called
            aloud until no one will go higher, and the hammer falls. Take a paddle. The room is
            already bidding.
          </p>

          <div className="hero__actions">
            <a className="btn btn--primary" href="#lots">
              <span>Enter the catalogue</span>
              <IconArrowRight size={16} />
            </a>
            <a className="btn btn--ghost" href="#saleroom">
              <span className="live-dot" aria-hidden="true" />
              Watch the saleroom
            </a>
          </div>

          <dl className="hero__figures">
            <div>
              <dt className="smallcaps">Lots</dt>
              <dd className="num">{num(LOTS.length)}</dd>
            </div>
            <div>
              <dt className="smallcaps">Under the hammer</dt>
              <dd className="num">{stats.live}</dd>
            </div>
            <div>
              <dt className="smallcaps">Hammered</dt>
              <dd className="num">{gbpShort(stats.totalHammer)}</dd>
            </div>
            <div>
              <dt className="smallcaps">Bids placed</dt>
              <dd className="num">{num(stats.totalBids)}</dd>
            </div>
          </dl>
        </div>

        <div className="hero__stage">
          <SpotlightCarousel />
          <HeroHud />
        </div>
      </div>

      <div className="hero__marquee" aria-hidden="true">
        <div className="hero__marquee-track">
          {[0, 1].map((copy) => (
            <div className="hero__marquee-group" key={copy}>
              {LOTS.map((lot) => (
                <span key={`${copy}-${lot.id}`} className="hero__marquee-item">
                  <span className="mono">Lot {String(lot.number).padStart(3, '0')}</span>
                  <span>{lot.title}</span>
                  <span className="hero__marquee-dot" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— rotating spotlight ————————————————————— */
function SpotlightCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const lot = SPOTLIGHT[index];
  const watched = useWatched();
  const toggleWatch = useToggleWatch();
  const isWatched = watched.has(lot.id);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SPOTLIGHT.length), 7600);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="spotlight__art" key={lot.id}>
        <LotArt spec={lot.art} ratio={5 / 6} alt={`${lot.title} — generative artwork`} glow />
      </div>

      <div className="spotlight__halo" aria-hidden="true" />
      <div className="spotlight__caption">
        <span className="spotlight__eyebrow mono">
          Lot {String(lot.number).padStart(3, '0')} · {lot.category}
        </span>
        <span className="spotlight__title">{lot.title}</span>
        <span className="spotlight__est mono">
          Est. {gbp(lot.estimate[0])} – {gbp(lot.estimate[1])}
        </span>
      </div>

      <button
        type="button"
        className={`spotlight__watch ${isWatched ? 'is-watched' : ''}`}
        onClick={() => toggleWatch(lot.id)}
        aria-pressed={isWatched}
        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <IconStar size={15} filled={isWatched} />
      </button>

      <div className="spotlight__dots" role="tablist" aria-label="Spotlight lots">
        {SPOTLIGHT.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${s.title}`}
            className={`spotlight__dot ${i === index ? 'is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ————————————————————— live hero HUD ————————————————————— */
function HeroHud() {
  const sale = engine.getSale(HERO_LOT.id);
  const now = useNow();
  const [flash, setFlash] = useState(0);
  const prevBid = useRef(sale?.currentBid ?? 0);

  useEffect(() => {
    if (!sale) return;
    if (sale.currentBid !== prevBid.current) {
      prevBid.current = sale.currentBid;
      setFlash((f) => f + 1);
    }
  }, [sale]);

  if (!sale) return null;

  const remaining = Math.max(0, sale.closesAt - now);
  const isSettled = sale.stage === 'sold' || sale.stage === 'passed';

  return (
    <div className="hud">
      <div className="hud__head">
        <span className="hud__live">
          <span className={`live-dot ${isSettled ? 'is-settled' : ''}`} aria-hidden="true" />
          <span className="smallcaps">{isSettled ? 'Lot 001 settled' : 'Now taking bids'}</span>
        </span>
        {!isSettled && (
          <Countdown deadline={sale.closesAt} prefix={sale.stage === 'going' ? 'Hammer in' : 'Opens to'} urgentBelow={5500} />
        )}
      </div>

      <div className="hud__bid" key={flash}>
        <span className="hud__amount num glow-text">
          {sale.currentBid > 0 ? gbp(sale.currentBid) : gbp(HERO_LOT.openingBid)}
        </span>
        <CopyValue
          value={String(sale.currentBid > 0 ? sale.currentBid : HERO_LOT.openingBid)}
          label="the current bid"
          variant="bare"
          className="hud__copy"
        >
          {sale.bidCount === 0
            ? 'Opening bid invited'
            : `${sale.bidCount} bid${sale.bidCount === 1 ? '' : 's'}`}
          {sale.leader && ` · Paddle ${sale.leader.paddle}`}
        </CopyValue>
      </div>

      <CountdownBar deadline={sale.closesAt} windowMs={sale.windowMs} />

      <div className="hud__foot">
        <span className={`hud__reserve ${sale.reserveMet ? 'is-met' : ''}`}>
          {sale.reserveMet ? 'Reserve met' : 'Reserve not yet met'}
        </span>
        <span className="hud__est mono">
          Est. {gbpShort(HERO_LOT.estimate[0])}–{gbpShort(HERO_LOT.estimate[1])}
        </span>
      </div>

      <a href="#lots" className="hud__cta">
        <IconGavel size={15} />
        <span>Bid on Lot 001</span>
        <IconArrowRight size={15} />
      </a>

      {!isSettled && remaining < 5500 && (
        <span className="hud__urgent" aria-hidden="true" />
      )}
    </div>
  );
}

/** Small decorative second-hand ring used in the hero background. */
export function GiltRing() {
  const ref = useRef<SVGCircleElement>(null);
  useRaf((t) => {
    const el = ref.current;
    if (!el) return;
    el.style.strokeDashoffset = String(-t * 12);
  });
  return (
    <svg className="gilt-ring" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="96" className="gilt-ring__a" />
      <circle cx="100" cy="100" r="88" className="gilt-ring__b" ref={ref} />
    </svg>
  );
}
