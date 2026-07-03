import { useEffect, useState } from 'react';

/**
 * Devuelve, en píxeles, cuánto del *layout viewport* está actualmente
 * cubierto por el teclado en pantalla (0 si está cerrado).
 *
 * `position: fixed; bottom: 0` ancla un elemento al fondo del *layout*
 * viewport, que en iOS Safari normalmente NO se reduce cuando aparece el
 * teclado (solo el *visual* viewport se encoge) — por eso un sheet con
 * `bottom: 0` puede terminar detrás del teclado, o el navegador intenta
 * "solucionarlo" desplazando la página, que es exactamente el salto de
 * scroll reportado. La fórmula estándar para el hueco cubierto es:
 *
 *   window.innerHeight - (visualViewport.offsetTop + visualViewport.height)
 *
 * Aplicar este valor como `bottom` (en vez de 0) sube el sheet para que
 * quede siempre justo encima del teclado, sin depender de que el
 * navegador soporte `interactive-widget=resizes-content`.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const bottom = window.innerHeight - (vv.offsetTop + vv.height);
      setInset(Math.max(0, Math.round(bottom)));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
