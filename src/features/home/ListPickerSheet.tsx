import { useState } from 'react';
import { CheckIcon, PlusIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { balanceOf } from '@/services/filters';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { formatSignedMoney } from '@/utils/money';

/** Sheet para cambiar de lista o crear una nueva. */
export function ListPickerSheet() {
  const open = useUiStore((s) => s.listPickerOpen);
  const setOpen = useUiStore((s) => s.setListPickerOpen);
  const lists = useFinanceStore((s) => s.lists);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const setActiveList = useFinanceStore((s) => s.setActiveList);
  const addList = useFinanceStore((s) => s.addList);
  const transactions = useFinanceStore((s) => s.transactions);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const close = () => {
    setOpen(false);
    setCreating(false);
    setName('');
  };

  return (
    <Sheet open={open} onClose={close} title="Listas" z={110}>
      {lists.map((list) => {
        const balance = balanceOf(transactions.filter((t) => t.listId === list.id));
        const selected = list.id === activeListId;
        return (
          <button
            key={list.id}
            className="list-picker-row"
            onClick={() => {
              haptics.medium();
              setActiveList(list.id);
              close();
            }}
          >
            <span>{list.name}</span>
            <span
              className="list-balance"
              style={{ color: balance < 0 ? 'var(--red)' : balance > 0 ? 'var(--green)' : undefined }}
            >
              {balance === 0 ? '—' : formatSignedMoney(balance)}
            </span>
            {selected && (
              <span className="list-check">
                <CheckIcon size={17} />
              </span>
            )}
          </button>
        );
      })}

      {creating ? (
        <div className="form-group" style={{ marginTop: 8 }}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Nombre de la lista"
              value={name}
              autoFocus
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  const list = addList(name);
                  setActiveList(list.id);
                  haptics.success();
                  close();
                }
              }}
            />
            <button
              className="btn-plain"
              disabled={!name.trim()}
              style={{ opacity: name.trim() ? 1 : 0.4 }}
              onClick={() => {
                const list = addList(name);
                setActiveList(list.id);
                haptics.success();
                close();
              }}
            >
              Crear
            </button>
          </div>
        </div>
      ) : (
        <button
          className="list-picker-row add-new"
          onClick={() => {
            haptics.light();
            setCreating(true);
          }}
        >
          <PlusIcon size={18} />
          <span>Nueva lista</span>
        </button>
      )}
    </Sheet>
  );
}
