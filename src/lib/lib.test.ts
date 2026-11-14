import { describe, expect, it } from 'vitest';
import { mulberry32, hashString, roundBid, pickWeighted } from './rng';
import { nextIncrement, nextBidAmount, quickBids } from './increments';
import { gbpShort, countdown, timeAgo, percent } from './format';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values inside [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashes strings stably and distinctively', () => {
    expect(hashString('lot-001')).toBe(hashString('lot-001'));
    expect(hashString('lot-001')).not.toBe(hashString('lot-002'));
  });

  it('rounds bids onto sensible steps', () => {
    expect(roundBid(997)).toBe(995);
    expect(roundBid(1512)).toBe(1500);
    expect(roundBid(44_640)).toBe(44_600);
    expect(roundBid(7_249)).toBe(7_250);
  });

  it('picks a weighted item deterministically', () => {
    const chosen = pickWeighted(mulberry32(3), ['a', 'b', 'c'], () => 1);
    expect(['a', 'b', 'c']).toContain(chosen);
  });
});

describe('increments', () => {
  it('widens the step as the price climbs', () => {
    expect(nextIncrement(100)).toBe(10);
    expect(nextIncrement(400)).toBe(25);
    expect(nextIncrement(2_000)).toBe(100);
    expect(nextIncrement(6_000)).toBe(250);
    expect(nextIncrement(40_000)).toBe(1_000);
    expect(nextIncrement(2_000_000)).toBe(50_000);
  });

  it('uses the opening bid before any bid is made', () => {
    expect(nextBidAmount(0, 150_000, 0)).toBe(150_000);
  });

  it('advances by one increment thereafter', () => {
    expect(nextBidAmount(166_000, 150_000, 3)).toBe(171_000);
  });

  it('generates a monotonically rising quick ladder', () => {
    const ladder = quickBids(800, 3);
    expect(ladder).toHaveLength(3);
    expect(ladder[1]).toBeGreaterThan(ladder[0]);
    expect(ladder[2]).toBeGreaterThan(ladder[1]);
  });
});

describe('format', () => {
  it('formats money compactly', () => {
    expect(gbpShort(1_240_000)).toBe('£1.24m');
    expect(gbpShort(84_400)).toBe('£84.4k');
    expect(gbpShort(950)).toBe('£950');
  });

  it('counts down to zero and stops', () => {
    expect(countdown(65_000)).toBe('01:05');
    expect(countdown(-400)).toBe('00:00');
  });

  it('describes recency', () => {
    expect(timeAgo(1000, 1500)).toBe('just now');
    expect(timeAgo(0, 45_000)).toBe('45s ago');
    expect(timeAgo(0, 3_600_000 * 2)).toBe('2h ago');
  });

  it('clamps percentages', () => {
    expect(percent(5, 10)).toBe(50);
    expect(percent(-3, 10)).toBe(0);
    expect(percent(30, 0)).toBe(0);
  });
});
