import { SALE } from '../auction/lots';
import { IconArrowUpRight, IconCommand } from './icons';

export function Footer({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top">
          <div className="footer__brand">
            <p className="footer__wordmark">Martlet</p>
            <p className="footer__tag">
              Fine art &amp; objects, offered in the English manner since a time the house prefers
              not to specify.
            </p>
          </div>
          <div className="footer__cols">
            <div>
              <span className="smallcaps">Sale</span>
              <ul>
                <li>{SALE.saleName}</li>
                <li>{SALE.saleNumber}</li>
                <li>{SALE.season}</li>
              </ul>
            </div>
            <div>
              <span className="smallcaps">Visit</span>
              <ul>
                <li>{SALE.address}</li>
                <li>Mon – Sat, 10:00 – 17:00</li>
              </ul>
            </div>
            <div>
              <span className="smallcaps">Enquiries</span>
              <ul>
                <li>saleroom@martlet.example</li>
                <li>+44 (0)20 7946 0188</li>
              </ul>
            </div>
            <div>
              <span className="smallcaps">Console</span>
              <ul>
                <li>
                  <button type="button" className="footer__cmd" onClick={onOpenPalette}>
                    <IconCommand size={13} /> Command palette <kbd>⌘K</kbd>
                  </button>
                </li>
                <li>
                  <a href="#top" className="footer__top-link">
                    Back to the top <IconArrowUpRight size={13} />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer__rule" />

        <div className="footer__bottom">
          <p>
            A demonstration saleroom. Martlet is not a real auction house; the lots, prices and
            bidders are invented. Built in TypeScript with React — no images, no network calls,
            every artwork drawn on canvas from a seed.
          </p>
          <p className="footer__fine mono">
            © {new Date().getFullYear()} Martlet (demonstration) · Paddle 118 is yours
          </p>
        </div>
      </div>
      <div className="footer__marquee" aria-hidden="true">
        <span>Martlet</span>
        <span>·</span>
        <span>The Gilded Hour</span>
        <span>·</span>
        <span>London</span>
        <span>·</span>
      </div>
    </footer>
  );
}
