import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlusIcon, TrashIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { haptics } from '@/services/haptics';
import { FREQUENCY_LABELS, nextOccurrenceAfter } from '@/services/recurrence';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatDMY, todayISO } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

interface RecurringManageSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Gestión de transacciones recurrentes: tocar una la abre para editarla, el
 * ícono de papelera la elimina. El estado local se reinicia cada vez que el
 * sheet se abre.
 */
export function RecurringManageSheet({ open, onClose }: RecurringManageSheetProps) {
  const recurring = useFinanceStore((s) => s.recurring);
  const categories = useFinanceStore((s) => s.categories);
  const lists = useFinanceStore((s) => s.lists);
  const deleteRecurring = useFinanceStore((s) => s.deleteRecurring);
  const openEditRule = useUiStore((s) => s.openEditRule);
  const openCreateRule = useUiStore((s) => s.openCreateRule);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPendingDelete(null);
  }, [open]);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Recurrentes" z={90}>
        <div className="form-group">
          {recurring.length === 0 && (
            <div className="manage-row">
              <div className="manage-main">
                <div className="manage-sub" style={{ padding: '6px 0' }}>
                  Crea pagos o ingresos que se registran solos según su frecuencia.
                </div>
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {recurring.map((rule) => {
              const cat = categories.find((c) => c.id === rule.categoryId);
              const listName = lists.find((l) => l.id === rule.listId)?.name ?? '';
              const next = nextOccurrenceAfter(rule, todayISO());
              return (
                <motion.div
                  className="manage-row"
                  key={rule.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                  style={{ overflow: 'hidden' }}
                >
                  <button
                    className="manage-main"
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    onClick={() => {
                      haptics.light();
                      openEditRule(rule);
                    }}
                    aria-label="Editar recurrente"
                  >
                    <span
                      className="manage-emoji"
                      style={{ background: `${cat?.color ?? '#666'}40` }}
                    >
                      {cat?.emoji ?? '🔁'}
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <div className="manage-title">{rule.description || cat?.name || 'Recurrente'}</div>
                      <div className="manage-sub">
                        {FREQUENCY_LABELS[rule.frequency]} · {listName} · Próx. {formatDMY(next)}
                      </div>
                    </span>
                    <span
                      className="tx-amount"
                      style={{
                        color: rule.type === 'income' ? 'var(--green)' : 'var(--label)',
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {rule.type === 'income' ? '+' : '−'}
                      {formatMoney(rule.amount)}
                    </span>
                  </button>
                  <div className="manage-actions">
                    <button
                      className="mini-btn danger"
                      aria-label="Eliminar recurrente"
                      onClick={() => {
                        haptics.light();
                        setPendingDelete({
                          id: rule.id,
                          name: rule.description || 'esta recurrente',
                        });
                      }}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <button
            className="manage-add-row"
            onClick={() => {
              haptics.light();
              openCreateRule();
            }}
          >
            <PlusIcon size={16} /> Nueva recurrente
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar ${pendingDelete?.name ?? ''}?`}
        message="Los movimientos ya generados se conservarán."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (pendingDelete) {
            haptics.warning();
            deleteRecurring(pendingDelete.id, { keepTransactions: true });
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
