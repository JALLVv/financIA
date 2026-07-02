import type { TxType } from '@/models/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AnimatedAmount } from '@/components/ui/AnimatedAmount';
import { usePeriodSummary } from '@/hooks/useDerivedData';
import { useUiStore } from '@/store/useUiStore';
import { formatMoney } from '@/utils/money';

export function TypeSelector() {
  const txType = useUiStore((s) => s.txType);
  const setTxType = useUiStore((s) => s.setTxType);
  const { expense, income } = usePeriodSummary();

  return (
    <div className="type-selector-wrap">
      <SegmentedControl<TxType>
        size="large"
        value={txType}
        onChange={setTxType}
        segments={[
          {
            value: 'expense',
            label: (
              <>
                <span className="type-name">Gastos</span>
                <span className="type-total expense tabular">
                  −<AnimatedAmount value={expense} format={(v) => formatMoney(v, { compactInt: true })} />
                </span>
              </>
            ),
          },
          {
            value: 'income',
            label: (
              <>
                <span className="type-name">Ingresos</span>
                <span className="type-total income tabular">
                  +<AnimatedAmount value={income} format={(v) => formatMoney(v, { compactInt: true })} />
                </span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
