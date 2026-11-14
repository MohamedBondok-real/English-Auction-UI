import { memo } from 'react';
import { LOTS } from '../auction/lots';
import { engine } from '../auction/engine';
import type { FeedKind } from '../auction/types';
import { useFeed, useNowSeconds, useStats } from '../state/hooks';
import { timeAgo, gbpShort, num, percent, hhmmss } from '../lib/format';
import { SpeedControls } from './Header';
import {
  IconBolt,
  IconChevronDown,
  IconGavel,
  IconHammer,
  IconTrend,
  IconUsers,
} from './icons';

export function Saleroom({ onOpen }: { onOpen: (lotId: string) => void }) {
  const stats = useStats();

  const nextUp = LOTS.map((lot) => engine.getSale(lot.id))
    .filter((s) => s && s.stage === 'upcoming')
    .sort((a, b) => (a!.openedAt ?? 0) - (b!.openedAt ?? 0))[0];

  const progress = percent(stats.lotsOffered, LOTS.length);

  return (
    <section className="saleroom" id="saleroom">
      <div className="shell">
        <header className="section-head">
          <div className="section-head__left">
            <span className="section-head__index mono">02</span>
            <div>
              <h2 className="section-head__title">The Saleroom</h2>
              <p className="section-head__sub">
                Live desk · <SessionClock /> · paddle 118 is yours
              </p>
            </div>
          </div>
          <SpeedControls />
        </header>

        <div className="desk">
          <div className="desk__main">
            <div className="stat-strip">
              <Stat icon={<IconBolt size={15} />} label="Under the hammer" value={num(stats.live)} tone="live" />
              <Stat icon={<IconHammer size={15} />} label="Sold" value={num(stats.sold)} tone="win" />
              <Stat icon={<IconTrend size={15} />} label="Total hammer" value={gbpShort(stats.totalHammer)} />
              <Stat icon={<IconUsers size={15} />} label="Bids placed" value={num(stats.totalBids)} />
            </div>

            <div className="progress-card">
              <div className="progress-card__head">
                <span className="smallcaps">Sale progress</span>
                <span className="mono">
                  {stats.lotsOffered} / {LOTS.length} offered
                </span>
              </div>
              <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <span className="progress-track__fill" style={{ width: `${progress}%` }} />
                <span className="progress-track__sold" style={{ width: `${percent(stats.sold, LOTS.length)}%` }} />
              </div>
              <div className="progress-card__legend">
                <span>
                  <i className="swatch swatch--sold" aria-hidden="true" /> {stats.sold} sold
                </span>
                <span>
                  <i className="swatch swatch--passed" aria-hidden="true" /> {stats.passed} bought in
                </span>
                {nextUp && (
                  <span className="progress-card__next">
                    Next: Lot {String(nextUp.number).padStart(3, '0')}
                  </span>
                )}
              </div>
            </div>

            <Leaderboard onOpen={onOpen} />
          </div>

          <FeedPanel />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'live' | 'win';
}) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <span className="stat__icon">{icon}</span>
      <div>
        <span className="stat__label smallcaps">{label}</span>
        <span className="stat__value num">{value}</span>
      </div>
    </div>
  );
}

/** The clock ticks five times a second; it lives alone so the section doesn't. */
const SessionClock = memo(function SessionClock() {
  const now = useNowSeconds();
  return <span className="mono tnum">session clock {hhmmss(now)}</span>;
});

const Leaderboard = memo(function Leaderboard({ onOpen }: { onOpen: (lotId: string) => void }) {
  // subscribes to the sale so the board refreshes whenever any lot moves
  useStats();
  const rows = LOTS.map((lot) => engine.getSale(lot.id))
    .filter((s) => s && (s.stage === 'open' || s.stage === 'going'))
    .sort((a, b) => (b!.currentBid || 0) - (a!.currentBid || 0));

  return (
    <div className="board">
      <div className="board__head">
        <span className="smallcaps">Lots in play</span>
        <span className="board__hint mono">highest bid first</span>
      </div>
      {rows.length === 0 ? (
        <p className="board__empty">Between lots. The auctioneer is conferring with the desk.</p>
      ) : (
        <ul className="board__list">
          {rows.map((sale) => {
            const lot = LOTS[sale!.number - 1];
            return (
              <li key={sale!.lotId}>
                <button type="button" className="board__row" onClick={() => onOpen(sale!.lotId)}>
                  <span className="board__no mono">{String(lot.number).padStart(3, '0')}</span>
                  <span className="board__title">{lot.title}</span>
                  <span className={`board__stage board__stage--${sale!.stage}`}>
                    {sale!.stage === 'going' ? 'Going' : 'Open'}
                  </span>
                  <span className="board__bids mono">{sale!.bidCount}</span>
                  <span className="board__price num">{gbpShort(sale!.currentBid || lot.openingBid)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

const FEED_ICONS: Record<FeedKind, React.ReactNode> = {
  bid: <IconGavel size={13} />,
  sold: <IconHammer size={13} />,
  passed: <IconChevronDown size={13} />,
  open: <IconBolt size={13} />,
  going: <IconGavel size={13} />,
  win: <IconTrend size={13} />,
  outbid: <IconTrend size={13} />,
  watch: <IconUsers size={13} />,
};

const FeedPanel = memo(function FeedPanel() {
  const feed = useFeed();
  const now = useNowSeconds();

  return (
    <aside className="wire" aria-label="Saleroom wire, newest first">
      <div className="wire__head">
        <span className="wire__title">
          <span className="live-dot" aria-hidden="true" />
          The Wire
        </span>
        <span className="wire__meta mono">{feed.length} events</span>
      </div>
      <ol className="wire__list">
        {feed.map((event) => (
          <li key={event.id} className={`wire__item wire__item--${event.kind}`}>
            <span className="wire__glyph" aria-hidden="true">
              {FEED_ICONS[event.kind]}
            </span>
            <span className="wire__body">
              <span className="wire__text">{event.text}</span>
              <span className="wire__time mono">{timeAgo(event.at, now)}</span>
            </span>
            {event.amount !== undefined && <span className="wire__amount mono">{gbpShort(event.amount)}</span>}
          </li>
        ))}
        {feed.length === 0 && <li className="wire__empty">Awaiting the first call.</li>}
      </ol>
    </aside>
  );
});
