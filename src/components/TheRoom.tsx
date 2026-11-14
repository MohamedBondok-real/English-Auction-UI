import { SALE } from '../auction/lots';
import { useNowSeconds, useStats } from '../state/hooks';
import { longDate, num } from '../lib/format';
import { GiltRing } from './Hero';
import { IconClock, IconUsers } from './icons';

/**
 * The house itself: an editorial plate on how an English auction is
 * conducted, plus the practical details of the room.
 */
export function TheRoom() {
  const stats = useStats();
  const now = useNowSeconds();
  const [day, ...rest] = longDate(now + 86_400_000).split(', ');

  return (
    <section className="theroom" id="the-room">
      <div className="shell">
        <header className="section-head">
          <div className="section-head__left">
            <span className="section-head__index mono">03</span>
            <div>
              <h2 className="section-head__title">The Room</h2>
              <p className="section-head__sub">How the English manner is conducted</p>
            </div>
          </div>
          <p className="section-head__note">
            The English auction is an open ascending sale: every bid is called aloud, every bidder
            knows the standing offer, and the lot is knocked down to the last and highest.
          </p>
        </header>

        <div className="room">
          <div className="room__plate">
            <span className="room__plate-ring" aria-hidden="true" />
            <GiltRing />
            <p className="room__plate-eyebrow smallcaps">Plate I</p>
            <h3 className="room__plate-title">
              Ascending, <em>openly</em>,<br /> to the last and highest.
            </h3>
            <p className="room__plate-body">
              Unlike a sealed tender or a Dutch clock, an English sale is a public conversation.
              The auctioneer opens each lot at a published figure, invites advances by clear
              increment, and warns the room — going once, going twice — before the hammer.
            </p>
            <ul className="room__rules">
              <li>
                <strong>Open.</strong> Every bid is declared aloud; the standing offer is public.
              </li>
              <li>
                <strong>Ascending.</strong> Bids rise by the house increment for the price band.
              </li>
              <li>
                <strong>Privilege.</strong> The auctioneer may bid on behalf of the reserve.
              </li>
              <li>
                <strong>The hammer.</strong> Once fallen, the contract of sale is made.
              </li>
            </ul>
          </div>

          <div className="room__side">
            <div className="room__card">
              <span className="room__card-icon">
                <IconClock size={17} />
              </span>
              <h4>Viewing</h4>
              <p>
                Tomorrow, {day}, {rest.join(', ').replace(/^, ?/, '')} — and by appointment until
                the morning of the sale. Private viewing of the codex and the astrolabe is
                accommodated in the Long Room.
              </p>
              <dl className="room__facts">
                <div>
                  <dt>Public viewing</dt>
                  <dd>10:00 – 17:00, Mon – Sat</dd>
                </div>
                <div>
                  <dt>Private viewing</dt>
                  <dd>By appointment, 48 hours’ notice</dd>
                </div>
              </dl>
            </div>

            <div className="room__card">
              <span className="room__card-icon">
                <IconUsers size={17} />
              </span>
              <h4>Bidding in the room</h4>
              <p>
                Catch the auctioneer’s eye or raise a numbered paddle. For those bidding remotely,
                the desk will execute a standing limit for you without disclosing it to the room.
              </p>
              <dl className="room__facts">
                <div>
                  <dt>Your paddle</dt>
                  <dd className="num">118</dd>
                </div>
                <div>
                  <dt>Buyer’s premium</dt>
                  <dd>26% of the hammer price, all in</dd>
                </div>
                <div>
                  <dt>In the room now</dt>
                  <dd className="num">{num(42 + stats.live * 7)} registered bidders</dd>
                </div>
              </dl>
            </div>

            <blockquote className="room__quote">
              <p>
                “An English sale rewards the patient bidder. The room will tell you, if you listen,
                precisely how much courage remains in it.”
              </p>
              <footer className="mono">— from The Auctioneer’s Companion, 1908</footer>
            </blockquote>
          </div>
        </div>

        <div className="address">
          <div>
            <span className="smallcaps">Saleroom</span>
            <p>{SALE.address}</p>
          </div>
          <div>
            <span className="smallcaps">Department</span>
            <p>+44 (0)20 7946 0188 · saleroom@martlet.example</p>
          </div>
          <div>
            <span className="smallcaps">Sale</span>
            <p>
              {SALE.saleName} · {SALE.saleNumber} · {SALE.season}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
