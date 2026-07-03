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
      // Esperar a que el teclado nativo del SO termine su propia animación
      // de apertura antes de medir dónde queda el elemento; si medimos
      // mientras el teclado todavía se está desplegando, el navegador
      // puede creer que ya está visible.
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
            // para quedar siempre visible encima de él, MANTENIENDO fijo
            // el borde superior (así el campo que se está escribiendo,
            // normalmente cerca de arriba, nunca queda tapado ni se va
            // fuera de pantalla). A propósito esto ya NO tiene transición
            // CSS (ver Sheet.css): el valor se aplica al instante en vez
            // de animarse cuadro a cuadro durante ~220ms, que es lo que
            // causaba el temblor al cambiar de casillero (bottom/height
            // son propiedades de layout — animarlas de verdad fuerza un
            // reflow completo en cada frame). Sin transición, el cambio
            // sigue siendo un solo reflow, no docenas repartidos en el
            // tiempo, así que no se nota como temblor.
            bottom: keyboardInset,
            // 100dvh explícito (no --app-height): esa variable YA se
            // reduce sola cuando hay teclado, así que restar keyboardInset
            // encima de ella la resta dos veces y el panel queda mucho más
            // chico de lo necesario — ver el bug que causó eso hace un par
            // de rondas. Con 100dvh (estable) restamos el teclado una sola
            // vez, aquí mismo.
            ...(full
              ? { height: `calc(100dvh - var(--safe-top) - 12px - ${keyboardInset}px)` }
              : { maxHeight: `calc(100dvh - var(--safe-top) - 32px - ${keyboardInset}px)` }),
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
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
