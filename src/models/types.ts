/** Tipos de dominio de FinancIA. */

export type TxType = 'expense' | 'income';

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly';

export interface List {
  id: string;
  name: string;
  createdAt: number;
}

export interface Category {
  id: string;
  listId: string;
  name: string;
  emoji: string;
  color: string; // hex
  createdAt: number;
}

export interface Transaction {
  id: string;
  listId: string;
  categoryId: string;
  type: TxType;
  /** Monto siempre positivo; el signo lo define `type`. */
  amount: number;
  description: string;
  /** Fecha contable en formato ISO `YYYY-MM-DD`. */
  date: string;
  createdAt: number;
  /** Presente si fue generada por una transacción recurrente. */
  recurringId?: string;
}

export interface RecurringRule {
  id: string;
  listId: string;
  categoryId: string;
  type: TxType;
  amount: number;
  description: string;
  frequency: Frequency;
  /** Primera ocurrencia, ISO `YYYY-MM-DD`. */
  startDate: string;
  /** Última fecha (ISO) hasta la cual ya se generaron instancias. */
  lastRun: string;
  active: boolean;
  createdAt: number;
}

export interface Profile {
  name: string;
  /** Data URL de la foto de perfil. */
  photo: string | null;
}

/** Período de visualización seleccionado. */
export type Period =
  | { mode: 'all' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }; // month: 0-11
