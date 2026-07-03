import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import './Sheet.css';

/** Pila de sheets abiertos, para que Escape solo cierre el que está encima. */
let openSheets: { id: symbol; z: number }[] = [];

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Botón de acción a la derecha del título. */
  headerAction?: ReactNode;
  /** Altura completa (para pantallas como Buscar / Perfil). */
  full?: boolean;
  /** z-index base para apilar sheets. */
  z?: number;
}

const spring = { type: 'spring', damping: 32, stiffness: 340, mass: 0.9 } as const;

/** Bottom sheet estilo iOS con drag-to-dismiss, blur y esquinas continuas. */
export function Sheet({ open, onClose, children, title, headerAction, full, z = 100 }: SheetProps) {
  useScrollLock(open);

  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('sheet');

  useEffect(() => {
    if (!open) return;
    const id = idRef.current!;
    openSheets.push({ id, z });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const topZ = Math.max(...openSheets.map((s) => s.z));
      if (z === topZ) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      openSheets = openSheets.filter((s) => s.id !== id);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, z]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="sheet-backdrop"
          style={{ zIndex: z }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        />
      )}
      {open && (
        <motion.div
          key="panel"
          className={`sheet-panel ${full ? 'sheet-full' : ''}`}
          style={{ zIndex: z + 1 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={spring}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 600) onClose();
          }}
        >
          <div className="sheet-grabber" />
          {(title || headerAction) && (
            <div className="sheet-header">
              <span className="sheet-title">{title}</span>
              <div className="sheet-header-action">{headerAction}</div>
            </div>
          )}
          <div className="sheet-content">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
