import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

/**
 * Bloquea el scroll del documento mientras `active` sea true. Soporta
 * bloqueos anidados (varios sheets abiertos a la vez) mediante un contador
 * compartido. Sin esto, iOS Safari desplaza toda la página al enfocar un
 * input dentro de un sheet, produciendo el salto brusco hacia arriba.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    if (lockCount === 1) {
      savedScrollY = window.scrollY;
      const { style } = document.body;
      style.position = 'fixed';
      style.top = `-${savedScrollY}px`;
      style.left = '0';
      style.right = '0';
      style.width = '100%';
    }
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const { style } = document.body;
        style.position = '';
        style.top = '';
        style.left = '';
        style.right = '';
        style.width = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
