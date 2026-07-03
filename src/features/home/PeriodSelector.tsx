import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CalendarIcon, ChevronDownIcon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useAvailableYears, useMonthBalances } from '@/hooks/useDerivedData';
import type { Period } from '@/models/types';
import { haptics } from '@/services/haptics';
import { useUiStore } from '@/store/useUiStore';
import { MONTHS_ES } from '@/utils/dates';
import { formatSignedMoney } from '@/utils/money';

function periodLabel(period: Period): string {
  if (period.mode === 'all') return 'Todo el tiempo';
  if (period.mode === 'year') return String(period.year);
  return `${MONTHS_ES[period.month]} ${period.year}`;
}

interface PeriodPillProps {
  period: Period;
  onClick: () => void;
  /** Etiqueta cuando no hay período (equivalente a "Todo el tiempo"). */
  placeholder?: string;
  /** Oculta el ícono de calendario (por ejemplo, junto a otros chips de filtro). */
  hideIcon?: boolean;
}

/** Pastilla que muestra el período activo y abre su selector — reutilizable. */
export function PeriodPill({ period, onClick, placeholder, hideIcon }: PeriodPillProps) {
  const label = period.mode === 'all' && placeholder ? placeholder : periodLabel(period);
  return (
    <button className="period-pill" aria-label="Cambiar período" onClick={onClick}>
      {!hideIcon && (
        <span className="calendar-ic">
          <CalendarIcon size={15} />
        </span>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
      <ChevronDownIcon size={13} />
    </button>
  );
}

export function PeriodButton() {
  const period = useUiStore((s) => s.period);
  const setPeriodPickerOpen = useUiStore((s) => s.setPeriodPickerOpen);
  return (
    <div className="period-wrap">
      <PeriodPill
        period={period}
        onClick={() => {
          haptics.light();
          setPeriodPickerOpen(true);
        }}
      />
    </div>
  );
}

type Mode = 'all' | 'year' | 'month';

interface PeriodPickerSheetProps {
  open: boolean;
  onClose: () => void;
  period: Period;
  onChange: (period: Period) => void;
  z?: number;
}

/** Selector de período (Todo/Año/Mes) — controlado, reutilizable fuera de la pantalla principal. */
export function PeriodPickerSheet({ open, onClose, period, onChange, z = 110 }: PeriodPickerSheetProps) {
  const years = useAvailableYears();

  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<Mode>(period.mode);
  const [year, setYear] = useState<number>('year' in period ? period.year : currentYear);
  const monthBalances = useMonthBalances(year);

  // Sincronizar estado local al abrir.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setMode(period.mode);
    setYear('year' in period ? period.year : currentYear);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const yearList = useMemo(
    () => (years.includes(year) ? years : [...years, year].sort((a, b) => b - a)),
    [years, year],
  );

  return (
    <Sheet open={open} onClose={onClose} title="Período" z={z}>
      <SegmentedControl<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === 'all') {
            onChange({ mode: 'all' });
            haptics.medium();
            onClose();
          }
        }}
        segments={[
          { value: 'all', label: 'Todo' },
          { value: 'year', label: 'Año' },
          { value: 'month', label: 'Mes' },
        ]}
      />

      {/* key fijo (no `mode`): así este contenedor y las chips de año no se
          vuelven a montar/animar cada vez que solo se alterna entre
          Año y Mes — únicamente la cuadrícula de meses entra/sale. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {mode !== 'all' && (
          <motion.div
            key="period-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 360 }}
            style={{ paddingTop: 16 }}
          >
            <div className="period-sheet-years" role="listbox" aria-label="Año">
              {yearList.map((y) => (
                <button
                  key={y}
                  className={`year-chip ${y === year ? 'selected' : ''}`}
                  onClick={() => {
                    haptics.light();
                    setYear(y);
                    if (mode === 'year') {
                      onChange({ mode: 'year', year: y });
                      haptics.medium();
                      onClose();
                    }
                  }}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* popLayout: al alternar Año/Mes, la cuadrícula saliente se saca
                del flujo mientras se desvanece, en vez de reservar su alto
                completo (transparente) durante la transición — eso era lo
                que se veía como un hueco vacío por un instante. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'month' && (
                <motion.div
                  key="month-grid-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <div className="month-grid">
                    {MONTHS_ES.map((name, i) => {
                      const balance = monthBalances[i];
                      const selected =
                        period.mode === 'month' && period.year === year && period.month === i;
                      return (
                        <button
                          key={name}
                          className={`month-cell ${selected ? 'selected' : ''}`}
                          onClick={() => {
                            haptics.medium();
                            onChange({ mode: 'month', year, month: i });
                            onClose();
                          }}
                        >
                          <span className="month-name">{name}</span>
                          <span
                            className={`month-balance ${
                              balance > 0 ? 'pos' : balance < 0 ? 'neg' : 'zero'
                            }`}
                          >
                            {balance === 0 ? '—' : formatSignedMoney(balance)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/** Versión conectada al período global de la pantalla principal. */
export function PeriodSheet() {
  const open = useUiStore((s) => s.periodPickerOpen);
  const setOpen = useUiStore((s) => s.setPeriodPickerOpen);
  const period = useUiStore((s) => s.period);
  const setPeriod = useUiStore((s) => s.setPeriod);

  return (
    <PeriodPickerSheet
      open={open}
      onClose={() => setOpen(false)}
      period={period}
      onChange={setPeriod}
      z={110}
    />
  );
}
