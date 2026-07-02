import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchIcon, XMarkIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TransactionRow } from '@/features/home/TransactionList';
import { useCategoryMap } from '@/hooks/useDerivedData';
import type { TxType } from '@/models/types';
import { balanceOf, filterTransactions, sortByDateDesc } from '@/services/filters';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatSignedMoney } from '@/utils/money';
import './search.css';

type TypeFilter = TxType | 'both';

const TYPE_LABELS: Record<TypeFilter, string> = {
  both: 'Ambos',
  expense: 'Solo gastos',
  income: 'Solo ingresos',
};

/** Búsqueda instantánea por texto, tipo, lista, categoría y rango de fechas. */
export function SearchScreen() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const setDetailTx = useUiStore((s) => s.setDetailTx);

  const transactions = useFinanceStore((s) => s.transactions);
  const lists = useFinanceStore((s) => s.lists);
  const categories = useFinanceStore((s) => s.categories);
  const categoryMap = useCategoryMap();
  const listNames = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists]);

  const [text, setText] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('both');
  const [listFilter, setListFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showDates, setShowDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (open) {
      setText('');
      setTypeFilter('both');
      setListFilter('');
      setCategoryFilter('');
      setDateFrom('');
      setDateTo('');
      setShowDates(false);
    }
  }, [open]);

  const filterableCategories = useMemo(
    () => (listFilter ? categories.filter((c) => c.listId === listFilter) : categories),
    [categories, listFilter],
  );

  const results = useMemo(() => {
    if (!open) return [];
    return sortByDateDesc(
      filterTransactions(transactions, {
        text,
        type: typeFilter,
        listId: listFilter || undefined,
        categoryId: categoryFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    );
  }, [open, transactions, text, typeFilter, listFilter, categoryFilter, dateFrom, dateTo]);

  const total = useMemo(() => balanceOf(results), [results]);

  const cycleType = () => {
    haptics.light();
    setTypeFilter((t) => (t === 'both' ? 'expense' : t === 'expense' ? 'income' : 'both'));
  };

  const cycleList = () => {
    haptics.light();
    const ids = ['', ...lists.map((l) => l.id)];
    const next = ids[(ids.indexOf(listFilter) + 1) % ids.length];
    setListFilter(next);
    setCategoryFilter('');
  };

  const cycleCategory = () => {
    haptics.light();
    const ids = ['', ...filterableCategories.map((c) => c.id)];
    setCategoryFilter(ids[(ids.indexOf(categoryFilter) + 1) % ids.length]);
  };

  const hasActiveFilters =
    typeFilter !== 'both' || listFilter || categoryFilter || dateFrom || dateTo || text;

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Buscar" full z={90}>
      <div className="search-bar">
        <span className="search-ic">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          enterKeyHint="search"
          placeholder="Buscar por descripción…"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button className="clear-btn" aria-label="Limpiar" onClick={() => setText('')}>
            <XMarkIcon size={14} />
          </button>
        )}
      </div>

      <div className="filter-chips">
        <button className={`filter-chip ${typeFilter !== 'both' ? 'active' : ''}`} onClick={cycleType}>
          {TYPE_LABELS[typeFilter]}
        </button>
        <button className={`filter-chip ${listFilter ? 'active' : ''}`} onClick={cycleList}>
          {listFilter ? listNames.get(listFilter) : 'Todas las listas'}
        </button>
        <button
          className={`filter-chip ${categoryFilter ? 'active' : ''}`}
          onClick={cycleCategory}
        >
          {categoryFilter
            ? `${categoryMap.get(categoryFilter)?.emoji ?? ''} ${categoryMap.get(categoryFilter)?.name ?? ''}`
            : 'Todas las categorías'}
        </button>
        <button
          className={`filter-chip ${dateFrom || dateTo ? 'active' : ''}`}
          onClick={() => {
            haptics.light();
            setShowDates((v) => !v);
          }}
        >
          Fechas
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showDates && (
          <motion.div
            className="date-range-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="date-range-field">
              <label htmlFor="date-from">Desde</label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="date-range-field">
              <label htmlFor="date-to">Hasta</label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && (
        <div className="search-summary">
          <span>
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </span>
          <span
            className="summary-balance"
            style={{ color: total < 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {formatSignedMoney(total)}
          </span>
        </div>
      )}

      <div className="search-results">
        {results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={hasActiveFilters ? 'Sin resultados' : 'Busca tus movimientos'}
            subtitle={
              hasActiveFilters
                ? 'Prueba con otros filtros o términos de búsqueda.'
                : 'Escribe o combina filtros para encontrar cualquier registro.'
            }
          />
        ) : (
          results.slice(0, 300).map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={categoryMap.get(tx.categoryId)}
              showList
              listName={listNames.get(tx.listId)}
              onPress={(t) => setDetailTx(t)}
            />
          ))
        )}
      </div>
    </Sheet>
  );
}
