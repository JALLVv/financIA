import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
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
  // Estado (no useRef): así la asignación del nodo dispara un re-render que
  // propaga el elemento real a TransactionList — ver comentario en su prop.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className="home">
      <div className="home-scroll" ref={setScrollEl}>
        <TopBar />
        {/* El balance, el selector de tipo y el período nunca se remontan al
            cambiar de lista: solo animan hacia el nuevo valor (contador o
            pastilla), sin desaparecer ni moverse de sitio. */}
        <BalanceHeader />
        <TypeSelector />
        <PeriodButton />
        {/* El gráfico y la lista sí se remontan con una transición suave,
            porque su contenido cambia por completo entre listas. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={activeListId}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <CategoryChart />
            <TransactionList scrollContainer={scrollEl} />
          </motion.main>
        </AnimatePresence>
      </div>
      <Fab />
    </div>
  );
}
