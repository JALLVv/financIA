/** Formateo de dinero. */

const fmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtInt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `$1,234.56` (siempre valor absoluto; el signo lo maneja quien llama). */
export function formatMoney(value: number, opts?: { compactInt?: boolean }): string {
  const abs = Math.abs(value);
  if (opts?.compactInt && Number.isInteger(Math.round(abs * 100) / 100) && abs === Math.trunc(abs)) {
    return `$${fmtInt.format(abs)}`;
  }
  return `$${fmt.format(abs)}`;
}

/** `+$540` / `-$120` con signo explícito. */
export function formatSignedMoney(value: number): string {
  const sign = value < 0 ? '-' : '+';
  return `${sign}${formatMoney(value, { compactInt: true })}`;
}

/** Formato compacto para ejes/barras: $1.2k, $34k… */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `$${(abs / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${fmtInt.format(abs)}`;
}

/** Parsea la entrada de usuario a número (acepta coma o punto decimal). */
export function parseAmount(input: string): number {
  const normalized = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
