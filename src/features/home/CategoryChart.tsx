import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCategoryTotals } from '@/hooks/useDerivedData';
import { haptics } from '@/services/haptics';
import { useUiStore } from '@/store/useUiStore';
import { formatCompact, formatMoney } from '@/utils/money';

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
          icon={txType === 'expense' ? '📊' : '💸'}
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
          const height = Math.max(0.06, total / max);
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
              <span className="bar-amount">{formatCompact(total)}</span>
              <div className="bar-track">
                <motion.div
                  className="bar"
                  initial={{ scaleY: 0 }}
                  animate={{
                    scaleY: height,
                    opacity: selectedId && !isSelected ? 0.35 : 1,
                  }}
                  whileTap={{ scaleX: 0.85 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(to top, ${category.color}cc, ${category.color})`,
                    boxShadow: isSelected ? `0 0 18px ${category.color}66` : undefined,
                  }}
                />
              </div>
              <span className="bar-emoji" style={{ background: `${category.color}26` }}>
                {category.emoji}
              </span>
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
              style={{ background: `${selected.category.color}26` }}
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
