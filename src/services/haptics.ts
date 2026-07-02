/**
 * Haptics ligeros. En iOS Safari `navigator.vibrate` no existe, pero en
 * PWAs instaladas y Android sí; la llamada es segura en todos los casos.
 */

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
}

export const haptics = {
  /** Toque ligero: selección, cambios de segmento. */
  light: () => vibrate(8),
  /** Toque medio: abrir sheets, confirmar. */
  medium: () => vibrate(15),
  /** Éxito: guardar registro. */
  success: () => vibrate([10, 30, 12]),
  /** Advertencia / eliminación. */
  warning: () => vibrate([14, 40, 14]),
};
