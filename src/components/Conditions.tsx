import { useState } from 'react';
import { IconChevronDown, IconInfo } from './icons';

const CONDITIONS: { title: string; body: string }[] = [
  {
    title: 'Conduct of the sale',
    body: 'The sale is an open English auction conducted in pounds sterling. The auctioneer opens each lot at a figure not exceeding the low estimate and invites advances by the house increment. The auctioneer may refuse any bid, withdraw any lot, or re-offer a lot in the event of dispute, and is the sole judge of the bidding.',
  },
  {
    title: 'Bidding and paddle registration',
    body: 'Prospective bidders must register for a paddle before bidding. The bidder is bound by every bid made with the paddle issued, whether by the bidder or by another with the bidder’s knowledge. A standing limit recorded with the desk is executed one increment at a time and is not disclosed to the room.',
  },
  {
    title: 'Reserve and the hammer',
    body: 'Each lot is offered subject to a reserve agreed with the vendor and set at or below the low estimate. If the bidding does not reach the reserve the lot is bought in. On the fall of the hammer, the contract of sale is made between the auctioneer and the highest bidder, subject to these Conditions.',
  },
  {
    title: 'Buyer’s premium and taxes',
    body: 'A buyer’s premium of 26% of the hammer price is payable by the buyer. VAT may apply to the premium. Lots marked with a dagger are subject to temporary admission and may not be exported without further duty. The buyer is responsible for all duties and taxes arising from export.',
  },
  {
    title: 'Condition and inspection',
    body: 'Lots are sold as seen. Descriptions in the catalogue are prepared in good faith but do not constitute statements of fact. Condition reports are an opinion of the department. Prospective bidders are encouraged to inspect in person, commission an independent report, or request additional photography before bidding.',
  },
  {
    title: 'Payment and collection',
    body: 'Payment is due within seven days of the sale in cleared funds. Collection is by appointment from the saleroom at 18 Martlet Court. Lots not collected within thirty days may incur storage and handling charges. Title passes to the buyer on payment in full; risk passes on the fall of the hammer.',
  },
];

export function Conditions() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="conditions" id="conditions">
      <div className="shell">
        <header className="section-head">
          <div className="section-head__left">
            <span className="section-head__index mono">04</span>
            <div>
              <h2 className="section-head__title">Conditions &amp; Notes</h2>
              <p className="section-head__sub">For bidders, buyers and the curious</p>
            </div>
          </div>
          <p className="section-head__note">
            A demonstration saleroom. Nothing here constitutes an offer to sell, and no paddle
            carries any obligation.
          </p>
        </header>

        <div className="conditions__grid">
          <div className="accordion">
            {CONDITIONS.map((condition, i) => {
              const isOpen = open === i;
              return (
                <div key={condition.title} className={`acc ${isOpen ? 'is-open' : ''}`}>
                  <h3>
                    <button
                      type="button"
                      className="acc__trigger"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`cond-${i}`}
                    >
                      <span className="acc__index mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="acc__label">{condition.title}</span>
                      <span className="acc__caret" aria-hidden="true">
                        <IconChevronDown size={16} />
                      </span>
                    </button>
                  </h3>
                  <div className="acc__panel" id={`cond-${i}`} role="region" hidden={!isOpen}>
                    <p>{condition.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="notes">
            <div className="notes__card">
              <span className="notes__icon">
                <IconInfo size={16} />
              </span>
              <h3>Symbols used in this catalogue</h3>
              <dl className="notes__keys">
                <div>
                  <dt>
                    <span className="chip chip--gilt">Highlight</span>
                  </dt>
                  <dd>Featured by the department this season.</dd>
                </div>
                <div>
                  <dt>
                    <span className="chip chip--stage chip--going">
                      <span className="live-dot" /> Live
                    </span>
                  </dt>
                  <dd>The lot is under the hammer at this moment.</dd>
                </div>
                <div>
                  <dt>
                    <span className="chip chip--stage chip--sold">Sold</span>
                  </dt>
                  <dd>Knocked down to the last and highest bidder.</dd>
                </div>
                <div>
                  <dt>
                    <span className="chip chip--stage chip--passed">Bought in</span>
                  </dt>
                  <dd>Reserve not reached; the lot was withdrawn.</dd>
                </div>
              </dl>
            </div>

            <div className="notes__card notes__card--note">
              <h3>Increment ladder</h3>
              <table className="laddertable">
                <caption className="sr-only">The house increment for each price band</caption>
                <thead>
                  <tr>
                    <th scope="col">Band</th>
                    <th scope="col">Increment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>to £1,000</td>
                    <td className="mono">£50</td>
                  </tr>
                  <tr>
                    <td>£1,000 – £25,000</td>
                    <td className="mono">£250 – £1,000</td>
                  </tr>
                  <tr>
                    <td>£25,000 – £250,000</td>
                    <td className="mono">£2,500 – £5,000</td>
                  </tr>
                  <tr>
                    <td>above £500,000</td>
                    <td className="mono">£10,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
