import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlusIcon, TrashIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { CategoryFormSheet } from '@/features/transaction/CategoryFormSheet';
import type { Category } from '@/models/types';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';

interface CategoriesManageSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Gestión de categorías: tocar una categoría abre su edición, el ícono de
 * papelera la elimina. El estado local se reinicia cada vez que el sheet se
 * abre, así nunca reaparece en modo edición de una sesión anterior.
 */
export function CategoriesManageSheet({ open, onClose }: CategoriesManageSheetProps) {
  const lists = useFinanceStore((s) => s.lists);
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const deleteCategory = useFinanceStore((s) => s.deleteCategory);

  const [catListId, setCatListId] = useState(activeListId);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCatListId(activeListId);
    setEditingCategory(null);
    setFormOpen(false);
    setPendingDelete(null);
  }, [open, activeListId]);

  const catList = lists.some((l) => l.id === catListId) ? catListId : activeListId;
  const listCategories = useMemo(
    () => categories.filter((c) => c.listId === catList).sort((a, b) => a.createdAt - b.createdAt),
    [categories, catList],
  );

  const txCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    return map;
  }, [transactions]);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Categorías" z={90}>
        <div className="list-tabs">
          {lists.map((l) => (
            <button
              key={l.id}
              className={`list-tab ${l.id === catList ? 'active' : ''}`}
              onClick={() => {
                haptics.light();
                setCatListId(l.id);
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div className="form-group">
          <AnimatePresence initial={false}>
            {listCategories.map((cat) => (
              <motion.div
                className="manage-row"
                key={cat.id}
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
                    setEditingCategory(cat);
                    setFormOpen(true);
                  }}
                  aria-label={`Editar ${cat.name}`}
                >
                  <span className="manage-emoji" style={{ background: `${cat.color}40` }}>
                    {cat.emoji}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <div className="manage-title">{cat.name}</div>
                    <div className="manage-sub">{txCountByCategory.get(cat.id) ?? 0} movimientos</div>
                  </span>
                </button>
                <div className="manage-actions">
                  <button
                    className="mini-btn danger"
                    aria-label={`Eliminar ${cat.name}`}
                    onClick={() => {
                      haptics.light();
                      setPendingDelete({ id: cat.id, name: cat.name });
                    }}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            className="manage-add-row"
            onClick={() => {
              haptics.light();
              setEditingCategory(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon size={16} /> Nueva categoría
          </button>
        </div>
      </Sheet>

      <CategoryFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
        listId={catList}
        editing={editingCategory}
        z={110}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar "${pendingDelete?.name ?? ''}"?`}
        message="Se eliminarán también todos sus movimientos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (pendingDelete) {
            haptics.warning();
            deleteCategory(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
