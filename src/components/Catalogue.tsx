import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { CATEGORIES, LOTS } from '../auction/lots';
import type { Lot } from '../auction/types';
import { gbpShort, num } from '../lib/format';
import { LotCard } from './LotCard';
import { useWatched } from '../state/watchlist';
import { IconLayers, IconSearch, IconStar, IconTrend } from './icons';

type Sort = 'sale' | 'price-desc' | 'price-asc' | 'watched';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'sale', label: 'Catalogue order' },
  { id: 'price-desc', label: 'Estimate · high first' },
  { id: 'price-asc', label: 'Estimate · low first' },
  { id: 'watched', label: 'My watchlist' },
];

interface Props {
  onOpen: (lotId: string) => void;
}

export function Catalogue({ onOpen }: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<string>('All');
  const [sort, setSort] = useState<Sort>('sale');
  const watched = useWatched();

  // Index built once: lowercase searchable text per lot.
  const searchIndex = useMemo(
    () =>
      new Map(
        LOTS.map((lot) => [
          lot.id,
          `${lot.title} ${lot.maker} ${lot.category} ${lot.dateLine} ${lot.description} ${lot.medium} ${lot.tags.join(' ')}`.toLowerCase(),
        ]),
      ),
    [],
  );

  const tokens = useMemo(
    () => deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [deferredQuery],
  );

  const lots = useMemo(() => {
    let result: Lot[] = LOTS as readonly Lot[] as Lot[];

    if (category !== 'All') result = result.filter((lot) => lot.category === category);
    if (sort === 'watched') result = result.filter((lot) => watched.has(lot.id));

    if (tokens.length > 0) {
      result = result.filter((lot) => {
        const haystack = searchIndex.get(lot.id) ?? '';
        for (let i = 0; i < tokens.length; i++) if (!haystack.includes(tokens[i])) return false;
        return true;
      });
    }

    if (sort === 'price-desc') result = [...result].sort((a, b) => b.estimate[1] - a.estimate[1]);
    else if (sort === 'price-asc') result = [...result].sort((a, b) => a.estimate[0] - b.estimate[0]);

    return result;
  }, [category, sort, tokens, watched, searchIndex]);

  const handleOpen = useCallback((lotId: string) => onOpen(lotId), [onOpen]);

  const reset = () => {
    setQuery('');
    setCategory('All');
    setSort('sale');
  };

  const lowEstimate = useMemo(
    () => LOTS.reduce((sum, lot) => sum + lot.estimate[0], 0),
    [],
  );

  return (
    <section className="catalogue" id="lots">
      <div className="shell">
        <header className="section-head">
          <div className="section-head__left">
            <span className="section-head__index mono">01</span>
            <div>
              <h2 className="section-head__title">The Catalogue</h2>
              <p className="section-head__sub">
                {num(LOTS.length)} lots · aggregate low estimate {gbpShort(lowEstimate)}
              </p>
            </div>
          </div>
          <p className="section-head__note">
            Every lot is offered subject to the Conditions of Sale. Bids may be placed in the room
            or by standing commission.
          </p>
        </header>

        <div className="catbar">
          <label className="catbar__search">
            <IconSearch size={17} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalogue — maker, medium, period, provenance…"
              aria-label="Search the catalogue"
              spellCheck={false}
            />
            {query && (
              <button type="button" className="catbar__clear" onClick={() => setQuery('')} aria-label="Clear search">
                ✕
              </button>
            )}
            <kbd className="catbar__kbd">/</kbd>
          </label>

          <div className="catbar__sort">
            <IconLayers size={15} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort lots"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.id === 'watched' && watched.size > 0 ? ` (${watched.size})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chips" role="group" aria-label="Filter by category">
          <CategoryChip active={category === 'All'} onClick={() => setCategory('All')} label="All lots" count={LOTS.length} />
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={cat}
              count={LOTS.filter((lot) => lot.category === cat).length}
            />
          ))}
        </div>

        {tokens.length > 0 || category !== 'All' ? (
          <p className="catbar__result">
            <IconTrend size={14} />
            {lots.length} lot{lots.length === 1 ? '' : 's'}
            {category !== 'All' && <> in {category}</>}
            {tokens.length > 0 && (
              <>
                {' '}
                for “{deferredQuery.trim()}”
              </>
            )}
            <button type="button" className="catbar__reset" onClick={reset}>
              Reset
            </button>
          </p>
        ) : null}

        {lots.length === 0 ? (
          <div className="empty">
            <IconStar size={26} />
            <h3 className="empty__title">Nothing matches — yet</h3>
            <p className="empty__body">
              {sort === 'watched'
                ? 'Star any lot to keep it here. The catalogue moves quickly.'
                : 'Try a broader term, or clear the filters to see the whole sale.'}
            </p>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="lotgrid">
            {lots.map((lot, i) => (
              <LotCard
                key={lot.id}
                lot={lot}
                index={i}
                onOpen={handleOpen}
                variant={i === 0 && sort === 'sale' && category === 'All' && tokens.length === 0 ? 'wide' : 'standard'}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const CategoryChip = memo(function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      className={`cat-chip ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className="cat-chip__count mono">{count}</span>
    </button>
  );
});
