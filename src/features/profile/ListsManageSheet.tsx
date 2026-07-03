import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CheckIcon, PlusIcon, TrashIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';

interface ListsManageSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Gestión de listas: tocar el nombre la renombra in situ, el ícono de
 * papelera la elimina. Todo el estado local se reinicia cada vez que el
 * sheet se abre (ver `useEffect` sobre `open`), para que nunca reaparezca
 * en modo edición de una sesión anterior.
 */
export function ListsManageSheet({ open, onClose }: ListsManageSheetProps) {
  const lists = useFinanceStore((s) => s.lists);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const addList = useFinanceStore((s) => s.addList);
  const renameList = useFinanceStore((s) => s.renameList);
  const deleteList = useFinanceStore((s) => s.deleteList);
  const transactions = useFinanceStore((s) => s.transactions);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setDraft('');
    setAdding(false);
    setNewName('');
    setPendingDelete(null);
  }, [open]);

  const txCountByList = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.listId, (map.get(tx.listId) ?? 0) + 1);
    return map;
  }, [transactions]);

  const startEdit = (id: string, name: string) => {
    haptics.light();
    setEditingId(id);
    setDraft(name);
  };

  const commitEdit = () => {
    if (editingId && draft.trim()) renameList(editingId, draft);
    setEditingId(null);
    haptics.light();
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Listas" z={90}>
        <div className="form-group">
          {lists.map((list) => {
            const editing = editingId === list.id;
            return (
              <div className="manage-row" key={list.id}>
                {editing ? (
                  <>
                    <input
                      className="manage-main-indent"
                      type="text"
                      value={draft}
                      autoFocus
                      maxLength={40}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    />
                    <div className="manage-actions">
                      <button
                        className="mini-btn"
                        aria-label="Guardar nombre"
                        style={{ color: 'var(--green)' }}
                        onClick={commitEdit}
                      >
                        <CheckIcon size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      className="manage-main manage-main-indent"
                      onClick={() => startEdit(list.id, list.name)}
                      aria-label={`Editar ${list.name}`}
                    >
                      <div className="manage-title">{list.name}</div>
                      <div className="manage-sub">
                        {txCountByList.get(list.id) ?? 0} movimientos
                        {list.id === activeListId ? ' · Activa' : ''}
                      </div>
                    </button>
                    <div className="manage-actions">
                      {lists.length > 1 && (
                        <button
                          className="mini-btn danger"
                          aria-label={`Eliminar ${list.name}`}
                          onClick={() => {
                            haptics.light();
                            setPendingDelete({ id: list.id, name: list.name });
                          }}
                        >
                          <TrashIcon size={15} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {adding ? (
            <div className="manage-row">
              <input
                type="text"
                placeholder="Nombre de la lista"
                value={newName}
                autoFocus
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    addList(newName);
                    setNewName('');
                    setAdding(false);
                    haptics.success();
                  }
                }}
              />
              <div className="manage-actions">
                <button
                  className="mini-btn"
                  aria-label="Crear lista"
                  style={{ color: 'var(--green)' }}
                  onClick={() => {
                    if (newName.trim()) {
                      addList(newName);
                      haptics.success();
                    }
                    setNewName('');
                    setAdding(false);
                  }}
                >
                  <CheckIcon size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="manage-add-row"
              onClick={() => {
                haptics.light();
                setAdding(true);
              }}
            >
              <PlusIcon size={16} /> Nueva lista
            </button>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`¿Eliminar "${pendingDelete?.name ?? ''}"?`}
        message="Se eliminarán también sus categorías, movimientos y recurrentes. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (pendingDelete) {
            haptics.warning();
            deleteList(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
