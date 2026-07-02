import { useEffect, useMemo, useState } from 'react';
import { CalendarIcon, ListIcon, PlusIcon, RepeatIcon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import type { Frequency, TxType } from '@/models/types';
import { haptics } from '@/services/haptics';
import { FREQUENCIES, FREQUENCY_LABELS } from '@/services/recurrence';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { addDaysISO, formatDMY, todayISO } from '@/utils/dates';
import { parseAmount } from '@/utils/money';
import { CategoryFormSheet } from './CategoryFormSheet';
import { ExpandableRow } from './ExpandableRow';
import './transaction.css';

type FrequencyChoice = Frequency | 'none';

/** Reduce el tamaño de fuente del monto a medida que crece en dígitos, para que nunca se corte. */
function amountFontSize(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '').length;
  if (digits > 9) return 30;
  if (digits > 7) return 36;
  if (digits > 5) return 42;
  return 46;
}

/**
 * Sheet para agregar/editar un movimiento. También maneja reglas
 * recurrentes: crear (desde el perfil o eligiendo repetición) y editar.
 */
export function AddTransactionSheet() {
  const open = useUiStore((s) => s.addSheetOpen);
  const editingTx = useUiStore((s) => s.editingTx);
  const editingRule = useUiStore((s) => s.editingRule);
  const creatingRule = useUiStore((s) => s.creatingRule);
  const closeAdd = useUiStore((s) => s.closeAdd);

  const lists = useFinanceStore((s) => s.lists);
  const categories = useFinanceStore((s) => s.categories);
  const activeListId = useFinanceStore((s) => s.activeListId);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const addRecurring = useFinanceStore((s) => s.addRecurring);
  const updateRecurring = useFinanceStore((s) => s.updateRecurring);

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [listId, setListId] = useState(activeListId);
  const [date, setDate] = useState(todayISO());
  const [frequency, setFrequency] = useState<FrequencyChoice>('none');
  const [expandedRow, setExpandedRow] = useState<'list' | 'freq' | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);

  const isRuleMode = !!editingRule || creatingRule;

  // Inicializar el formulario al abrir.
  useEffect(() => {
    if (!open) return;
    setExpandedRow(null);
    setCatFormOpen(false);
    if (editingTx) {
      setAmountStr(String(editingTx.amount));
      setDescription(editingTx.description);
      setType(editingTx.type);
      setCategoryId(editingTx.categoryId);
      setListId(editingTx.listId);
      setDate(editingTx.date);
      setFrequency('none');
    } else if (editingRule) {
      setAmountStr(String(editingRule.amount));
      setDescription(editingRule.description);
      setType(editingRule.type);
      setCategoryId(editingRule.categoryId);
      setListId(editingRule.listId);
      setDate(editingRule.startDate);
      setFrequency(editingRule.frequency);
    } else {
      setAmountStr('');
      setDescription('');
      setType('expense');
      setCategoryId('');
      setListId(activeListId);
      setDate(todayISO());
      setFrequency(creatingRule ? 'monthly' : 'none');
    }
  }, [open, editingTx, editingRule, creatingRule, activeListId]);

  const listCategories = useMemo(
    () =>
      categories
        .filter((c) => c.listId === listId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [categories, listId],
  );

  const amount = parseAmount(amountStr);
  const valid = amount > 0 && !!categoryId && (!isRuleMode || frequency !== 'none');

  const save = () => {
    if (!valid) return;
    haptics.success();
    const base = { listId, categoryId, type, amount, description: description.trim() };

    if (editingTx) {
      updateTransaction(editingTx.id, { ...base, date });
    } else if (editingRule) {
      updateRecurring(editingRule.id, {
        ...base,
        frequency: frequency as Frequency,
        startDate: date,
      });
    } else if (frequency !== 'none') {
      // Nueva regla recurrente: genera sus instancias desde la fecha de inicio.
      addRecurring({
        ...base,
        frequency: frequency as Frequency,
        startDate: date,
        lastRun: addDaysISO(date, -1),
        active: true,
      });
    } else {
      addTransaction({ ...base, date });
    }
    closeAdd();
  };

  const listOptions = lists.map((l) => ({ value: l.id, label: l.name }));
  const freqOptions = [
    ...(!isRuleMode ? [{ value: 'none' as FrequencyChoice, label: 'Nunca' }] : []),
    ...FREQUENCIES.map((f) => ({ value: f as FrequencyChoice, label: FREQUENCY_LABELS[f] })),
  ];

  const title = editingTx
    ? 'Editar movimiento'
    : editingRule
      ? 'Editar recurrente'
      : creatingRule
        ? 'Nueva recurrente'
        : 'Nuevo movimiento';

  return (
    <>
      <Sheet
        open={open}
        onClose={closeAdd}
        title={title}
        z={120}
        headerAction={
          <button
            className="btn-plain"
            disabled={!valid}
            style={{ opacity: valid ? 1 : 0.4 }}
            onClick={save}
          >
            OK
          </button>
        }
      >
        <div className="add-form">
          <div className="amount-entry">
            <span className="currency">$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Monto"
              value={amountStr}
              autoFocus={!editingTx && !editingRule}
              size={Math.max(1, amountStr.length)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.,]/g, '');
                setAmountStr(v);
              }}
              style={{ fontSize: amountFontSize(amountStr) }}
            />
          </div>

          <SegmentedControl<TxType>
            value={type}
            onChange={setType}
            segments={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
          />

          <div className="form-group">
            <div className="form-row">
              <input
                type="text"
                placeholder="Descripción"
                value={description}
                maxLength={80}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="section-title">Categoría</div>
            <div className="category-chips">
              <button type="button" className="cat-chip add" onClick={() => {
                haptics.light();
                setCatFormOpen(true);
              }}>
                <span className="cat-emoji">
                  <PlusIcon size={22} />
                </span>
                <span className="cat-name">Nueva</span>
              </button>
              {listCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`cat-chip ${cat.id === categoryId ? 'selected' : ''}`}
                  onClick={() => {
                    haptics.light();
                    setCategoryId(cat.id);
                  }}
                >
                  <span className="cat-emoji" style={{ background: `${cat.color}26` }}>
                    {cat.emoji}
                  </span>
                  <span className="cat-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <ExpandableRow
              label="Lista"
              icon={<ListIcon size={18} style={{ color: 'var(--label-2)' }} />}
              valueLabel={lists.find((l) => l.id === listId)?.name ?? ''}
              options={listOptions}
              selected={listId}
              expanded={expandedRow === 'list'}
              onToggle={() => setExpandedRow(expandedRow === 'list' ? null : 'list')}
              onSelect={(id) => {
                if (id !== listId) {
                  setListId(id);
                  setCategoryId('');
                }
                setExpandedRow(null);
              }}
            />
            <div className="form-row">
              <CalendarIcon size={18} style={{ color: 'var(--label-2)' }} />
              <span className="row-label">{isRuleMode ? 'Inicio' : 'Fecha'}</span>
              <span className="row-value">
                <input
                  type="date"
                  value={date}
                  aria-label="Fecha"
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
              </span>
            </div>
            {!editingTx && (
              <ExpandableRow
                label="Repetición"
                icon={<RepeatIcon size={18} style={{ color: 'var(--label-2)' }} />}
                valueLabel={
                  frequency === 'none' ? 'Nunca' : FREQUENCY_LABELS[frequency as Frequency]
                }
                options={freqOptions}
                selected={frequency}
                expanded={expandedRow === 'freq'}
                onToggle={() => setExpandedRow(expandedRow === 'freq' ? null : 'freq')}
                onSelect={(f) => {
                  setFrequency(f);
                  setExpandedRow(null);
                }}
              />
            )}
          </div>

          <button className="btn-primary" disabled={!valid} onClick={save}>
            {editingTx || editingRule ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </Sheet>

      <CategoryFormSheet
        open={catFormOpen}
        onClose={() => setCatFormOpen(false)}
        listId={listId}
        onSaved={(cat) => setCategoryId(cat.id)}
      />
    </>
  );
}
