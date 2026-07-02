import { useEffect } from 'react';

let lockCount = 0;

/**
 * Bloquea el scroll del contenedor principal (`.home-scroll`) mientras
 * `active` sea true. Soporta bloqueos anidados (varios sheets abiertos a la
 * vez) mediante un contador compartido.
 *
 * El documento (html/body) nunca es scrollable — ver global.css — así que
 * esto es solo una defensa extra contra "scroll bleed" detrás de un sheet
 * abierto; no depende de guardar/restaurar posiciones de scroll.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    const target = document.querySelector<HTMLElement>('.home-scroll');
    if (lockCount === 1 && target) target.style.overflowY = 'hidden';
    return () => {
      lockCount -= 1;
      if (lockCount === 0 && target) target.style.overflowY = '';
    };
  }, [active]);
}
