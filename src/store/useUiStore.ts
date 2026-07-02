import { create } from 'zustand';
import type { Period, RecurringRule, Transaction, TxType } from '@/models/types';

interface UiState {
  /** Tipo mostrado en la pantalla principal. */
  txType: TxType;
  period: Period;

  addSheetOpen: boolean;
  /** Transacción en edición (abre el mismo sheet de agregar). */
  editingTx: Transaction | null;
  /** Regla recurrente en edición (modo regla del sheet). */
  editingRule: RecurringRule | null;
  /** Cuando el sheet se abre en modo "nueva regla recurrente" desde el perfil. */
  creatingRule: boolean;

  searchOpen: boolean;
  profileOpen: boolean;
  listPickerOpen: boolean;
  periodPickerOpen: boolean;
  /** Detalle de transacción seleccionada en la lista. */
  detailTx: Transaction | null;

  setTxType: (t: TxType) => void;
  setPeriod: (p: Period) => void;
  openAdd: () => void;
  openEditTx: (tx: Transaction) => void;
  openEditRule: (rule: RecurringRule) => void;
  openCreateRule: () => void;
  closeAdd: () => void;
  setSearchOpen: (v: boolean) => void;
  setProfileOpen: (v: boolean) => void;
  setListPickerOpen: (v: boolean) => void;
  setPeriodPickerOpen: (v: boolean) => void;
  setDetailTx: (tx: Transaction | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  txType: 'expense',
  period: { mode: 'all' },

  addSheetOpen: false,
  editingTx: null,
  editingRule: null,
  creatingRule: false,

  searchOpen: false,
  profileOpen: false,
  listPickerOpen: false,
  periodPickerOpen: false,
  detailTx: null,

  setTxType: (txType) => set({ txType }),
  setPeriod: (period) => set({ period }),
  openAdd: () => set({ addSheetOpen: true, editingTx: null, editingRule: null, creatingRule: false }),
  openEditTx: (tx) =>
    set({ addSheetOpen: true, editingTx: tx, editingRule: null, creatingRule: false, detailTx: null }),
  openEditRule: (rule) =>
    set({ addSheetOpen: true, editingRule: rule, editingTx: null, creatingRule: false }),
  openCreateRule: () =>
    set({ addSheetOpen: true, editingTx: null, editingRule: null, creatingRule: true }),
  closeAdd: () =>
    set({ addSheetOpen: false, editingTx: null, editingRule: null, creatingRule: false }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setProfileOpen: (profileOpen) => set({ profileOpen }),
  setListPickerOpen: (listPickerOpen) => set({ listPickerOpen }),
  setPeriodPickerOpen: (periodPickerOpen) => set({ periodPickerOpen }),
  setDetailTx: (detailTx) => set({ detailTx }),
}));
