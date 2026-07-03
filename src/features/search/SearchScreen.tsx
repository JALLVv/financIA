import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchIcon, XMarkIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TransactionRow } from '@/features/home/TransactionList';
import { PeriodPickerSheet, PeriodPill } from '@/features/home/PeriodSelector';
import { useCategoryMap } from '@/hooks/useDerivedData';
import type { Period, TxType } from '@/models/types';
import { balanceOf, filterTransactions, sortByDateDesc } from '@/services/filters';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatSignedMoney } from '@/utils/money';
import { FilterDropdown } from './FilterDropdown';
import './search.css';

type TypeFilter = TxType | 'both';

const TYPE_LABELS: Record<TypeFilter, string> = {
  both: 'Ambos',
  expense: 'Solo gastos',
  income: 'Solo ingresos',
};

type DropdownKey = 'type' | 'list' | 'category' | null;

/** Búsqueda instantánea por texto, tipo, lista, categoría y período. */
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
  const [period, setPeriod] = useState<Period>({ mode: 'all' });
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setTypeFilter('both');
      setListFilter('');
      setCategoryFilter('');
      setPeriod({ mode: 'all' });
      setPeriodPickerOpen(false);
      setOpenDropdown(null);
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
        period,
      }),
    );
  }, [open, transactions, text, typeFilter, listFilter, categoryFilter, period]);

  const total = useMemo(() => balanceOf(results), [results]);

  const toggleDropdown = (key: DropdownKey) => {
    haptics.light();
    setOpenDropdown((cur) => (cur === key ? null : key));
  };

  const hasActiveFilters =
    typeFilter !== 'both' || listFilter || categoryFilter || period.mode !== 'all' || text;

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
        <FilterDropdown<TypeFilter>
          triggerLabel={TYPE_LABELS[typeFilter]}
          active={typeFilter !== 'both'}
          isOpen={openDropdown === 'type'}
          onToggle={() => toggleDropdown('type')}
          value={typeFilter}
          onSelect={(v) => {
            setTypeFilter(v);
            setOpenDropdown(null);
          }}
          options={[
            { value: 'both', label: 'Ambos' },
            { value: 'expense', label: 'Solo gastos' },
            { value: 'income', label: 'Solo ingresos' },
          ]}
        />

        <FilterDropdown<string>
          triggerLabel={listFilter ? listNames.get(listFilter) : 'Todas las listas'}
          active={!!listFilter}
          isOpen={openDropdown === 'list'}
          onToggle={() => toggleDropdown('list')}
          value={listFilter}
          onSelect={(v) => {
            setListFilter(v);
            setCategoryFilter('');
            setOpenDropdown(null);
          }}
          options={[
            { value: '', label: 'Todas las listas' },
            ...lists.map((l) => ({ value: l.id, label: l.name })),
          ]}
        />

        <FilterDropdown<string>
          triggerLabel={
            categoryFilter
              ? `${categoryMap.get(categoryFilter)?.emoji ?? ''} ${categoryMap.get(categoryFilter)?.name ?? ''}`
              : 'Todas las categorías'
          }
          active={!!categoryFilter}
          isOpen={openDropdown === 'category'}
          onToggle={() => toggleDropdown('category')}
          value={categoryFilter}
          onSelect={(v) => {
            setCategoryFilter(v);
            setOpenDropdown(null);
          }}
          options={[
            { value: '', label: 'Todas las categorías' },
            ...filterableCategories.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` })),
          ]}
        />

        <PeriodPill
          period={period}
          placeholder="Todo el tiempo"
          onClick={() => {
            haptics.light();
            setOpenDropdown(null);
            setPeriodPickerOpen(true);
          }}
        />
      </div>

      {openDropdown && (
        <button
          className="filter-dropdown-backdrop"
          aria-label="Cerrar filtro"
          onClick={() => setOpenDropdown(null)}
        />
      )}

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

      <PeriodPickerSheet
        open={periodPickerOpen}
        onClose={() => setPeriodPickerOpen(false)}
        period={period}
        onChange={setPeriod}
        z={110}
      />
    </Sheet>
  );
}
