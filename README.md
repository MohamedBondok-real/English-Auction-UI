# Martlet — The Gilded Hour

An English auction house, in the browser.

Martlet is a front‑end saleroom built in **TypeScript**: sixteen lots of invented
(but scrupulously plausible) property, offered in the **English manner** — an
open ascending auction in which every bid is called aloud, every bidder can see
the standing offer, and the lot is knocked down to the last and highest bidder.

Take paddle **118** and bid.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle
npm test           # 30 tests: engine, logic, and a jsdom smoke suite
```

---

## What's in the box

| | |
|---|---|
| **Live saleroom** | Every lot opens in sequence, rival bidders act on private valuations, the window tightens as the bidding climbs, and the hammer falls. |
| **You can bid** | One‑click bids at the next increment, or a standing limit the desk executes on your behalf, one increment at a time. |
| **Light & dark** | Gilded paper by day, gallery noir by night. Follows the system preference, remembers your choice, and paints before first frame (no flash). |
| **Generative artwork** | All sixteen lot images are drawn on `<canvas>` from a seed. **Zero image requests**, zero broken thumbnails, no bandwidth. |
| **Effects** | Cursor‑driven 3D card tilt, gold dust in the air, a film‑grain plate, aurora washes, a gilt sweep, and a full‑screen *hammer moment* when a lot falls to you. |
| **The rest of the house** | A searchable catalogue, an operations desk with a live wire, the Conditions of Sale, and a `⌘K` command palette. |

Keyboard: `⌘K` / `Ctrl‑K` palette · `/` search · `B` bid · `←` `→` move between lots · `Esc` close · `⌘P` print (the catalogue is print‑styled).

---

## Design

The visual language is an auction catalogue that learned to breathe: **Fraunces**
(the variable display face, using its `SOFT`, `WONK` and optical‑size axes),
**Inter** for text, **JetBrains Mono** for figures — because prices should align.

The palette is built from the room itself: vellum and gilt, oxblood sealing wax,
and a deep botanical green for the dark mode's gallery walls. Everything is
expressed as CSS custom properties in `src/styles/tokens.css`, so both moods are
one attribute apart (`data-theme="light|dark"`), and there is exactly one place
to change a colour.

---

## Engineering — and the complexity budget

The brief asked for the lowest time complexity and the fastest response. Three
decisions do most of that work.

### 1. The engine is a store, not a React tree

`AuctionEngine` keeps lot state outside React. Each lot has its own subscriber
set, and a bid notifies **only the lot that changed**:

```
placeBid()  →  patch(lot)  →  notifyLot(lotId)  →  one card re-renders
```

`useSyncExternalStore` in `src/state/hooks.ts` binds components to that. The
practical consequence: a bid at 2× speed on a sixteen‑lot board causes one
component to reconcile, not sixteen. The card is `memo()`'d and keeps its
identity, so React skips work it does not need to do.

The clock is deliberately quarantined. `<Countdown>` subscribes to the tick
alone, so the six countdowns in a grid re‑render five times a second while the
cards around them sit still.

### 2. Lookups are O(1), and so is the arithmetic

| Operation | Cost |
|---|---|
| Find a lot by id | `Map.get` — O(1) |
| Subscribe / unsubscribe | `Set` add / delete — O(1) |
| Next increment | bounded 13‑row ladder — O(1) in the input |
| Lot snapshot update | object spread of a flat record — O(1) in lot count |
| Sale statistics | computed once per tick, cached behind a dirty flag |
| Catalogue search | pre‑built lowercase index (`Map`), one pass per query, deferred by React |
| Sparkline path | single pass over ≤ 40 points |
| Artwork render | one canvas per lot per size, memoised in an LRU of 60 |

The bid history and the wire are both **capped at 40 records**, so memory is
bounded no matter how long the sale runs. A hammer window that decayed without
a floor would let a hot lot run forever; the window shrinks with each bid but
never below five seconds, which guarantees termination. (A test asserts that the
entire sale settles.)

### 3. Rendering is cheap by construction

* The ambient particles are **one `<canvas>` and one `requestAnimationFrame`** —
  four dozen motes cost a single canvas pass and zero React renders. It pauses
  when the tab is hidden.
* Card tilt writes CSS custom properties directly to the node, so a mouse move
  is a style write, not a state update.
* Fonts are self‑hosted and subset by `unicode-range`; the display face loads
  only the Latin ranges it needs.
* `contain: layout style` on cards keeps their reflows local.
* Everything respects `prefers-reduced-motion` — for motion *and* for the tilt.

---

## Layout

```
src/
├── auction/
│   ├── types.ts        domain types
│   ├── lots.ts         the catalogue — 16 curated lots
│   ├── engine.ts       the store: bidding, bidders, hammer, stats, subscriptions
│   └── engine.test.ts  deterministic engine tests
├── lib/
│   ├── rng.ts          seeded PRNG (mulberry32) + hashing
│   ├── increments.ts   the house bid ladder
│   ├── format.ts       money, time, recency (formatters built once)
│   ├── emitter.ts      a 12-line typed emitter
│   └── lib.test.ts
├── state/
│   ├── hooks.ts        useSyncExternalStore bindings + rAF hook
│   ├── theme.tsx       light / dark with pre-paint bootstrap
│   ├── toasts.tsx      notification stack
│   └── watchlist.ts    starred lots, persisted
├── components/
│   ├── Header · Ticker · Hero · Catalogue · LotCard
│   ├── LotDetail (the bidding room) · Saleroom · TheRoom · Conditions
│   ├── CommandPalette · HammerMoment · Ambient · LotArt (?)
│   └── icons.tsx
└── styles/
    ├── tokens.css      the design system — every colour, step and easing
    ├── base.css        reset, typography, utilities
    ├── layout.css      ambient, masthead, hero, sections
    ├── components.css  buttons, cards, artwork, desk, toasts
    └── app.css         modal, bidding panel, palette, responsive, print
```

### The generative artwork

`src/components/LotArt.tsx` holds ten painters — *orbital, strata, arch, bloom,
grid, wave, prism, plume, seal, weft* — each a small deterministic composition
driven by the lot's palette and seed. A lot's picture is therefore stable across
reloads, unique to the lot, and costs nothing to ship. `renderArt()` memoises the
result per (variant, palette, seed, size, DPR); the component copies it to a
visible canvas through a `ResizeObserver`, so resizing is a `drawImage`, not a
redraw.

---

## Notes and disclaimers

Martlet is a **demonstration**. It is not a real auction house; the lots, the
vendors, the bidders, the provenance and the prices are invented, and the
`martlet.example` addresses are deliberately unroutable. No paddle carries any
obligation, and nothing in the saleroom constitutes an offer for sale.

Built with React 19, Vite 7 and TypeScript 5.9. No UI framework, no state
library, no image assets, and no network calls at runtime.
