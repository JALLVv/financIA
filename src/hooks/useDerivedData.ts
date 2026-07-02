import { useMemo } from 'react';
import type { Category, Period, Transaction } from '@/models/types';
import { balanceOf, filterTransactions, sortByDateDesc } from '@/services/filters';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';

/** Mapa id → categoría (memoizado). */
export function useCategoryMap(): Map<string, Category> {
  const categories = useFinanceStore((s) => s.categories);
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}

export function useActiveList() {
  const lists = useFinanceStore((s) => s.lists);
  const activeListId = useFinanceStore((s) => s.activeListId);
  return useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists[0],
    [lists, activeListId],
  );
}

export function useCategoriesOfActiveList(): Category[] {
  const categories = useFinanceStore((s) => s.categories);
  const activeListId = useFinanceStore((s) => s.activeListId);
  return useMemo(
    () =>
      categories
        .filter((c) => c.listId === activeListId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [categories, activeListId],
  );
}

/** Transacciones de la lista activa dentro del período seleccionado. */
export function usePeriodTransactions(): Transaction[] {
  const transactions = useFinanceStore((s) => s.transactions);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const period = useUiStore((s) => s.period);
  return useMemo(
    () => filterTransactions(transactions, { listId: activeListId, period }),
    [transactions, activeListId, period],
  );
}

/** Balance por mes de un año (para el selector de período). */
export function useMonthBalances(year: number): number[] {
  const transactions = useFinanceStore((s) => s.transactions);
  const activeListId = useFinanceStore((s) => s.activeListId);
  return useMemo(() => {
    const totals = new Array(12).fill(0);
    for (const tx of transactions) {
      if (tx.listId !== activeListId) continue;
      if (Number(tx.date.slice(0, 4)) !== year) continue;
      const m = Number(tx.date.slice(5, 7)) - 1;
      totals[m] += tx.type === 'income' ? tx.amount : -tx.amount;
    }
    return totals.map((t) => Math.round(t * 100) / 100);
  }, [transactions, activeListId, year]);
}

/** Años con movimientos en la lista activa (incluye el actual). */
export function useAvailableYears(): number[] {
  const transactions = useFinanceStore((s) => s.transactions);
  const activeListId = useFinanceStore((s) => s.activeListId);
  return useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const tx of transactions) {
      if (tx.listId === activeListId) years.add(Number(tx.date.slice(0, 4)));
    }
    return [...years].sort((a, b) => b - a);
  }, [transactions, activeListId]);
}

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
}

/** Totales por categoría (orden desc) para el tipo y período activos. */
export function useCategoryTotals(): CategoryTotal[] {
  const txs = usePeriodTransactions();
  const txType = useUiStore((s) => s.txType);
  const categoryMap = useCategoryMap();
  return useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>();
    for (const tx of txs) {
      if (tx.type !== txType) continue;
      const cur = totals.get(tx.categoryId) ?? { total: 0, count: 0 };
      cur.total += tx.amount;
      cur.count += 1;
      totals.set(tx.categoryId, cur);
    }
    const out: CategoryTotal[] = [];
    for (const [categoryId, { total, count }] of totals) {
      const category = categoryMap.get(categoryId);
      if (category) out.push({ category, total: Math.round(total * 100) / 100, count });
    }
    return out.sort((a, b) => b.total - a.total);
  }, [txs, txType, categoryMap]);
}

/** Balance, total de gastos y total de ingresos del período activo. */
export function usePeriodSummary() {
  const txs = usePeriodTransactions();
  return useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const tx of txs) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return {
      balance: Math.round((income - expense) * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      income: Math.round(income * 100) / 100,
    };
  }, [txs]);
}

/** Transacciones visibles (tipo activo) ordenadas por fecha desc. */
export function useVisibleTransactions(): Transaction[] {
  const txs = usePeriodTransactions();
  const txType = useUiStore((s) => s.txType);
  return useMemo(() => sortByDateDesc(txs.filter((t) => t.type === txType)), [txs, txType]);
}

export { balanceOf };
