import { memo, useCallback, useMemo } from 'react';
import { useTilt } from '../hooks/useTilt';
import type { Lot } from '../auction/types';
import { engine } from '../auction/engine';
import { usePlayerLeading, useSale } from '../state/hooks';
import { useToggleWatch, useWatched } from '../state/watchlist';
import { useToast } from '../state/toasts';
import { gbp, gbpShort } from '../lib/format';
import { LotArt } from './LotArt';
import { Countdown, CountdownBar } from './Countdown';
import { Sparkline } from './Sparkline';
import { CopyValue } from './CopyValue';
import { IconArrowUpRight, IconStar } from './icons';

interface Props {
  lot: Lot;
  variant?: 'standard' | 'wide';
  onOpen: (lotId: string) => void;
  /** index within the grid, used to stagger entry animation */
  index?: number;
}

export const LotCard = memo(function LotCard({ lot, variant = 'standard', onOpen, index = 0 }: Props) {
  const sale = useSale(lot.id);
  const leading = usePlayerLeading(lot.id);
  const watched = useWatched();
  const toggleWatch = useToggleWatch();
  const { push } = useToast();
  const isWatched = watched.has(lot.id);
  const tilt = useTilt<HTMLElement>();

  const isLive = sale.stage === 'open' || sale.stage === 'going';
  const isUpcoming = sale.stage === 'upcoming';
  const isSold = sale.stage === 'sold';
  const isPassed = sale.stage === 'passed';

  const accept = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const result = engine.placePlayerBid(lot.id);
      if (!result.ok) {
        const message =
          result.reason === 'you-lead'
            ? 'You already hold the bid on this lot.'
            : result.reason === 'not-open'
              ? 'This lot has not opened yet.'
              : result.reason === 'sold'
                ? 'This lot is settled.'
                : result.reason === 'too-low'
                  ? 'Your standing limit is below the next bid.'
                  : 'The bid could not be placed.';
        push({ kind: 'outbid', text: message, lotNumber: lot.number });
        return;
      }
      push({
        kind: 'win',
        text: `You bid ${gbp(result.amount ?? 0)} · Lot ${lot.number}`,
        amount: result.amount,
        lotNumber: lot.number,
      });
    },
    [lot.id, lot.number, push],
  );

  const priceValues = useMemo(() => {
    const points = sale.history.map((r) => r.amount).reverse();
    return points.length > 1 ? points : [];
  }, [sale.history]);

  const stageLabel = isSold ? 'Sold' : isPassed ? 'Bought in' : isLive ? 'Live' : 'Upcoming';

  return (
    <article
      className={`lotcard lotcard--${variant} stage-${sale.stage} ${leading ? 'is-leading' : ''}`}
      style={{ '--stagger': `${Math.min(index, 12) * 45}ms` } as React.CSSProperties}
      data-lot={lot.number}
      {...tilt}
    >
      <span className="lotcard__glare" aria-hidden="true" />
      <button
        type="button"
        className="lotcard__hit"
        onClick={() => onOpen(lot.id)}
        aria-label={`Open Lot ${lot.number}: ${lot.title}`}
      />

      <div className="lotcard__media">
        <LotArt spec={lot.art} ratio={variant === 'wide' ? 16 / 11 : 4 / 5} glow={isLive} />

        <div className="lotcard__badges">
          <span className={`chip chip--stage chip--${sale.stage}`}>
            {isLive && <span className="live-dot" aria-hidden="true" />}
            {stageLabel}
          </span>
          {lot.featured && <span className="chip chip--gilt">Highlight</span>}
        </div>

        <button
          type="button"
          className={`lotcard__watch ${isWatched ? 'is-watched' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleWatch(lot.id);
          }}
          aria-label={isWatched ? `Stop watching Lot ${lot.number}` : `Watch Lot ${lot.number}`}
          aria-pressed={isWatched}
        >
          <IconStar size={15} filled={isWatched} />
        </button>

        <CopyValue
          value={`Lot ${String(lot.number).padStart(3, '0')}`}
          label={`Lot ${lot.number} reference`}
          className="lotcard__lot"
        >
          {String(lot.number).padStart(3, '0')}
        </CopyValue>

        {leading && (
          <span className="lotcard__ribbon">
            <span className="live-dot" aria-hidden="true" /> You hold the bid
          </span>
        )}
      </div>

      <div className="lotcard__body">
        <p className="lotcard__eyebrow">
          <span>{lot.category}</span>
          <span className="lotcard__dot" aria-hidden="true" />
          <span>{lot.dateLine}</span>
        </p>

        <h3 className="lotcard__title">{lot.title}</h3>
        <p className="lotcard__maker">{lot.maker}</p>

        <div className="lotcard__divider" aria-hidden="true" />

        <div className="lotcard__market">
          <div className="lotcard__pricelock">
            <span className="lotcard__pricelabel smallcaps">
              {isSold ? 'Hammer' : isPassed ? 'Bought in' : 'Current bid'}
            </span>
            <span className="lotcard__price num glow-text" key={`${sale.currentBid}-${sale.stage}`}>
              {sale.currentBid > 0 ? gbp(sale.currentBid) : gbp(lot.openingBid)}
            </span>
            <CopyValue
              value={String(sale.currentBid > 0 ? sale.currentBid : lot.openingBid)}
              label={`the price of Lot ${lot.number}`}
              variant="bare"
              className="lotcard__copy"
            >
              Copy
            </CopyValue>
            <span className="lotcard__meta mono">
              {sale.bidCount === 0 ? 'No bids yet' : `${sale.bidCount} bid${sale.bidCount === 1 ? '' : 's'}`}
              {sale.stage !== 'upcoming' && sale.reserveMet && ' · reserve met'}
            </span>
          </div>

          <div className="lotcard__aside">
            {priceValues.length > 1 ? (
              <Sparkline values={priceValues} className="lotcard__spark" />
            ) : (
              <span className="lotcard__est mono">
                Est. {gbpShort(lot.estimate[0])}–{gbpShort(lot.estimate[1])}
              </span>
            )}
          </div>
        </div>

        {isLive && (
          <>
            <CountdownBar deadline={sale.closesAt} windowMs={sale.windowMs} className="lotcard__countbar" />
            <Countdown
              deadline={sale.closesAt}
              prefix={sale.stage === 'going' ? 'Hammer in' : 'Last bid'}
              className="lotcard__countdown"
            />
          </>
        )}
        {isUpcoming && (
          <span className="lotcard__countdown">
            Opens in <Countdown deadline={sale.openedAt} />
          </span>
        )}
        {isSold && sale.soldAt && (
          <span className="lotcard__countdown is-settled">
            Hammered · {new Date(sale.soldAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        <div className="lotcard__actions">
          {isLive && !leading && (
            <button type="button" className="btn btn--bid" onClick={accept}>
              <span>Bid</span>
              <span className="num">{gbp(engine.nextBid(lot.id))}</span>
              <IconArrowUpRight size={14} />
            </button>
          )}
          {isLive && leading && (
            <span className="lotcard__leading">
              <span className="checkmark" aria-hidden="true">✓</span>
              Highest bidder
            </span>
          )}
          {!isLive && (
            <button type="button" className="btn btn--quiet" onClick={() => onOpen(lot.id)}>
              <span>{isSold || isPassed ? 'View result' : 'View lot'}</span>
            </button>
          )}
        </div>
      </div>

      {isSold && (
        <span className="stamp stamp--sold" aria-hidden="true">
          Sold
        </span>
      )}
      {isPassed && (
        <span className="stamp stamp--passed" aria-hidden="true">
          Bought in
        </span>
      )}
    </article>
  );
});
