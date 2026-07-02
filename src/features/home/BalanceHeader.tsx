import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedAmount } from '@/components/ui/AnimatedAmount';
import { usePeriodSummary } from '@/hooks/useDerivedData';
import { formatMoney } from '@/utils/money';

export function BalanceHeader() {
  const { balance } = usePeriodSummary();
  const negative = balance < 0;

  return (
    <section className="balance-block" aria-label="Balance actual">
      <div className="balance-caption">Total</div>
      <div className="balance-row">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={negative ? 'neg' : 'pos'}
            className={`balance-sign ${negative ? 'negative' : 'positive'}`}
            initial={{ scale: 0.4, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0, rotate: 90 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            aria-label={negative ? 'Balance negativo' : 'Balance positivo'}
          >
            {negative ? '−' : '+'}
          </motion.div>
        </AnimatePresence>
        <AnimatedAmount className="balance-amount tabular" value={Math.abs(balance)} format={formatMoney} />
      </div>
    </section>
  );
}
