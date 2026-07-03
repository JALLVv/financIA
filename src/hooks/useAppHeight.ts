import { useEffect } from 'react';

/**
 * Umbral en píxeles para decidir si un cambio de `visualViewport.height`
 * es "un teclado abriéndose" (típicamente 250-350px en iPhone) o solo
 * ruido — la barra de Safari mostrándose/ocultándose al hacer scroll,
 * o un pequeño reajuste al cambiar el foco entre campos. Por debajo de
 * este umbral dejamos que el `100dvh` nativo del navegador maneje el
 * cambio (lo hace de forma fluida, sincronizada con su propia animación),
 * en vez de que nuestro JS reaccione y produzca un "salto" perceptible.
 */
const KEYBOARD_THRESHOLD = 150;
/** Tiempo sin nuevos eventos antes de aplicar el cambio — evita que una
 * ráfaga de eventos (la propia animación del teclado abriéndose) dispare
 * varias actualizaciones intermedias que se ven como temblor. */
const SETTLE_DELAY = 90;

/**
 * Igual que en `useKeyboardInset`: no comparamos contra `window.innerHeight`
 * porque en iOS Safari puede crecer al mismo tiempo que se abre el
 * teclado (si Safari oculta su barra de direcciones en el mismo gesto),
 * inflando el "teclado abierto" detectado muy por encima de la realidad.
 * En su lugar seguimos una línea base propia, tomada del último
 * `visualViewport.height` visto sin teclado, que se actualiza sola.
 */
let baseline = window.visualViewport?.height ?? window.innerHeight;

/**
 * Expone la altura real del viewport visual como `--app-height`, pero solo
 * cuando el cambio es lo bastante grande y estable como para tratarse de
 * un teclado real — cualquier otra fluctuación se ignora y se deja que
 * `100dvh` (el valor de respaldo en CSS) la resuelva de forma nativa.
 */
export function useAppHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let committed = vv?.height ?? window.innerHeight;

    const apply = (height: number) => {
      committed = height;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    const commit = () => {
      const measured = vv?.height ?? window.innerHeight;
      const delta = baseline - measured;
      // Tanto con teclado real como sin él, el valor a aplicar es
      // `measured` — la diferencia es que, sin teclado, `measured` ES la
      // nueva línea base (el chrome de Safari pudo haber cambiado).
      if (!(delta > KEYBOARD_THRESHOLD)) baseline = measured;
      if (Math.abs(measured - committed) < 2) return;
      apply(measured);
    };

    const scheduleUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(commit, SETTLE_DELAY);
    };

    apply(vv?.height ?? window.innerHeight);

    // Sin listener de 'scroll': ese evento se dispara al desplazar el
    // viewport visual (p. ej. Safari centrando un campo recién enfocado),
    // no al cambiar de alto — escucharlo solo generaba recomputaciones de
    // sobra sin aportar nada, ya que `commit` únicamente mira `vv.height`.
    vv?.addEventListener('resize', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    return () => {
      vv?.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
