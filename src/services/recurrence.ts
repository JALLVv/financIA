import type { Frequency, RecurringRule, Transaction } from '@/models/types';
import { addDaysISO, addMonthsClamped, compareISO, todayISO } from '@/utils/dates';
import { uid } from '@/utils/id';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Cada día',
  weekly: 'Cada semana',
  biweekly: 'Cada quincena',
  monthly: 'Cada mes',
  bimonthly: 'Cada bimestre',
  quarterly: 'Cada trimestre',
  semiannual: 'Cada semestre',
  yearly: 'Cada año',
};

export const FREQUENCIES: Frequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'yearly',
];

const DAY_BASED: Partial<Record<Frequency, number>> = {
  daily: 1,
  weekly: 7,
  biweekly: 15,
};

const MONTH_BASED: Partial<Record<Frequency, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

/** n-ésima ocurrencia (0 = startDate) de una regla. */
export function nthOccurrence(rule: Pick<RecurringRule, 'startDate' | 'frequency'>, n: number): string {
  const days = DAY_BASED[rule.frequency];
  if (days != null) return addDaysISO(rule.startDate, n * days);
  const months = MONTH_BASED[rule.frequency]!;
  // Siempre desde el ancla para conservar el día del mes original.
  return addMonthsClamped(rule.startDate, n * months);
}

/** Ocurrencias de la regla dentro de (afterISO, untilISO]. */
export function occurrencesBetween(
  rule: Pick<RecurringRule, 'startDate' | 'frequency'>,
  afterISO: string,
  untilISO: string,
): string[] {
  const out: string[] = [];
  for (let n = 0; n < 5000; n++) {
    const date = nthOccurrence(rule, n);
    if (compareISO(date, untilISO) > 0) break;
    if (compareISO(date, afterISO) > 0) out.push(date);
  }
  return out;
}

/** Próxima ocurrencia estrictamente posterior a `afterISO`. */
export function nextOccurrenceAfter(
  rule: Pick<RecurringRule, 'startDate' | 'frequency'>,
  afterISO: string,
): string {
  for (let n = 0; n < 5000; n++) {
    const date = nthOccurrence(rule, n);
    if (compareISO(date, afterISO) > 0) return date;
  }
  return rule.startDate;
}

export interface MaterializeResult {
  transactions: Transaction[];
  updatedRules: RecurringRule[];
}

/**
 * Genera las transacciones pendientes de todas las reglas activas hasta hoy.
 * Cada regla lleva `lastRun` como marca de agua, por lo que nunca se duplican
 * instancias aunque la app se abra varias veces el mismo día.
 */
export function materializePending(rules: RecurringRule[], now = todayISO()): MaterializeResult {
  const transactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    if (compareISO(rule.lastRun, now) >= 0) continue;

    const dates = occurrencesBetween(rule, rule.lastRun, now);
    for (const date of dates) {
      transactions.push({
        id: uid('tx'),
        listId: rule.listId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        date,
        createdAt: Date.now(),
        recurringId: rule.id,
      });
    }
    updatedRules.push({ ...rule, lastRun: now });
  }

  return { transactions, updatedRules };
}
