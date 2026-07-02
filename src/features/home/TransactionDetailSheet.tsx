import { PencilIcon, TrashIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useCategoryMap } from '@/hooks/useDerivedData';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatDMY } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export function TransactionDetailSheet() {
  const tx = useUiStore((s) => s.detailTx);
  const setDetailTx = useUiStore((s) => s.setDetailTx);
  const openEditTx = useUiStore((s) => s.openEditTx);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const lists = useFinanceStore((s) => s.lists);
  const categoryMap = useCategoryMap();

  const category = tx ? categoryMap.get(tx.categoryId) : undefined;
  const listName = tx ? lists.find((l) => l.id === tx.listId)?.name : '';
  const income = tx?.type === 'income';

  return (
    <Sheet open={!!tx} onClose={() => setDetailTx(null)} title="Detalle" z={105}>
      {tx && (
        <>
          <div className="tx-detail-head">
            <span
              className="tx-detail-emoji"
              style={{ background: `${category?.color ?? '#666'}26` }}
            >
              {category?.emoji ?? '❓'}
            </span>
            <div
              className="tx-detail-amount tabular"
              style={{ color: income ? 'var(--green)' : 'var(--label)' }}
            >
              {income ? '+' : '−'}
              {formatMoney(tx.amount)}
            </div>
            <div>
              <div className="tx-detail-desc">{tx.description || (income ? 'Ingreso' : 'Gasto')}</div>
              <div className="tx-detail-sub">
                {category?.name ?? 'Sin categoría'} · {listName} · {formatDMY(tx.date)}
                {tx.recurringId ? ' · Recurrente' : ''}
              </div>
            </div>
          </div>

          <div className="tx-detail-actions">
            <button
              className="action"
              onClick={() => {
                haptics.light();
                openEditTx(tx);
              }}
            >
              <PencilIcon size={17} /> Editar
            </button>
            <button
              className="action destructive"
              onClick={() => {
                haptics.warning();
                deleteTransaction(tx.id);
                setDetailTx(null);
              }}
            >
              <TrashIcon size={17} /> Eliminar
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
