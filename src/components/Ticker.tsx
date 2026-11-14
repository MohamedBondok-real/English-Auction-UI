import { useFeed } from '../state/hooks';
import { gbpShort, hhmm } from '../lib/format';

/**
 * A continuous saleroom wire. Items are duplicated once so the CSS marquee
 * loops seamlessly; only the first eight events are carried.
 */
export function Ticker() {
  const feed = useFeed();
  const items = feed.slice(0, 9);

  return (
    <div className="ticker" aria-label="Live saleroom wire">
      <div className="ticker__badge">
        <span className="pulse-dot" aria-hidden="true" />
        <span>Wire</span>
      </div>
      <div className="ticker__viewport">
        {items.length === 0 ? (
          <p className="ticker__item">The saleroom is opening. Stand by.</p>
        ) : (
          <div className="ticker__track">
            {[0, 1].map((copy) => (
              <div className="ticker__group" key={copy} aria-hidden={copy === 1 || undefined}>
                {items.map((event) => (
                  <span key={`${copy}-${event.id}`} className={`ticker__item ticker__item--${event.kind}`}>
                    <span className="ticker__time mono">{hhmm(event.at)}</span>
                    <span className="ticker__text">{event.text}</span>
                    {event.amount !== undefined && (
                      <span className="ticker__amount mono">{gbpShort(event.amount)}</span>
                    )}
                    <span className="ticker__dot" aria-hidden="true" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
