/** Domain types for the Martlet saleroom. */

export type Category =
  | 'Manuscripts'
  | 'Silver'
  | 'Paintings'
  | 'Jewellery'
  | 'Ceramics'
  | 'Instruments'
  | 'Furniture'
  | 'Works on Paper'
  | 'Antiquities'
  | 'Books'
  | 'Horology'
  | 'Natural History'
  | 'Textiles'
  | 'Design'
  | 'Memorabilia';

/** Abstract composition used by the generative lot artwork. */
export type ArtVariant =
  | 'orbital'
  | 'strata'
  | 'arch'
  | 'bloom'
  | 'grid'
  | 'wave'
  | 'prism'
  | 'plume'
  | 'seal'
  | 'weft';

export interface Palette {
  /** ground */
  bg: string;
  /** primary ink / linework */
  ink: string;
  a: string;
  b: string;
  c: string;
}

export interface Lot {
  id: string;
  number: number;
  title: string;
  maker: string;
  dateLine: string;
  category: Category;
  medium: string;
  dimensions: string;
  /** One-line catalogue entry, used on cards. */
  description: string;
  /** Catalogue essay for the detail view. */
  essay: string;
  estimate: readonly [number, number];
  openingBid: number;
  reserve: number;
  provenance: readonly string[];
  literature?: string;
  condition: string;
  tags: readonly string[];
  art: { variant: ArtVariant; palette: Palette; seed: number };
  featured?: boolean;
}

export type LotStage = 'upcoming' | 'open' | 'going' | 'sold' | 'passed';

export interface Bidder {
  paddle: number;
  name: string;
  city: string;
  isPlayer?: boolean;
}

export interface BidRecord {
  id: number;
  amount: number;
  bidder: Bidder;
  at: number;
  kind: 'bid' | 'commission' | 'opening';
}

export interface LotSale {
  lotId: string;
  number: number;
  stage: LotStage;
  currentBid: number;
  bidCount: number;
  leader: Bidder | null;
  reserveMet: boolean;
  /** epoch ms — when the auctioneer's hammer is due */
  closesAt: number;
  /** epoch ms — when the lot opened (or will open) */
  openedAt: number;
  soldAt: number | null;
  soldPrice: number | null;
  history: readonly BidRecord[];
  /** seconds of bidding window granted per bid */
  windowMs: number;
}

export interface SaleStats {
  live: number;
  sold: number;
  passed: number;
  upcoming: number;
  totalHammer: number;
  totalBids: number;
  lotsSold: number;
  lotsOffered: number;
}

export type FeedKind =
  | 'bid'
  | 'sold'
  | 'passed'
  | 'open'
  | 'going'
  | 'win'
  | 'outbid'
  | 'watch';

export interface FeedEvent {
  id: number;
  kind: FeedKind;
  text: string;
  amount?: number;
  at: number;
  lotNumber?: number;
}
