import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCategoryTotals } from '@/hooks/useDerivedData';
import { haptics } from '@/services/haptics';
import { useUiStore } from '@/store/useUiStore';
import { formatCompact, formatMoney } from '@/utils/money';

/** Color plano uniforme de las barras: oscuro pero visible sobre el fondo negro. */
const BAR_COLOR = '#3A3A3D';
const BAR_COLOR_SELECTED = '#54545A';

/** Alto máximo de pista y alto mínimo (para que emoji + monto siempre quepan dentro). */
const TRACK_HEIGHT = 240;
const MIN_BAR_HEIGHT = 88;

/** Gráfico de barras verticales por categoría, ordenado de mayor a menor. */
export const CategoryChart = memo(function CategoryChart() {
  const totals = useCategoryTotals();
  const txType = useUiStore((s) => s.txType);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deseleccionar si la categoría desaparece del gráfico.
  useEffect(() => {
    if (selectedId && !totals.some((t) => t.category.id === selectedId)) {
      setSelectedId(null);
    }
  }, [totals, selectedId]);

  if (totals.length === 0) {
    return (
      <div className="chart-card">
        <EmptyState
          title={txType === 'expense' ? 'Sin gastos en este período' : 'Sin ingresos en este período'}
          subtitle="Toca el botón + para agregar tu primer movimiento."
        />
      </div>
    );
  }

  const max = totals[0].total;
  const grandTotal = totals.reduce((acc, t) => acc + t.total, 0);
  const selected = totals.find((t) => t.category.id === selectedId) ?? null;

  return (
    <div className="chart-card">
      <div className="chart-scroll" role="list" aria-label="Categorías">
        {totals.map(({ category, total }) => {
          const isSelected = category.id === selectedId;
          const barHeight = Math.max(MIN_BAR_HEIGHT, (total / max) * TRACK_HEIGHT);
          return (
            <button
              key={category.id}
              role="listitem"
              className="chart-col"
              aria-label={`${category.name}: ${formatMoney(total)}`}
              onClick={() => {
                haptics.light();
                setSelectedId(isSelected ? null : category.id);
              }}
            >
              <div className="bar-track" style={{ height: TRACK_HEIGHT }}>
                <motion.div
                  className="bar"
                  initial={{ height: 0 }}
                  animate={{
                    height: barHeight,
                    opacity: selectedId && !isSelected ? 0.4 : 1,
                  }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 90, mass: 1 }}
                  style={{
                    background: isSelected ? BAR_COLOR_SELECTED : BAR_COLOR,
                    boxShadow: isSelected ? '0 0 16px rgba(245, 73, 39, 0.3)' : undefined,
                    outline: isSelected ? '1.5px solid var(--accent)' : undefined,
                  }}
                >
                  <span className="bar-emoji-plain">{category.emoji}</span>
                  <span className="bar-amount">{formatCompact(total)}</span>
                </motion.div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="chart-detail"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <span
              className="detail-emoji"
              style={{ background: `${selected.category.color}40` }}
            >
              {selected.category.emoji}
            </span>
            <div>
              <div className="detail-name">{selected.category.name}</div>
              <div className="detail-meta">
                {selected.count} {selected.count === 1 ? 'movimiento' : 'movimientos'} ·{' '}
                {grandTotal > 0 ? Math.round((selected.total / grandTotal) * 100) : 0}% del total
              </div>
            </div>
            <span className="detail-amount" style={{ color: selected.category.color }}>
              {formatMoney(selected.total)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
