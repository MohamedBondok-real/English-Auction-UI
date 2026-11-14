import { LOTS } from './lots';
import type { Bidder, BidRecord, FeedEvent, LotSale, SaleStats } from './types';
import { nextBidAmount } from '../lib/increments';
import { Emitter } from '../lib/emitter';
import { hashString, mulberry32, randInt, type Rng } from '../lib/rng';

/* ————————————————————————————————————————————————
   Timing constants (virtual milliseconds)
———————————————————————————————————————————————— */
const TICK_MS = 200;
const STAGGER = 26_000; // lots open in sequence
const OPEN_WINDOW = 44_000; // time to secure an opening bid
const BID_WINDOW = 13_000; // "going once, going twice" window after a bid
const GOING_SOON = 5_500;
const HISTORY_CAP = 40;
const FEED_CAP = 40;

const BIDDER_POOL: readonly { name: string; city: string }[] = [
  { name: 'A. Whitcombe', city: 'Bath' },
  { name: 'R. Okonkwo', city: 'London' },
  { name: 'H. Lindqvist', city: 'Stockholm' },
  { name: 'M. Dubois', city: 'Paris' },
  { name: 'S. Tanaka', city: 'Tokyo' },
  { name: 'C. Ferreira', city: 'Lisbon' },
  { name: 'J. Halloran', city: 'New York' },
  { name: 'E. Voss', city: 'Zürich' },
  { name: 'P. Achebe', city: 'Lagos' },
  { name: 'G. Moreau', city: 'Geneva' },
  { name: 'T. Byrne', city: 'Dublin' },
  { name: 'N. Kovács', city: 'Budapest' },
  { name: 'L. Marchetti', city: 'Milan' },
  { name: 'D. Chen', city: 'Hong Kong' },
  { name: 'B. Anders', city: 'Toronto' },
  { name: 'F. Rahman', city: 'Dubai' },
  { name: 'K. Osei', city: 'Accra' },
  { name: 'W. Ainsworth', city: 'Edinburgh' },
  { name: 'V. Petrova', city: 'Vienna' },
  { name: 'I. Nakamura', city: 'Kyoto' },
  { name: 'O. Haddad', city: 'Beirut' },
  { name: 'R. van Dijk', city: 'Amsterdam' },
  { name: 'S. Mbeki', city: 'Cape Town' },
  { name: 'A. Lindgren', city: 'Oslo' },
  { name: 'The Trade', city: 'St James’s' },
  { name: 'A Private Collector', city: 'Undisclosed' },
  { name: 'The Ashcombe Trust', city: 'Worcestershire' },
];

export const PLAYER: Bidder = { paddle: 118, name: 'You', city: 'Saleroom', isPlayer: true };

const paddleOf = (index: number): number => 120 + index * 7;

interface LotRuntime {
  sale: LotSale;
  /** paddle → maximum valuation the bidder will go to */
  valuations: Map<number, number>;
  bidders: Map<number, Bidder>;
  nextBotAt: number;
  playerMax: number | null;
  playerAutoAt: number;
  lastBidAt: number;
  warned: boolean;
}

export interface BidResult {
  ok: boolean;
  reason?: 'not-open' | 'closed' | 'too-low' | 'you-lead' | 'sold';
  amount?: number;
}

/* ————————————————————————————————————————————————
   The engine
———————————————————————————————————————————————— */
export class AuctionEngine {
  private runtimes = new Map<string, LotRuntime>();
  private lotSubs = new Map<string, Set<() => void>>();
  private clockSubs = new Set<(now: number) => void>();
  private globalSubs = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private realLast = 0;
  private speed = 1;
  private paused = false;
  private seed: number;
  private dice: Rng;
  private feedId = 1;

