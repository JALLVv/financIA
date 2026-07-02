import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  CameraIcon,
  CheckIcon,
  PencilIcon,
  PersonIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { CategoryFormSheet } from '@/features/transaction/CategoryFormSheet';
import type { Category } from '@/models/types';
import { haptics } from '@/services/haptics';
import { FREQUENCY_LABELS, nextOccurrenceAfter } from '@/services/recurrence';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatDMY, todayISO } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import './profile.css';

/** Redimensiona una imagen a un cuadrado pequeño y devuelve data URL. */
async function resizeImage(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const min = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type PendingDelete =
  | { kind: 'list'; id: string; name: string }
  | { kind: 'category'; id: string; name: string }
  | { kind: 'recurring'; id: string; name: string }
  | null;

export function ProfileScreen() {
  const open = useUiStore((s) => s.profileOpen);
  const setOpen = useUiStore((s) => s.setProfileOpen);
  const openEditRule = useUiStore((s) => s.openEditRule);
  const openCreateRule = useUiStore((s) => s.openCreateRule);

  const profile = useFinanceStore((s) => s.profile);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const lists = useFinanceStore((s) => s.lists);
  const categories = useFinanceStore((s) => s.categories);
  const recurring = useFinanceStore((s) => s.recurring);
  const transactions = useFinanceStore((s) => s.transactions);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const addList = useFinanceStore((s) => s.addList);
  const renameList = useFinanceStore((s) => s.renameList);
  const deleteList = useFinanceStore((s) => s.deleteList);
  const deleteCategory = useFinanceStore((s) => s.deleteCategory);
  const deleteRecurring = useFinanceStore((s) => s.deleteRecurring);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listNameDraft, setListNameDraft] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [catListId, setCatListId] = useState<string>(activeListId);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const catList = lists.some((l) => l.id === catListId) ? catListId : activeListId;
  const listCategories = useMemo(
    () =>
      categories.filter((c) => c.listId === catList).sort((a, b) => a.createdAt - b.createdAt),
    [categories, catList],
  );

  const txCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    return map;
  }, [transactions]);

  const txCountByList = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.listId, (map.get(tx.listId) ?? 0) + 1);
    return map;
  }, [transactions]);

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setProfile({ photo: dataUrl });
      haptics.success();
    } catch {
      /* imagen inválida: ignorar */
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    haptics.warning();
    if (pendingDelete.kind === 'list') deleteList(pendingDelete.id);
    else if (pendingDelete.kind === 'category') deleteCategory(pendingDelete.id);
    else deleteRecurring(pendingDelete.id, { keepTransactions: true });
    setPendingDelete(null);
  };

  return (
    <>
      <Sheet open={open} onClose={() => setOpen(false)} title="Perfil" full z={80}>
        {/* --- Cabecera de perfil --- */}
        <div className="profile-head">
          <button
            className="profile-photo-wrap"
            aria-label="Cambiar foto de perfil"
            onClick={() => fileRef.current?.click()}
          >
            {profile.photo ? (
              <img className="profile-photo" src={profile.photo} alt="Foto de perfil" />
            ) : (
              <span className="profile-photo-placeholder">
                <PersonIcon size={40} strokeWidth={1.6} />
              </span>
            )}
            <span className="profile-photo-edit">
              <CameraIcon size={15} />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhotoChange(e.target.files?.[0])}
          />
          <input
            className="profile-name-input"
            type="text"
            placeholder="Tu nombre"
            value={profile.name}
            maxLength={40}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
        </div>

        {/* --- Listas --- */}
        <div className="profile-section">
          <div className="section-title">Listas</div>
          <div className="form-group">
            {lists.map((list) => (
              <div className="manage-row" key={list.id}>
                {editingListId === list.id ? (
                  <>
                    <input
                      type="text"
                      value={listNameDraft}
                      autoFocus
                      maxLength={40}
                      onChange={(e) => setListNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && listNameDraft.trim()) {
                          renameList(list.id, listNameDraft);
                          setEditingListId(null);
                          haptics.light();
                        }
                      }}
                    />
                    <div className="manage-actions">
                      <button
                        className="mini-btn"
                        aria-label="Guardar nombre"
                        style={{ color: 'var(--green)' }}
                        onClick={() => {
                          if (listNameDraft.trim()) renameList(list.id, listNameDraft);
                          setEditingListId(null);
                          haptics.light();
                        }}
                      >
                        <CheckIcon size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="manage-main">
                      <div className="manage-title">{list.name}</div>
                      <div className="manage-sub">
                        {txCountByList.get(list.id) ?? 0} movimientos
                        {list.id === activeListId ? ' · Activa' : ''}
                      </div>
                    </div>
                    <div className="manage-actions">
                      <button
                        className="mini-btn"
                        aria-label={`Renombrar ${list.name}`}
                        onClick={() => {
                          haptics.light();
                          setEditingListId(list.id);
                          setListNameDraft(list.name);
                        }}
                      >
                        <PencilIcon size={15} />
                      </button>
                      {lists.length > 1 && (
                        <button
                          className="mini-btn danger"
                          aria-label={`Eliminar ${list.name}`}
                          onClick={() => {
                            haptics.light();
                            setPendingDelete({ kind: 'list', id: list.id, name: list.name });
                          }}
                        >
                          <TrashIcon size={15} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {addingList ? (
              <div className="manage-row">
                <input
                  type="text"
                  placeholder="Nombre de la lista"
                  value={newListName}
                  autoFocus
                  maxLength={40}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim()) {
                      addList(newListName);
                      setNewListName('');
                      setAddingList(false);
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
                      if (newListName.trim()) {
                        addList(newListName);
                        haptics.success();
                      }
                      setNewListName('');
                      setAddingList(false);
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
                  setAddingList(true);
                }}
              >
                <PlusIcon size={16} /> Nueva lista
              </button>
            )}
          </div>
        </div>

        {/* --- Categorías --- */}
        <div className="profile-section">
          <div className="section-title">Categorías</div>
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
                  <span className="manage-emoji" style={{ background: `${cat.color}26` }}>
                    {cat.emoji}
                  </span>
                  <div className="manage-main">
                    <div className="manage-title">{cat.name}</div>
                    <div className="manage-sub">
                      {txCountByCategory.get(cat.id) ?? 0} movimientos
                    </div>
                  </div>
                  <div className="manage-actions">
                    <button
                      className="mini-btn"
                      aria-label={`Editar ${cat.name}`}
                      onClick={() => {
                        haptics.light();
                        setEditingCategory(cat);
                        setCatFormOpen(true);
                      }}
                    >
                      <PencilIcon size={15} />
                    </button>
                    <button
                      className="mini-btn danger"
                      aria-label={`Eliminar ${cat.name}`}
                      onClick={() => {
                        haptics.light();
                        setPendingDelete({ kind: 'category', id: cat.id, name: cat.name });
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
                setCatFormOpen(true);
              }}
            >
              <PlusIcon size={16} /> Nueva categoría
            </button>
          </div>
        </div>

        {/* --- Transacciones recurrentes --- */}
        <div className="profile-section">
          <div className="section-title">Transacciones recurrentes</div>
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
                    <span className="manage-emoji" style={{ background: `${cat?.color ?? '#666'}26` }}>
                      {cat?.emoji ?? '🔁'}
                    </span>
                    <div className="manage-main">
                      <div className="manage-title">
                        {rule.description || cat?.name || 'Recurrente'}
                      </div>
                      <div className="manage-sub">
                        {FREQUENCY_LABELS[rule.frequency]} · {listName} · Próx.{' '}
                        {formatDMY(next)}
                      </div>
                    </div>
                    <span
                      className="tx-amount"
                      style={{
                        color: rule.type === 'income' ? 'var(--green)' : 'var(--label)',
                        fontSize: 14,
                      }}
                    >
                      {rule.type === 'income' ? '+' : '−'}
                      {formatMoney(rule.amount)}
                    </span>
                    <div className="manage-actions">
                      <button
                        className="mini-btn"
                        aria-label="Editar recurrente"
                        onClick={() => {
                          haptics.light();
                          openEditRule(rule);
                        }}
                      >
                        <PencilIcon size={15} />
                      </button>
                      <button
                        className="mini-btn danger"
                        aria-label="Eliminar recurrente"
                        onClick={() => {
                          haptics.light();
                          setPendingDelete({
                            kind: 'recurring',
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
        </div>
      </Sheet>

      <CategoryFormSheet
        open={catFormOpen}
        onClose={() => {
          setCatFormOpen(false);
          setEditingCategory(null);
        }}
        listId={catList}
        editing={editingCategory}
        z={130}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === 'list'
            ? `¿Eliminar "${pendingDelete.name}"?`
            : pendingDelete?.kind === 'category'
              ? `¿Eliminar "${pendingDelete.name}"?`
              : `¿Eliminar ${pendingDelete?.name ?? ''}?`
        }
        message={
          pendingDelete?.kind === 'list'
            ? 'Se eliminarán también sus categorías, movimientos y recurrentes. Esta acción no se puede deshacer.'
            : pendingDelete?.kind === 'category'
              ? 'Se eliminarán también todos sus movimientos. Esta acción no se puede deshacer.'
              : 'Los movimientos ya generados se conservarán.'
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
