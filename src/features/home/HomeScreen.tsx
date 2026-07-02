import { AnimatePresence, motion } from 'framer-motion';
import { useFinanceStore } from '@/store/useFinanceStore';
import { BalanceHeader } from './BalanceHeader';
import { CategoryChart } from './CategoryChart';
import { Fab } from './Fab';
import { PeriodButton } from './PeriodSelector';
import { TopBar } from './TopBar';
import { TransactionList } from './TransactionList';
import { TypeSelector } from './TypeSelector';
import './home.css';

export function HomeScreen() {
  const activeListId = useFinanceStore((s) => s.activeListId);

  return (
    <div className="home">
      <TopBar />
      {/* Cambiar de lista re-monta el contenido con una transición suave. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={activeListId}
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        >
          <BalanceHeader />
          <TypeSelector />
          <PeriodButton />
          <CategoryChart />
          <TransactionList />
        </motion.main>
      </AnimatePresence>
      <Fab />
    </div>
  );
}
