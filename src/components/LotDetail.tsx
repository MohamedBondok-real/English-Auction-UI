import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine, PLAYER } from '../auction/engine';
import { LOT_BY_ID, LOTS } from '../auction/lots';
import { usePlayerLeading, usePlayerMax, useSale } from '../state/hooks';
import { useToast } from '../state/toasts';
import { useToggleWatch, useWatched } from '../state/watchlist';
import { gbp, gbpShort, hhmm, timeAgo } from '../lib/format';
import { nextIncrement } from '../lib/increments';
import { LotArt } from './LotArt';
import { Countdown, CountdownBar } from './Countdown';
import { CopyValue } from './CopyValue';
import { useNowSeconds } from '../state/hooks';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconClose,
  IconGavel,
  IconStar,
} from './icons';

interface Props {
  lotId: string;
  onClose: () => void;
  onNavigate: (lotId: string) => void;
}

export function LotDetail({ lotId, onClose, onNavigate }: Props) {
  const lot = LOT_BY_ID.get(lotId);
  const sale = useSale(lotId);
  const leading = usePlayerLeading(lotId);
  const maxBid = usePlayerMax(lotId);
  const watched = useWatched();
  const toggleWatch = useToggleWatch();
  const { push } = useToast();
  const now = useNowSeconds();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<'catalogue' | 'provenance' | 'condition'>('catalogue');
  const [maxInput, setMaxInput] = useState('');

  useEffect(() => {
    engine.setFocus(lotId);
    return () => engine.setFocus(null);
  }, [lotId]);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocus.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    setTab('catalogue');
    setMaxInput('');
    const panel = panelRef.current;
    if (panel && typeof panel.scrollTo === 'function') panel.scrollTo({ top: 0 });
  }, [lotId]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        if (document.activeElement instanceof HTMLInputElement) return;
        e.preventDefault();
        engine.placePlayerBid(lotId);
      }
      if (e.key === 'ArrowRight' && lot) {
        onNavigate(LOTS_NEIGHBOUR(lot.number, 1));
      }
      if (e.key === 'ArrowLeft' && lot) {
        onNavigate(LOTS_NEIGHBOUR(lot.number, -1));
      }
    },
    [lot, lotId, onClose, onNavigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // simple focus containment
  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', trap);
    const firstFocusable = node.querySelector<HTMLElement>('button, [href], input');
    firstFocusable?.focus({ preventScroll: true });
    return () => node.removeEventListener('keydown', trap);
  }, []);

  const isLive = sale.stage === 'open' || sale.stage === 'going';
  const isSettled = sale.stage === 'sold' || sale.stage === 'passed';
  const next = engine.nextBid(lotId);
  const quick = useMemo(() => {
    const out: number[] = [];
    let cursor = next;
    out.push(cursor);
    for (let i = 0; i < 2; i++) {
      cursor += nextIncrement(cursor);
      out.push(cursor);
    }
    return out;
  }, [next]);

  if (!lot) return null;

  const bid = (amount?: number) => {
    if (amount !== undefined) engine.setPlayerMax(lotId, amount);
    const result = engine.placePlayerBid(lotId);
    if (result.ok) {
      push({
        kind: 'win',
        text: `You bid ${gbp(result.amount ?? 0)} · Lot ${lot.number}`,
        lotNumber: lot.number,
      });
    } else if (result.reason === 'you-lead') {
      push({ kind: 'win', text: 'You already hold the bid.', lotNumber: lot.number });
    } else {
      push({ kind: 'outbid', text: 'The bid was not accepted — check the ladder.', lotNumber: lot.number });
    }
  };

  const commitMax = () => {
    const value = Number(maxInput.replace(/[^0-9]/g, ''));
    if (!value || value <= 0) return;
    engine.setPlayerMax(lotId, value);
    push({
      kind: 'win',
      text: `Standing limit set at ${gbp(value)} · Lot ${lot.number}`,
      lotNumber: lot.number,
    });
    setMaxInput('');
  };

  const neighbours = useMemo(() => {
    const index = lot.number - 1;
    return {
      prev: index > 0 ? LOTS_NEIGHBOUR(lot.number, -1) : null,
      next: index < LOTS.length - 1 ? LOTS_NEIGHBOUR(lot.number, 1) : null,
    };
  }, [lot.number]);

  return createPortal(
    <div className="modal" role="presentation">
      <div className="modal__scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lot-detail-title"
        ref={panelRef}
      >
        <header className="modal__bar">
          <div className="modal__barleft">
            <span className="modal__lotno mono">Lot {String(lot.number).padStart(3, '0')}</span>
            <span className={`chip chip--stage chip--${sale.stage}`}>
              {isLive && <span className="live-dot" aria-hidden="true" />}
              {sale.stage === 'sold'
                ? 'Sold'
                : sale.stage === 'passed'
                  ? 'Bought in'
                  : sale.stage === 'going'
                    ? 'Going'
                    : sale.stage === 'open'
                      ? 'Live'
                      : 'Upcoming'}
            </span>
          </div>
          <div className="modal__barnav">
            <button
              type="button"
              className="iconbtn"
              onClick={() => toggleWatch(lot.id)}
              aria-pressed={watched.has(lot.id)}
              aria-label={watched.has(lot.id) ? 'Remove from watchlist' : 'Add to watchlist'}
              title="Watch this lot (W)"
            >
              <IconStar size={17} filled={watched.has(lot.id)} />
            </button>
            <button
              type="button"
              className="iconbtn"
              onClick={() => neighbours.prev && onNavigate(neighbours.prev)}
              disabled={!neighbours.prev}
              aria-label="Previous lot"
              title="Previous lot (←)"
            >
              <IconArrowRight size={17} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button
              type="button"
              className="iconbtn"
              onClick={() => neighbours.next && onNavigate(neighbours.next)}
              disabled={!neighbours.next}
              aria-label="Next lot"
              title="Next lot (→)"
            >
              <IconArrowRight size={17} />
            </button>
            <button type="button" className="iconbtn iconbtn--close" onClick={onClose} aria-label="Close lot" title="Close (Esc)">
              <IconClose size={18} />
            </button>
          </div>
        </header>

        <div className="modal__body">
          <div className="modal__visual">
            <LotArt spec={lot.art} ratio={1} glow={isLive} alt={`${lot.title} — generative artwork`} />
            <p className="modal__medium mono">
              {lot.medium}
              <br />
              {lot.dimensions}
            </p>
          </div>

          <div className="modal__content">
            <p className="modal__eyebrow">
              {lot.category} · {lot.dateLine}
            </p>
            <h2 className="modal__title" id="lot-detail-title">
              {lot.title}
            </h2>
            <p className="modal__maker">{lot.maker}</p>

            <p className="modal__lede">{lot.description}</p>

            <div className="modal__folio">
              <div>
                <span className="smallcaps">Estimate</span>
                <span className="num">
                  {gbp(lot.estimate[0])} – {gbp(lot.estimate[1])}
                </span>
              </div>
              <div>
                <span className="smallcaps">Opening bid</span>
                <span className="num">{gbp(lot.openingBid)}</span>
              </div>
              <div>
                <span className="smallcaps">Reserve</span>
                <span className="num">{sale.reserveMet ? 'met' : gbp(lot.reserve)}</span>
              </div>
            </div>

            <div className="tabs" role="tablist" aria-label="Lot information">
              {(
                [
                  ['catalogue', 'Catalogue note'],
                  ['provenance', 'Provenance'],
                  ['condition', 'Condition'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`tabs__tab ${tab === id ? 'is-active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="tabs__panel" role="tabpanel">
              {tab === 'catalogue' && (
                <div className="prose">
                  <p>{lot.essay}</p>
                  <dl className="deflist">
                    <div>
                      <dt>Medium</dt>
                      <dd>{lot.medium}</dd>
                    </div>
                    <div>
                      <dt>Dimensions</dt>
                      <dd>{lot.dimensions}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{lot.category}</dd>
                    </div>
                    {lot.literature && (
                      <div>
                        <dt>Literature</dt>
                        <dd>{lot.literature}</dd>
                      </div>
                    )}
                  </dl>
                  <ul className="tags">
                    {lot.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tab === 'provenance' && (
                <div className="prose">
                  <ol className="provenance">
                    {lot.provenance.map((line, i) => (
                      <li key={i}>
                        <span className="provenance__marker" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="prose__note">
                    Provenance is supplied by the vendor and published as a courtesy. Martlet does
                    not independently verify chains of ownership.
                  </p>
                </div>
              )}
              {tab === 'condition' && (
                <div className="prose">
                  <p>{lot.condition}</p>
                  <p className="prose__note">
                    Condition reports are an opinion of the department, not a statement of fact.
                    Prospective bidders are encouraged to inspect in person or commission an
                    independent report.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="bidpanel" aria-label="Bidding panel">
            <div className="bidpanel__head">
              <span className="smallcaps">Live bidding</span>
              {sale.leader && (
                <span className="bidpanel__leader mono">
                  {sale.leader.isPlayer ? 'You lead' : `Paddle ${sale.leader.paddle}`} ·{' '}
                  {sale.leader.city}
                </span>
              )}
            </div>

            <div className="bidpanel__amount" key={sale.currentBid}>
              <span className="bidpanel__figure num glow-text">
                {sale.currentBid > 0 ? gbp(sale.currentBid) : gbp(lot.openingBid)}
              </span>
              <span className="bidpanel__caption">
                {sale.bidCount === 0
                  ? 'Opening bid invited'
                  : `${sale.bidCount} bid${sale.bidCount === 1 ? '' : 's'} · ${sale.reserveMet ? 'reserve met' : 'reserve not yet met'}`}
              </span>
            </div>

            {!isSettled && <CountdownBar deadline={sale.closesAt} windowMs={sale.windowMs} />}
            {!isSettled && (
              <p className="bidpanel__timer">
                <Countdown deadline={sale.stage === 'upcoming' ? sale.openedAt : sale.closesAt} prefix={sale.stage === 'upcoming' ? 'Opens in' : sale.stage === 'going' ? 'Hammer in' : 'Window closes'} />
              </p>
            )}

            {isSettled ? (
              <div className={`bidpanel__result ${sale.stage === 'sold' ? 'is-sold' : 'is-passed'}`}>
                <IconCheck size={16} />
                <div>
                  <strong>
                    {sale.stage === 'sold'
                      ? `Sold at ${gbp(sale.soldPrice ?? sale.currentBid)}`
                      : 'Bought in'}
                  </strong>
                  <span>
                    {sale.stage === 'sold'
                      ? sale.leader?.isPlayer
                        ? 'Congratulations — the lot is yours, subject to settlement.'
                        : `To paddle ${sale.leader?.paddle ?? '—'}${sale.leader ? `, ${sale.leader.city}` : ''}.`
                      : 'The reserve was not reached. The lot may re-enter a later sale.'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="bidpanel__ladder">
                  {quick.map((amount, i) => (
                    <button
                      key={amount}
                      type="button"
                      className={`ladder ${i === 0 ? 'ladder--primary' : ''} ${leading && i === 0 ? 'is-disabled' : ''}`}
                      onClick={() => bid(amount)}
                      disabled={!isLive}
                    >
                      <IconBolt size={13} />
                      <span className="num">{gbp(amount)}</span>
                      {i === 0 && <span className="ladder__hint mono">next</span>}
                    </button>
                  ))}
                </div>

                <div className="bidpanel__standing">
                  <label htmlFor="standing-limit">Standing limit</label>
                  <div className="bidpanel__standingrow">
                    <input
                      id="standing-limit"
                      inputMode="numeric"
                      placeholder={maxBid ? gbp(maxBid) : 'e.g. 320000'}
                      value={maxInput}
                      onChange={(e) => setMaxInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitMax()}
                    />
                    <button type="button" className="btn btn--ghost btn--sm" onClick={commitMax}>
                      Set
                    </button>
                  </div>
                  <p className="bidpanel__hint">
                    {maxBid
                      ? `The desk will bid up to ${gbp(maxBid)} on your behalf, one increment at a time.`
                      : 'The auctioneer bids for you, increment by increment, up to your limit.'}
                  </p>
                  {maxBid && (
                    <button
                      type="button"
                      className="bidpanel__clear"
                      onClick={() => engine.setPlayerMax(lotId, null)}
                    >
                      Clear limit
                    </button>
                  )}
                </div>

                {leading && (
                  <p className="bidpanel__leading">
                    <span className="live-dot" aria-hidden="true" /> You hold the high bid
                  </p>
                )}
              </>
            )}

            <div className="bidpanel__history">
              <div className="bidpanel__historyhead">
                <span className="smallcaps">Bid history</span>
                <span className="mono">{sale.history.length ? `${sale.history.length} shown` : ''}</span>
              </div>
              {sale.history.length === 0 ? (
                <p className="bidpanel__nohistory">
                  {isSettled ? 'This lot drew no bids.' : 'No bids yet. Be first at the lectern.'}
                </p>
              ) : (
                <ol className="bidhistory">
                  {sale.history.map((record, i) => (
                    <li
                      key={record.id}
                      className={`bidhistory__row ${record.bidder.isPlayer ? 'is-me' : ''} ${i === 0 ? 'is-latest' : ''}`}
                    >
                      <span className="bidhistory__paddle mono">{record.bidder.paddle}</span>
                      <span className="bidhistory__who">
                        {record.bidder.isPlayer ? 'You' : record.bidder.name}
                        <span className="bidhistory__city">{record.bidder.city}</span>
                      </span>
                      <span className="bidhistory__amount num">{gbp(record.amount)}</span>
                      <span className="bidhistory__time mono">{timeAgo(record.at, now)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="bidpanel__foot">
              <CopyValue value={String(PLAYER.paddle)} label="your paddle number" variant="bare">
                Paddle {PLAYER.paddle}
              </CopyValue>
              <span className="mono">{gbpShort(sale.currentBid || lot.openingBid)}</span>
              <span className="mono">Session {hhmm(now)}</span>
            </div>
          </aside>
        </div>

        <footer className="modal__foot">
          <span className="mono">Press <kbd>B</kbd> to bid · <kbd>←</kbd><kbd>→</kbd> to move · <kbd>Esc</kbd> to close</span>
          <span className="mono modal__footright">
            <IconGavel size={14} /> Lot {String(lot.number).padStart(3, '0')} of 016
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function LOTS_NEIGHBOUR(number: number, direction: 1 | -1): string {
  const next = Math.min(LOTS.length, Math.max(1, number + direction));
  return `lot-${String(next).padStart(3, '0')}`;
}
