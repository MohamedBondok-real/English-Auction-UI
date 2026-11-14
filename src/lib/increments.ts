/**
 * Bid ladder used by English auctions: the increment narrows at the lower
 * end of the market and widens as the price climbs. Bounded lookup — the
 * table has a fixed number of rows, so this is O(1) in the input size.
 */
const LADDER: readonly (readonly [limit: number, step: number])[] = [
  [250, 10],
  [500, 25],
  [1_000, 50],
  [2_500, 100],
  [5_000, 200],
  [10_000, 250],
  [25_000, 500],
  [50_000, 1_000],
  [100_000, 2_500],
  [250_000, 5_000],
  [500_000, 10_000],
  [1_000_000, 25_000],
  [Infinity, 50_000],
];

export function nextIncrement(currentBid: number): number {
  for (let i = 0; i < LADDER.length; i++) {
    const row = LADDER[i];
    if (currentBid < row[0]) return row[1];
  }
  return 50_000;
}

/** The amount the next bidder must offer. */
export function nextBidAmount(currentBid: number, openingBid: number, bidCount: number): number {
  if (bidCount === 0) return openingBid;
  return currentBid + nextIncrement(currentBid);
}

/** Generic offer ladder for the "+" chip row in the UI. */
export function quickBids(base: number, count = 3): number[] {
  const out: number[] = [];
  let cursor = base;
  for (let i = 0; i < count; i++) {
    cursor += nextIncrement(cursor);
    out.push(cursor);
  }
  return out;
}
