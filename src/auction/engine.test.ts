import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuctionEngine, PLAYER } from './engine';
import { LOTS } from './lots';

/**
 * The engine is seeded, so these tests are deterministic apart from the
 * rival-bidder dice, which are what we exercise through virtual time.
 */
describe('AuctionEngine', () => {
  let engine: AuctionEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new AuctionEngine(20261114);
    engine.setSpeed(1);
  });

  it('stages every lot as upcoming with an opening time in order', () => {
    const sales = LOTS.map((lot) => engine.getSale(lot.id));
    expect(sales.every((s) => s !== null)).toBe(true);
    expect(sales.every((s) => s!.stage === 'upcoming')).toBe(true);

    for (let i = 1; i < sales.length; i++) {
      expect(sales[i]!.openedAt).toBeGreaterThan(sales[i - 1]!.openedAt);
    }
  });

  it('refuses a bid before the lot opens', () => {
    const result = engine.placePlayerBid(LOTS[0].id);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-open');
  });

  it('opens lots as the clock advances and accepts a first bid', () => {
    engine.start();
    vi.advanceTimersByTime(4_000);

    const first = engine.getSale(LOTS[0].id)!;
    expect(first.stage).toBe('open');

    const result = engine.placePlayerBid(LOTS[0].id);
    expect(result.ok).toBe(true);
    expect(result.amount).toBe(LOTS[0].openingBid);

    const after = engine.getSale(LOTS[0].id)!;
    expect(after.currentBid).toBe(LOTS[0].openingBid);
    expect(after.bidCount).toBe(1);
    expect(after.leader?.paddle).toBe(PLAYER.paddle);
    engine.stop();
  });

  it('escalates bids in ascending order', () => {
    engine.start();
    vi.advanceTimersByTime(4_000);
    engine.placePlayerBid(LOTS[0].id);
    vi.advanceTimersByTime(2_500);
    const sale = engine.getSale(LOTS[0].id)!;
    const amounts = sale.history.map((r) => r.amount).reverse();
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
    engine.stop();
  });

  it('resets the hammer window when a bid lands', () => {
    engine.start();
    // bid early, while plenty of the first window remains
    vi.advanceTimersByTime(2_400);
    const before = engine.getSale(LOTS[0].id)!.closesAt - engine.now;
    engine.placePlayerBid(LOTS[0].id);
    const sale = engine.getSale(LOTS[0].id)!;
    const after = sale.closesAt - engine.now;
    // a bid opens a fresh, shorter window rather than letting the lot run out
    expect(after).toBeGreaterThan(4_000);
    expect(after).toBeLessThan(before);
    expect(sale.windowMs).toBe(after);
    engine.stop();
  });

  it('settles every lot eventually (bounded session)', () => {
    engine.start();
    vi.advanceTimersByTime(60_000 * 18);
    const sales = LOTS.map((lot) => engine.getSale(lot.id)!);
    const settled = sales.filter((s) => s.stage === 'sold' || s.stage === 'passed');
    expect(settled.length).toBe(LOTS.length);
    engine.stop();
  });

  it('stores a standing limit and bids on the player’s behalf', () => {
    engine.start();
    vi.advanceTimersByTime(12_000);
    const lot = LOTS[0];
    // A limit far above the room guarantees the desk is instructed to act.
    engine.setPlayerMax(lot.id, lot.estimate[1] * 4);
    expect(engine.getPlayerMax(lot.id)).toBe(lot.estimate[1] * 4);
    vi.advanceTimersByTime(6_000);
    const sale = engine.getSale(lot.id)!;
    expect(sale.leader?.paddle).toBe(PLAYER.paddle);
    expect(sale.history.some((r) => r.bidder.isPlayer)).toBe(true);
    engine.stop();
  });

  it('keeps stats coherent with lot states', () => {
    engine.start();
    vi.advanceTimersByTime(60_000 * 18);
    const stats = engine.getStats();
    const sales = LOTS.map((lot) => engine.getSale(lot.id)!);
    expect(stats.sold).toBe(sales.filter((s) => s.stage === 'sold').length);
    expect(stats.passed).toBe(sales.filter((s) => s.stage === 'passed').length);
    expect(stats.totalBids).toBe(sales.reduce((sum, s) => sum + s.bidCount, 0));
    engine.stop();
  });

  it('notifies lot subscribers independently', () => {
    const watched = vi.fn();
    const other = vi.fn();
    const offA = engine.subscribeLot(LOTS[0].id, watched);
    const offB = engine.subscribeLot(LOTS[1].id, other);
    engine.subscribeGlobal(() => {});

    engine.start();
    vi.advanceTimersByTime(4_000);
    expect(watched).toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();

    offA();
    offB();
    engine.stop();
  });

  it('caps the public bid history so memory stays bounded', () => {
    engine.start();
    vi.advanceTimersByTime(4_000);
    for (let i = 0; i < 60; i++) {
      engine.placePlayerBid(LOTS[0].id);
      engine.setPlayerMax(LOTS[0].id, 10_000_000);
      vi.advanceTimersByTime(1_200);
    }
    expect(engine.getSale(LOTS[0].id)!.history.length).toBeLessThanOrEqual(40);
    engine.stop();
  });
});
