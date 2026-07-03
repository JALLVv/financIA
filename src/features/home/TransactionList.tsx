import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useCallback, useMemo, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { RepeatIcon } from '@/components/ui/Icon';
import { useCategoryMap, useVisibleTransactions } from '@/hooks/useDerivedData';
import type { Category, Transaction } from '@/models/types';
import { haptics } from '@/services/haptics';
import { useUiStore } from '@/store/useUiStore';
import { friendlyDay } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

type Row =
  | { kind: 'header'; date: string; key: string }
  | { kind: 'tx'; tx: Transaction; key: string };

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 64;

export const TransactionRow = memo(function TransactionRow({
  tx,
  category,
  onPress,
  showList,
  listName,
}: {
  tx: Transaction;
  category: Category | undefined;
  onPress?: (tx: Transaction) => void;
  showList?: boolean;
  listName?: string;
}) {
  const income = tx.type === 'income';
  return (
    <button
      className="tx-row"
      onClick={
        onPress
          ? () => {
              haptics.light();
              onPress(tx);
            }
          : undefined
      }
    >
      <span className="tx-emoji" style={{ background: `${category?.color ?? '#666'}26` }}>
        {category?.emoji ?? '❓'}
      </span>
      <span className="tx-main">
        <span className="tx-category">
          {category?.name ?? 'Sin categoría'}
          {showList && listName ? ` · ${listName}` : ''}
          {tx.recurringId && (
            <span className="tx-recurring-badge" title="Recurrente">
              <RepeatIcon size={12} />
            </span>
          )}
        </span>
        <span className="tx-desc">{tx.description || (income ? 'Ingreso' : 'Gasto')}</span>
      </span>
      <span className={`tx-amount ${income ? 'income' : 'expense'}`}>
        {income ? '+' : '−'}
        {formatMoney(tx.amount)}
      </span>
    </button>
  );
});

interface TransactionListProps {
  /**
   * Elemento con scroll propio (`.home-scroll`) sobre el que virtualizar.
   * Se recibe como *valor de estado* (no como `RefObject`): un `ref` de un
   * ancestro se adjunta después de que los `useLayoutEffect` de los
   * descendientes ya corrieron en el mismo commit, así que leerlo
   * directamente en el primer render de este componente devuelve `null` de
   * forma permanente (nada vuelve a disparar un re-render). Como estado,
   * la asignación del nodo fuerza un re-render que sí propaga el valor real.
   */
  scrollContainer: HTMLDivElement | null;
}

/** Lista de movimientos agrupada por día y virtualizada sobre el scroll de la pantalla. */
export function TransactionList({ scrollContainer }: TransactionListProps) {
  const txs = useVisibleTransactions();
  const categoryMap = useCategoryMap();
  const txType = useUiStore((s) => s.txType);
  const setDetailTx = useUiStore((s) => s.setDetailTx);
  const listRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDate = '';
    for (const tx of txs) {
      if (tx.date !== lastDate) {
        lastDate = tx.date;
        out.push({ kind: 'header', date: tx.date, key: `h_${tx.date}` });
      }
      out.push({ kind: 'tx', tx, key: tx.id });
    }
    return out;
  }, [txs]);

  const getScrollElement = useCallback(() => scrollContainer, [scrollContainer]);
  const estimateSize = useCallback(
    (i: number) => (rows[i].kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    [rows],
  );
  const getItemKey = useCallback((i: number) => rows[i].key, [rows]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize,
    overscan: 12,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    getItemKey,
  });

  if (txs.length === 0) {
    return (
      <div className="txlist">
        <EmptyState
          title="Sin movimientos"
          subtitle={`Aún no hay ${
            txType === 'expense' ? 'gastos' : 'ingresos'
          } registrados en este período.`}
        />
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className="txlist" ref={listRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={vi.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: vi.size,
                transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {row.kind === 'header' ? (
                <div className="txlist-day-header">{friendlyDay(row.date)}</div>
              ) : (
                <TransactionRow
                  tx={row.tx}
                  category={categoryMap.get(row.tx.categoryId)}
                  onPress={setDetailTx}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
