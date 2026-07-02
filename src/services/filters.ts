import type { Period, Transaction, TxType } from '@/models/types';
import { monthOf, yearOf } from '@/utils/dates';

export function matchesPeriod(tx: Transaction, period: Period): boolean {
  if (period.mode === 'all') return true;
  if (yearOf(tx.date) !== period.year) return false;
  if (period.mode === 'month') return monthOf(tx.date) === period.month;
  return true;
}

export interface TxFilter {
  listId?: string;
  period?: Period;
  type?: TxType | 'both';
  categoryId?: string;
  text?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function filterTransactions(transactions: Transaction[], f: TxFilter): Transaction[] {
  const text = f.text?.trim().toLowerCase();
  return transactions.filter((tx) => {
    if (f.listId && tx.listId !== f.listId) return false;
    if (f.type && f.type !== 'both' && tx.type !== f.type) return false;
    if (f.categoryId && tx.categoryId !== f.categoryId) return false;
    if (f.period && !matchesPeriod(tx, f.period)) return false;
    if (f.dateFrom && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date > f.dateTo) return false;
    if (text && !tx.description.toLowerCase().includes(text)) return false;
    return true;
  });
}

/** Suma con signo: ingresos suman, gastos restan. */
export function balanceOf(transactions: Transaction[]): number {
  let total = 0;
  for (const tx of transactions) total += tx.type === 'income' ? tx.amount : -tx.amount;
  return Math.round(total * 100) / 100;
}

export function totalOf(transactions: Transaction[], type: TxType): number {
  let total = 0;
  for (const tx of transactions) if (tx.type === type) total += tx.amount;
  return Math.round(total * 100) / 100;
}

/** Ordena por fecha desc y luego por creación desc. */
export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}
