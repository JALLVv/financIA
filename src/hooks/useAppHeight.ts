import { useEffect } from 'react';

/**
 * Expone la altura real del viewport visual como `--app-height`.
 *
 * `100dvh` por sí solo no siempre se actualiza de forma fiable en iOS
 * Safari cuando el teclado en pantalla aparece (especialmente en modo
 * standalone de una PWA) — el layout puede quedar calculado contra la
 * altura "de antes" del teclado, empujando contenido fuera de la pantalla.
 * `window.visualViewport` sí refleja el alto real disponible en todo
 * momento, así que lo usamos como fuente de verdad y CSS solo cae a
 * `100dvh` como respaldo antes de la primera medición.
 */
export function useAppHeight() {
  useEffect(() => {
    const vv = window.visualViewport;

    const setHeight = () => {
      const height = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    setHeight();

    vv?.addEventListener('resize', setHeight);
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);

    return () => {
      vv?.removeEventListener('resize', setHeight);
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);
}
