import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
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
  const keyboardInset = useKeyboardInset();
  const panelRef = useRef<HTMLDivElement>(null);

  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('sheet');

  // No confiamos en que el navegador auto-desplace el input enfocado al
  // aparecer el teclado (ese comportamiento nativo está atado a la
  // aparición real del teclado del SO, y en algunos casos/navegadores no
  // se dispara de forma fiable). En cuanto el inset del teclado cambia,
  // desplazamos nosotros mismos el elemento enfocado dentro del sheet.
  useEffect(() => {
    if (!open || keyboardInset === 0) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) {
      // Esperar a que termine la transición CSS de bottom/height (220ms)
      // antes de medir dónde queda el elemento; si medimos a mitad de la
      // transición, el navegador puede creer que ya está visible.
      const t = setTimeout(() => {
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 260);
      return () => clearTimeout(t);
    }
  }, [open, keyboardInset]);

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
          ref={panelRef}
          className={`sheet-panel ${full ? 'sheet-full' : ''}`}
          style={{
            zIndex: z + 1,
            // El teclado empuja el sheet hacia arriba justo lo necesario
            // para quedar siempre visible encima de él — ver useKeyboardInset.
            bottom: keyboardInset,
            ...(full
              ? { height: `calc(var(--app-height, 100dvh) - var(--safe-top) - 12px - ${keyboardInset}px)` }
              : { maxHeight: `calc(var(--app-height, 100dvh) - var(--safe-top) - 32px - ${keyboardInset}px)` }),
          }}
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
