import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ListPickerSheet } from '@/features/home/ListPickerSheet';
import { PeriodSheet } from '@/features/home/PeriodSelector';
import { TransactionDetailSheet } from '@/features/home/TransactionDetailSheet';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { AddTransactionSheet } from '@/features/transaction/AddTransactionSheet';
import { useFinanceStore } from '@/store/useFinanceStore';

export default function App() {
  const hydrated = useFinanceStore((s) => s.hydrated);
  const runRecurrence = useFinanceStore((s) => s.runRecurrence);

  // Genera recurrentes pendientes al volver a la app (cambio de día incluido).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') runRecurrence();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [runRecurrence]);

  return (
    <AnimatePresence mode="wait">
      {!hydrated ? (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg)',
          }}
        >
          <motion.img
            src="/icon.svg"
            alt="FinancIA"
            width={84}
            height={84}
            style={{ borderRadius: 20 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <HomeScreen />
          <SearchScreen />
          <ProfileScreen />
          <ListPickerSheet />
          <PeriodSheet />
          <TransactionDetailSheet />
          <AddTransactionSheet />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
