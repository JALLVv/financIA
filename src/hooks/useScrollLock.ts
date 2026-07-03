import { useEffect } from 'react';

let lockCount = 0;

/**
 * Bloquea el scroll del contenedor principal (`.home-scroll`) mientras
 * `active` sea true. Soporta bloqueos anidados (varios sheets abiertos a la
 * vez) mediante un contador compartido.
 *
 * El documento (html/body) nunca es scrollable — ver global.css. Pero
 * `overflow: hidden` por sí solo no siempre detiene el scroll táctil en iOS
 * Safari (puede seguir "colando" el gesto, sobre todo con el teclado
 * abierto), así que además fijamos `touch-action: none` y cancelamos
 * explícitamente el `touchmove` que empiece dentro de ese contenedor.
 * Los sheets viven fuera de `.home-scroll` (position: fixed), así que su
 * propio scroll interno (`.sheet-content`) no se ve afectado.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    const target = document.querySelector<HTMLElement>('.home-scroll');
    if (lockCount === 1 && target) {
      target.style.overflowY = 'hidden';
      target.style.touchAction = 'none';
    }

    const preventBackgroundTouch = (e: TouchEvent) => {
      if (target && target.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventBackgroundTouch, { passive: false });

    return () => {
      lockCount -= 1;
      document.removeEventListener('touchmove', preventBackgroundTouch);
      if (lockCount === 0 && target) {
        target.style.overflowY = '';
        target.style.touchAction = '';
      }
    };
  }, [active]);
}
