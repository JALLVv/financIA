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

/** Bottom sheet estilo iOS, con blur y esquinas continuas. Se cierra
 * tocando fuera o el botón "Cerrar" — sin gesto de arrastre. */
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
      // Esperar a que el spring de Framer (abajo) termine de asentarse
      // antes de medir dónde queda el elemento; si medimos a mitad de la
      // animación, el navegador puede creer que ya está visible.
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
            // Alto fijo basado en 100dvh (estable, no reacciona al
            // teclado) en vez de --app-height: antes, tanto `bottom` como
            // `height`/`max-height` cambiaban juntos vía transición CSS
            // (que fuerza reflow) cada vez que el teclado cambiaba de
            // alto — p. ej. al saltar de un campo con teclado numérico a
            // uno con teclado completo. Eso era el temblor al cambiar de
            // casillero. Ahora el alto queda fijo y el desplazamiento para
            // esquivar el teclado se hace con `y` (más abajo), que anima
            // por transform — compositor puro, sin reflow.
            ...(full
              ? { height: `calc(100dvh - var(--safe-top) - 12px)` }
              : { maxHeight: `calc(100dvh - var(--safe-top) - 32px)` }),
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: -keyboardInset }}
          exit={{ y: '110%' }}
          transition={spring}
        >
          {(title || headerAction) && (
            <div className="sheet-header">
              <button className="sheet-close-text" onClick={onClose}>
                Cerrar
              </button>
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
