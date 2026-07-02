/** Utilidades de fechas. Las fechas contables se manejan como ISO `YYYY-MM-DD`. */

export const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTHS_ES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

/** Mes 0-11 */
export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7)) - 1;
}

/** dd/mm/yyyy */
export function formatDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Suma meses conservando el día ancla (con recorte a fin de mes). */
export function addMonthsClamped(startISO: string, months: number): string {
  const [y, m, day] = startISO.split('-').map(Number);
  const totalMonth = m - 1 + months;
  const ty = y + Math.floor(totalMonth / 12);
  const tm = ((totalMonth % 12) + 12) % 12;
  const lastDay = new Date(ty, tm + 1, 0).getDate();
  const td = Math.min(day, lastDay);
  return toISO(new Date(ty, tm, td));
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Etiqueta relativa amigable: Hoy / Ayer / dd/mm/yyyy */
export function friendlyDay(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Hoy';
  if (iso === addDaysISO(today, -1)) return 'Ayer';
  return formatDMY(iso);
}
