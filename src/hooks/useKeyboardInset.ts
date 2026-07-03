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
 * Confirmación tardía: la animación nativa del teclado en iOS dura
 * ~250ms, más que nuestro SETTLE_DELAY. Si iOS no dispara un evento
 * `resize` por cada cuadro de esa animación (los navegadores a veces los
 * agrupan/omiten), nuestro debounce puede terminar de esperar durante un
 * instante intermedio de la animación en vez del valor final ya
 * asentado, y medir un "teclado" más alto de lo que en verdad es. Esta
 * segunda lectura, bastante después de la animación nativa, corrige ese
 * valor si hizo falta.
 */
const CONFIRM_DELAY = 320;
/**
 * Tope superior (más alto que cualquier teclado + barra de accesorios
 * real en iOS). Segunda red de seguridad: si por lo que sea el valor
 * calculado igual se dispara, esto evita que `max-height` en Sheet.tsx
 * quede negativo (el navegador lo ignora, sheet sin límite de alto,
 * empujado fuera de la pantalla por arriba).
 */
const MAX_KEYBOARD_INSET = 360;

/**
 * Línea base compartida entre todos los sheets abiertos (no un estado por
 * instancia): se inicializa al cargar la app, muy antes de que exista
 * cualquier teclado, y sigue siendo válida aunque un sheet nuevo se monte
 * mientras OTRO ya tiene el teclado abierto (p. ej. abrir "Nueva
 * categoría" desde dentro del formulario de un movimiento) — si cada
 * instancia capturara su propia línea base al montarse, en ese caso
 * capturaría por error el alto YA encogido por el teclado como si fuera
 * "sin teclado".
 */
let sharedBaseline = window.visualViewport?.height ?? window.innerHeight;

/**
 * Devuelve, en píxeles, cuánto del *layout viewport* está actualmente
 * cubierto por el teclado en pantalla (0 si está cerrado o si el cambio
 * detectado es demasiado pequeño para ser un teclado real).
 *
 * `position: fixed; bottom: 0` ancla un elemento al fondo del *layout*
 * viewport, que en iOS Safari normalmente NO se reduce cuando aparece el
 * teclado (solo el *visual* viewport se encoge).
 *
 * NO comparamos contra `window.innerHeight`: en iOS Safari, ese valor
 * puede crecer al mismo tiempo que se abre el teclado, si Safari
 * aprovecha para ocultar su propia barra de direcciones en el mismo
 * gesto — la resta entonces incluye TANTO el alto del teclado COMO el
 * espacio que ganó la barra de direcciones al ocultarse, e infla el
 * resultado muy por encima del teclado real (justo lo que empujaba el
 * sheet entero, encabezado incluido, fuera de la pantalla).
 *
 * En cambio, llevamos nuestra propia línea base (`baseline`): el último
 * `visualViewport.height` visto mientras el teclado estaba cerrado. Se
 * actualiza sola cada vez que confirmamos "sin teclado", así que sigue
 * la barra de direcciones (o cualquier otro cambio de chrome) cuando
 * ocurre en solitario, y solo mide el teclado cuando este realmente
 * hace que el viewport visual se encoja respecto a esa línea base.
 *
 * A propósito tampoco usamos `visualViewport.offsetTop` (la fórmula que
 * aparece en la mayoría de guías): ese valor cambia cada vez que Safari
 * desplaza el viewport visual para traer el campo recién enfocado por
 * encima del teclado, aunque el teclado en sí no haya cambiado de alto,
 * y eso hacía temblar el sheet al cambiar de campo.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let confirmTimer: ReturnType<typeof setTimeout> | null = null;

    const commit = (isConfirmation = false) => {
      const delta = Math.round(sharedBaseline - vv.height);
      if (delta > KEYBOARD_THRESHOLD) {
        const next = Math.min(MAX_KEYBOARD_INSET, delta);
        setInset((prev) => (Math.abs(next - prev) < 2 ? prev : next));
        // Puede que hayamos leído esto a mitad de la animación nativa del
        // teclado si iOS no siguió disparando `resize` en cada cuadro —
        // se vuelve a medir una sola vez más, más tarde (cuando seguro ya
        // terminó), y se corrige si el valor final resultó distinto.
        if (!isConfirmation) {
          if (confirmTimer) clearTimeout(confirmTimer);
          confirmTimer = setTimeout(() => commit(true), CONFIRM_DELAY);
        }
      } else {
        // Sin teclado (o un reajuste menor de chrome): esto es "la
        // verdad" actual, así que se convierte en la nueva línea base.
        sharedBaseline = vv.height;
        setInset((prev) => (prev === 0 ? prev : 0));
      }
    };

    const scheduleUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(commit, SETTLE_DELAY);
    };

    // Un giro de pantalla cambia `visualViewport.height` por una razón
    // legítima ajena al teclado — sin esto, `commit` compararía el nuevo
    // alto contra la línea base de la orientación anterior y lo
    // confundiría con un teclado enorme. Se resetea sin pasar por el
    // umbral, y con un pequeño retraso porque iOS no siempre reporta las
    // nuevas dimensiones de inmediato.
    let orientationTimer: ReturnType<typeof setTimeout> | null = null;
    const onOrientation = () => {
      if (orientationTimer) clearTimeout(orientationTimer);
      orientationTimer = setTimeout(() => {
        sharedBaseline = vv.height;
        setInset((prev) => (prev === 0 ? prev : 0));
      }, 300);
    };

    commit();
    vv.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      vv.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', onOrientation);
      if (timer) clearTimeout(timer);
      if (confirmTimer) clearTimeout(confirmTimer);
      if (orientationTimer) clearTimeout(orientationTimer);
    };
  }, []);

  return inset;
}
