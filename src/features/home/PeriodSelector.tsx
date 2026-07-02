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

export function PeriodButton() {
  const period = useUiStore((s) => s.period);
  const setPeriodPickerOpen = useUiStore((s) => s.setPeriodPickerOpen);

  return (
    <div className="period-wrap">
      <button
        className="period-pill"
        aria-label="Cambiar período"
        onClick={() => {
          haptics.light();
          setPeriodPickerOpen(true);
        }}
      >
        <span className="calendar-ic">
          <CalendarIcon size={15} />
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={periodLabel(period)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            {periodLabel(period)}
          </motion.span>
        </AnimatePresence>
        <ChevronDownIcon size={13} />
      </button>
    </div>
  );
}

type Mode = 'all' | 'year' | 'month';

export function PeriodSheet() {
  const open = useUiStore((s) => s.periodPickerOpen);
  const setOpen = useUiStore((s) => s.setPeriodPickerOpen);
  const period = useUiStore((s) => s.period);
  const setPeriod = useUiStore((s) => s.setPeriod);
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

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onClose={close} title="Período" z={110}>
      <SegmentedControl<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === 'all') {
            setPeriod({ mode: 'all' });
            haptics.medium();
            close();
          }
        }}
        segments={[
          { value: 'all', label: 'Todo' },
          { value: 'year', label: 'Año' },
          { value: 'month', label: 'Mes' },
        ]}
      />

      <AnimatePresence mode="wait">
        {mode !== 'all' && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
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
                      setPeriod({ mode: 'year', year: y });
                      haptics.medium();
                      close();
                    }
                  }}
                >
                  {y}
                </button>
              ))}
            </div>

            {mode === 'month' && (
              <div className="month-grid">
                {MONTHS_ES.map((name, i) => {
                  const balance = monthBalances[i];
                  const selected =
                    period.mode === 'month' && period.year === year && period.month === i;
                  return (
                    <motion.button
                      key={name}
                      className={`month-cell ${selected ? 'selected' : ''}`}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.015, type: 'spring', damping: 24, stiffness: 300 }}
                      onClick={() => {
                        haptics.medium();
                        setPeriod({ mode: 'month', year, month: i });
                        close();
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
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