  now = 0;
  feed: readonly FeedEvent[] = [];
  /** lot currently on screen, if any — used to avoid duplicate notifications */
  focus: string | null = null;
  toasts = new Emitter<FeedEvent>();
  /** fired only when the player's paddle takes a lot — drives the hammer moment */
  hammer = new Emitter<{ lotNumber: number; amount: number; title: string }>();
  private statsCache: SaleStats | null = null;
  private statsDirty = true;

  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.dice = mulberry32((this.seed ^ 0x9e3779b9) >>> 0);
    this.build();
  }

  /* ————— setup ————— */
  private build(): void {
    // The sale's clock is the room's clock: start from real wall time so
    // every displayed time (wire, session, viewing day) reads true.
    this.now = Date.now();
    this.feed = [];
    this.feedId = 1;
    this.statsCache = null;
    this.statsDirty = true;
    this.runtimes.clear();

    const base = this.now;
    LOTS.forEach((lot, index) => {
      const rng = mulberry32((this.seed ^ hashString(lot.id)) >>> 0);
      const openedAt = base + 1600 + index * STAGGER;

      const sale: LotSale = {
        lotId: lot.id,
        number: lot.number,
        stage: 'upcoming',
        currentBid: 0,
        bidCount: 0,
        leader: null,
        reserveMet: false,
        closesAt: openedAt + OPEN_WINDOW,
        openedAt,
        soldAt: null,
        soldPrice: null,
        history: [],
        windowMs: OPEN_WINDOW,
      };

      const valuations = new Map<number, number>();
      const bidders = new Map<number, Bidder>();
      const count = randInt(rng, 3, 6);
      const used = new Set<number>();
      for (let i = 0; i < count; i++) {
        let idx = randInt(rng, 0, BIDDER_POOL.length - 1);
        let guard = 0;
        while (used.has(idx) && guard++ < 8) idx = randInt(rng, 0, BIDDER_POOL.length - 1);
        used.add(idx);
        const paddle = paddleOf(idx);
        const person = BIDDER_POOL[idx];
        bidders.set(paddle, { paddle, name: person.name, city: person.city });
        // A private appetite: a spread of valuations around the high estimate.
        // The floor guarantees the room can always open the lot.
        const ceiling = lot.estimate[1] * (0.62 + rng() * 0.8);
        valuations.set(paddle, Math.round(Math.max(ceiling, lot.openingBid * 1.06)));
      }

      this.runtimes.set(lot.id, {
        sale,
        valuations,
        bidders,
        nextBotAt: openedAt + 1400 + rng() * 6000,
        playerMax: null,
        playerAutoAt: 0,
        lastBidAt: 0,
        warned: false,
      });
    });
  }

  /* ————— lifecycle ————— */
  start(): void {
    if (this.timer !== null) return;
    this.realLast = performance.now();
    this.timer = setInterval(this.tick, TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.realLast = performance.now();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.realLast = performance.now();
  }

  getSpeed(): number {
    return this.speed;
  }

  setFocus(lotId: string | null): void {
    this.focus = lotId;
  }

  restart(): void {
    this.stop();
    this.seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    this.dice = mulberry32((this.seed ^ 0x9e3779b9) >>> 0);
    this.build();
    this.notifyAll();
    this.start();
  }

  private tick = (): void => {
    const real = performance.now();
    const delta = Math.min(real - this.realLast, 1000);
    this.realLast = real;
    if (this.paused) return;
    this.now += delta * this.speed;

    let dirty = false;
    for (const rt of this.runtimes.values()) {
      if (this.advance(rt)) dirty = true;
    }
    if (dirty) {
      this.statsDirty = true;
      this.notifyGlobal();
    }
    for (const sub of this.clockSubs) sub(this.now);
  };

  /** Advance a lot. Returns true when its public snapshot changed. */
  private advance(rt: LotRuntime): boolean {
    const { sale } = rt;
    if (sale.stage === 'sold' || sale.stage === 'passed') return false;

    if (sale.stage === 'upcoming') {
      if (this.now < sale.openedAt) return false;
      this.patch(rt, { stage: 'open' });
      this.pushFeed('open', `Lot ${sale.number} opens for bidding`, undefined, sale.number);
      return true;
    }

    if (this.now >= sale.closesAt) {
      this.finishLot(rt);
      return true;
    }

    const remaining = sale.closesAt - this.now;
    const nextStage = remaining <= GOING_SOON && sale.bidCount > 0 ? 'going' : 'open';
    if (sale.stage !== nextStage && (sale.stage === 'open' || sale.stage === 'going')) {
      this.patch(rt, { stage: nextStage });
      if (nextStage === 'going' && !rt.warned) {
        rt.warned = true;
        this.pushFeed(
          'going',
          `Going once at ${fmt(sale.currentBid)} — Lot ${sale.number}`,
          sale.currentBid,
          sale.number,
        );
      }
      if (nextStage === 'open') rt.warned = false;
    }

    // player's standing commission bid
    if (rt.playerMax !== null && sale.leader?.paddle !== PLAYER.paddle) {
      const need = nextBidAmount(sale.currentBid, this.lotOpening(sale), sale.bidCount);
      if (need <= rt.playerMax && this.now >= rt.playerAutoAt) {
        this.placeBid(rt, PLAYER, need, 'commission');
        return true;
      }
    }

    // rival bidder
    if (this.now >= rt.nextBotAt && sale.bidCount < 90) {
      this.botBid(rt);
      return true;
    }
    return false;
  }

  private lotOpening(sale: LotSale): number {
    return LOTS[sale.number - 1]?.openingBid ?? 0;
  }

  private botBid(rt: LotRuntime): void {
    const { sale } = rt;
    const need = nextBidAmount(sale.currentBid, this.lotOpening(sale), sale.bidCount);

    let chosen: Bidder | null = null;
    let bestHeadroom = 0;
    for (const [paddle, ceiling] of rt.valuations) {
      if (paddle === sale.leader?.paddle) continue;
      const headroom = ceiling - need;
      if (headroom < 0) continue;
      const chance = headroom === 0 ? 0.35 : 0.55 + Math.min(0.4, headroom / (need * 4));
      if (this.dice() < chance * 0.9) {
        // weighted pick favouring deeper pockets
        const weight = headroom + need * 0.15;
        if (weight > bestHeadroom) {
          bestHeadroom = weight;
          chosen = rt.bidders.get(paddle) ?? null;
        }
      }
    }

    if (chosen) {
      this.placeBid(rt, chosen, need, 'bid');
      const pressure = need / Math.max(1, LOTS[sale.number - 1].estimate[1]);
      rt.nextBotAt = this.now + 900 + this.dice() * (1500 + pressure * 1700);
    } else {
      rt.nextBotAt = this.now + 900 + this.dice() * 1500;
    }
  }

  private placeBid(
    rt: LotRuntime,
    bidder: Bidder,
    amount: number,
    kind: BidRecord['kind'],
  ): boolean {
    const { sale } = rt;
    if (sale.stage === 'sold' || sale.stage === 'passed' || this.now < sale.openedAt) return false;

    const previousLeader = sale.leader;
    const wasPlayerLeading = previousLeader?.paddle === PLAYER.paddle;

    // The auctioneer's window tightens as the bidding climbs, so every sale
    // must terminate: 13s at the start, floor of 5s at the end.
    const decay = Math.max(0.4, 1 - sale.bidCount * 0.028);
    const window = Math.max(5000, BID_WINDOW * decay);

    const record: BidRecord = {
      id: this.feedId++,
      amount,
      bidder,
      at: this.now,
      kind,
    };
    const lot = LOTS[sale.number - 1];
    const reserveMet = amount >= lot.reserve;

    this.patch(rt, {
      currentBid: amount,
      bidCount: sale.bidCount + 1,
      leader: bidder,
      reserveMet,
      history: [record, ...sale.history].slice(0, HISTORY_CAP),
      closesAt: this.now + window,
      windowMs: window,
      stage: 'open',
    });
    rt.lastBidAt = this.now;
    rt.warned = false;

    // A rival who still has appetite may strike back shortly.
    if (previousLeader && previousLeader.paddle !== bidder.paddle) {
      const leaderVal = rt.valuations.get(previousLeader.paddle);
      if (leaderVal !== undefined && leaderVal > amount && this.dice() < 0.5) {
        rt.nextBotAt = Math.min(rt.nextBotAt, this.now + 700 + this.dice() * 1400);
      }
    }

    if (wasPlayerLeading && !bidder.isPlayer) {
      this.pushFeed('outbid', `You have been outbid on Lot ${sale.number}`, amount, sale.number);
      // The card the player is looking at already shows the new bid; a toast
      // only teaches the room when they are looking elsewhere.
      if (this.focus !== sale.lotId) {
        this.toasts.emit({
          id: this.feedId++,
          kind: 'outbid',
          text: `Outbid — Lot ${sale.number} now ${fmt(amount)}`,
          amount,
          at: this.now,
          lotNumber: sale.number,
        });
      }
    }

    this.pushFeed(
      bidder.isPlayer ? 'win' : 'bid',
      `${bidder.isPlayer ? 'You bid' : `Paddle ${bidder.paddle} bids`} ${fmt(amount)} · Lot ${sale.number}`,
      amount,
      sale.number,
    );
    return true;
  }

  private finishLot(rt: LotRuntime): void {
    const { sale } = rt;
    const lot = LOTS[sale.number - 1];
    const hammer = sale.currentBid;
    const sold = sale.bidCount > 0 && hammer >= lot.reserve && sale.leader !== null;

    if (sold) {
      this.patch(rt, {
        stage: 'sold',
        soldAt: this.now,
        soldPrice: hammer,
        closesAt: this.now,
      });
      this.pushFeed(
        'sold',
        `Hammer falls at ${fmt(hammer)} · Lot ${sale.number}`,
        hammer,
        sale.number,
      );
      if (sale.leader?.isPlayer) {
        this.hammer.emit({ lotNumber: sale.number, amount: hammer, title: lot.title });
        this.toasts.emit({
          id: this.feedId++,
          kind: 'win',
          text: `Lot ${sale.number} is yours — hammer ${fmt(hammer)}`,
          amount: hammer,
          at: this.now,
          lotNumber: sale.number,
        });
        this.pushFeed('win', `You won Lot ${sale.number} at ${fmt(hammer)}`, hammer, sale.number);
      }
    } else {
      this.patch(rt, { stage: 'passed', soldAt: this.now, closesAt: this.now });
      this.pushFeed(
        'passed',
        sale.bidCount === 0
          ? `Lot ${sale.number} bought in — no bids`
          : `Lot ${sale.number} bought in — reserve not met`,
        hammer || undefined,
        sale.number,
      );
    }
    this.statsDirty = true;
  }

  /* ————— public API ————— */
  getSale(lotId: string): LotSale | null {
    return this.runtimes.get(lotId)?.sale ?? null;
  }

  getPlayerMax(lotId: string): number | null {
    return this.runtimes.get(lotId)?.playerMax ?? null;
  }

  isPlayerLeading(lotId: string): boolean {
    const sale = this.runtimes.get(lotId)?.sale;
    return !!sale && sale.leader?.paddle === PLAYER.paddle && (sale.stage === 'open' || sale.stage === 'going');
  }

  nextBid(lotId: string): number {
    const rt = this.runtimes.get(lotId);
    if (!rt) return 0;
    return nextBidAmount(rt.sale.currentBid, this.lotOpening(rt.sale), rt.sale.bidCount);
  }

  placePlayerBid(lotId: string): BidResult {
    const rt = this.runtimes.get(lotId);
    if (!rt) return { ok: false, reason: 'closed' };
    const { sale } = rt;
    if (sale.stage === 'sold' || sale.stage === 'passed') return { ok: false, reason: 'sold' };
    if (sale.stage === 'upcoming' || this.now < sale.openedAt) return { ok: false, reason: 'not-open' };
    if (sale.leader?.paddle === PLAYER.paddle) return { ok: false, reason: 'you-lead' };

    const amount = this.nextBid(lotId);
    if (rt.playerMax !== null && amount > rt.playerMax) return { ok: false, reason: 'too-low' };

    this.placeBid(rt, PLAYER, amount, 'bid');
    // rivals respond briskly to a new entrant
    rt.nextBotAt = Math.min(rt.nextBotAt, this.now + 1200 + this.dice() * 1400);
    this.statsDirty = true;
    this.notifyGlobal();
    return { ok: true, amount };
  }

  setPlayerMax(lotId: string, max: number | null): void {
    const rt = this.runtimes.get(lotId);
    if (!rt) return;
    rt.playerMax = max && max > 0 ? Math.round(max) : null;
    rt.playerAutoAt = this.now + 500;
    this.notifyLot(lotId);
  }

  getStats(): SaleStats {
    if (!this.statsCache || this.statsDirty) {
      let live = 0;
      let sold = 0;
      let passed = 0;
      let upcoming = 0;
      let totalHammer = 0;
      let totalBids = 0;
      let lotsSold = 0;
      let lotsOffered = 0;
      for (const rt of this.runtimes.values()) {
        const s = rt.sale;
        totalBids += s.bidCount;
        if (s.stage === 'open' || s.stage === 'going') live++;
        else if (s.stage === 'sold') {
          sold++;
          lotsSold++;
          lotsOffered++;
          totalHammer += s.soldPrice ?? 0;
        } else if (s.stage === 'passed') {
          passed++;
          lotsOffered++;
        } else upcoming++;
      }
      this.statsCache = { live, sold, passed, upcoming, totalHammer, totalBids, lotsSold, lotsOffered };
      this.statsDirty = false;
    }
    return this.statsCache;
  }

  getFeed(): readonly FeedEvent[] {
    return this.feed;
  }

  private pushFeed(kind: FeedEvent['kind'], text: string, amount?: number, lotNumber?: number): void {
    const event: FeedEvent = { id: this.feedId++, kind, text, amount, at: this.now, lotNumber };
    this.feed = [event, ...this.feed].slice(0, FEED_CAP);
    for (const sub of this.globalSubs) sub();
  }

  private patch(rt: LotRuntime, changes: Partial<LotSale>): void {
    rt.sale = { ...rt.sale, ...changes };
    this.notifyLot(rt.sale.lotId);
  }

  /* ————— subscriptions ————— */
  subscribeLot = (lotId: string, cb: () => void): (() => void) => {
    let set = this.lotSubs.get(lotId);
    if (!set) {
      set = new Set();
      this.lotSubs.set(lotId, set);
    }
    set.add(cb);
    return () => {
      set.delete(cb);
      if (set.size === 0) this.lotSubs.delete(lotId);
    };
  };

  subscribeGlobal = (cb: () => void): (() => void) => {
    this.globalSubs.add(cb);
    return () => {
      this.globalSubs.delete(cb);
    };
  };

  subscribeClock = (cb: (now: number) => void): (() => void) => {
    this.clockSubs.add(cb);
    return () => {
      this.clockSubs.delete(cb);
    };
  };

  private notifyLot(lotId: string): void {
    const set = this.lotSubs.get(lotId);
    if (set) for (const cb of set) cb();
  }

  private notifyGlobal(): void {
    for (const cb of this.globalSubs) cb();
  }

  private notifyAll(): void {
    for (const set of this.lotSubs.values()) for (const cb of set) cb();
    this.notifyGlobal();
  }
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Single engine instance for the app session. */
export const engine = new AuctionEngine();
