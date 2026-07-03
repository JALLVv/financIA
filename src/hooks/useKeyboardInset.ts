import { useEffect, useState } from 'react';

/**
 * Igual que en `useAppHeight`: por debajo de este alto no lo tratamos como
 * teclado (barra de Safari, reajustes menores al cambiar de campo, etc.),
 * solo lo grande y sostenido en el tiempo cuenta como "el teclado abrió".
 */
const KEYBOARD_THRESHOLD = 150;
/** Espera a que el viewport deje de moverse antes de aplicar el cambio,
 * para no reaccionar a cada evento intermedio de la propia animación del
 * teclado (eso es lo que se sentía como temblor al cambiar de campo). */
const SETTLE_DELAY = 90;
/**
 * Tope superior generoso (más alto que cualquier teclado + barra de
 * accesorios real en iOS). Cuando el teclado se abre, Safari a veces
 * también oculta su propia barra de direcciones para ganar espacio —
 * eso hace crecer `window.innerHeight` al mismo tiempo que
 * `visualViewport.height` se reduce, e infla `measured` muy por encima
 * del alto real del teclado. Sin este tope, un valor inflado puede
 * dejar `max-height` en negativo en Sheet.tsx, que el navegador ignora
 * (sheet sin límite de alto) y termina empujando todo el panel — con su
 * encabezado y el campo enfocado — fuera de la pantalla por arriba.
 */
const MAX_KEYBOARD_INSET = 420;

/**
 * Devuelve, en píxeles, cuánto del *layout viewport* está actualmente
 * cubierto por el teclado en pantalla (0 si está cerrado o si el cambio
 * detectado es demasiado pequeño para ser un teclado real).
 *
 * `position: fixed; bottom: 0` ancla un elemento al fondo del *layout*
 * viewport, que en iOS Safari normalmente NO se reduce cuando aparece el
 * teclado (solo el *visual* viewport se encoge), así que basta con la
 * diferencia de alto entre ambos viewports:
 *
 *   window.innerHeight - visualViewport.height
 *
 * A propósito NO usamos `visualViewport.offsetTop` (la fórmula que
 * aparece en la mayoría de guías): ese valor cambia cada vez que Safari
 * desplaza el viewport visual para traer el campo recién enfocado por
 * encima del teclado, aunque el teclado en sí no haya cambiado de alto.
 * Si lo restamos, cada cambio de campo con el teclado ya abierto produce
 * un `inset` distinto durante ese desplazamiento — y el sheet entero
 * "tiembla" siguiendo ese vaivén. El alto del teclado, en cambio, se
 * mantiene constante entre campos del mismo tipo, así que usar solo la
 * diferencia de altura es tanto más simple como más estable.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const commit = () => {
      const measured = Math.min(
        MAX_KEYBOARD_INSET,
        Math.max(0, Math.round(window.innerHeight - vv.height)),
      );
      const next = measured > KEYBOARD_THRESHOLD ? measured : 0;
      setInset((prev) => (Math.abs(next - prev) < 2 ? prev : next));
    };

    const scheduleUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(commit, SETTLE_DELAY);
    };

    commit();
    vv.addEventListener('resize', scheduleUpdate);
    return () => {
      vv.removeEventListener('resize', scheduleUpdate);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return inset;
}
