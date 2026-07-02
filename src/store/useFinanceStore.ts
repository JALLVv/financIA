import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Category,
  List,
  Profile,
  RecurringRule,
  Transaction,
} from '@/models/types';
import { materializePending } from '@/services/recurrence';
import { uid } from '@/utils/id';
import { idbStorage } from './storage';
import { createSeed } from './seed';

interface FinanceState {
  hydrated: boolean;
  lists: List[];
  categories: Category[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  profile: Profile;
  activeListId: string;

  setHydrated: () => void;
  setActiveList: (id: string) => void;

  addList: (name: string) => List;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;

  addCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Category;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'emoji' | 'color'>>) => void;
  deleteCategory: (id: string) => void;

  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;

  addRecurring: (data: Omit<RecurringRule, 'id' | 'createdAt'>) => RecurringRule;
  updateRecurring: (id: string, patch: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>) => void;
  deleteRecurring: (id: string, opts?: { keepTransactions?: boolean }) => void;

  setProfile: (patch: Partial<Profile>) => void;

  /** Materializa las transacciones recurrentes pendientes hasta hoy. */
  runRecurrence: () => void;
}

const seed = createSeed();

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      lists: seed.lists,
      categories: seed.categories,
      transactions: [],
      recurring: [],
      profile: { name: '', photo: null },
      activeListId: seed.activeListId,

      setHydrated: () => set({ hydrated: true }),

      setActiveList: (id) => set({ activeListId: id }),

      addList: (name) => {
        const list: List = { id: uid('list'), name: name.trim(), createdAt: Date.now() };
        set((s) => ({ lists: [...s.lists, list] }));
        return list;
      },

      renameList: (id, name) =>
        set((s) => ({
          lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)),
        })),

      deleteList: (id) =>
        set((s) => {
          if (s.lists.length <= 1) return s;
          const lists = s.lists.filter((l) => l.id !== id);
          return {
            lists,
            categories: s.categories.filter((c) => c.listId !== id),
            transactions: s.transactions.filter((t) => t.listId !== id),
            recurring: s.recurring.filter((r) => r.listId !== id),
            activeListId: s.activeListId === id ? lists[0].id : s.activeListId,
          };
        }),

      addCategory: (data) => {
        const category: Category = { ...data, id: uid('cat'), createdAt: Date.now() };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          transactions: s.transactions.filter((t) => t.categoryId !== id),
          recurring: s.recurring.filter((r) => r.categoryId !== id),
        })),

      addTransaction: (data) => {
        const tx: Transaction = { ...data, id: uid('tx'), createdAt: Date.now() };
        set((s) => ({ transactions: [...s.transactions, tx] }));
        return tx;
      },

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addRecurring: (data) => {
        const rule: RecurringRule = { ...data, id: uid('rec'), createdAt: Date.now() };
        set((s) => ({ recurring: [...s.recurring, rule] }));
        get().runRecurrence();
        return rule;
      },

      updateRecurring: (id, patch) => {
        set((s) => ({
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
        get().runRecurrence();
      },

      deleteRecurring: (id, opts) =>
        set((s) => ({
          recurring: s.recurring.filter((r) => r.id !== id),
          transactions: opts?.keepTransactions
            ? s.transactions
            : s.transactions.filter((t) => t.recurringId !== id),
        })),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      runRecurrence: () => {
        const { recurring } = get();
        const { transactions, updatedRules } = materializePending(recurring);
        if (updatedRules.length === 0) return;
        const updatedById = new Map(updatedRules.map((r) => [r.id, r]));
        set((s) => ({
          transactions: transactions.length ? [...s.transactions, ...transactions] : s.transactions,
          recurring: s.recurring.map((r) => updatedById.get(r.id) ?? r),
        }));
      },
    }),
    {
      name: 'financia-store',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        lists: s.lists,
        categories: s.categories,
        transactions: s.transactions,
        recurring: s.recurring,
        profile: s.profile,
        activeListId: s.activeListId,
      }),
      onRehydrateStorage: () => (state) => {
        // Tras hidratar: generar recurrencias pendientes y marcar listo.
        queueMicrotask(() => {
          const s = useFinanceStore.getState();
          s.runRecurrence();
          s.setHydrated();
        });
        void state;
      },
    },
  ),
);
