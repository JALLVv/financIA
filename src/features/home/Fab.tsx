import { motion } from 'framer-motion';
import { PlusIcon } from '@/components/ui/Icon';
import { haptics } from '@/services/haptics';
import { useUiStore } from '@/store/useUiStore';

export function Fab() {
  const openAdd = useUiStore((s) => s.openAdd);

  return (
    <motion.button
      className="fab"
      aria-label="Agregar movimiento"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', damping: 16, stiffness: 300, delay: 0.15 }}
      onClick={() => {
        haptics.medium();
        openAdd();
      }}
    >
      <PlusIcon size={26} strokeWidth={2.4} />
    </motion.button>
  );
}
