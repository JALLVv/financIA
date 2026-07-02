/**
 * Deriva un color "inspirado" en un emoji: lo dibuja en un canvas,
 * promedia sus píxeles dominantes y lo ajusta a un tono vibrante
 * apropiado para tema oscuro. Si el entorno no puede rasterizar el
 * emoji, cae a un color determinista basado en hash.
 */

const FALLBACK_PALETTE = [
  '#FF9F0A',
  '#0A84FF',
  '#30D158',
  '#BF5AF2',
  '#FF6482',
  '#64D2FF',
  '#FFD60A',
  '#FF7A5C',
  '#66D4CF',
  '#A2845E',
];

export const CATEGORY_COLOR_CHOICES = [
  '#FF453A',
  '#FF9F0A',
  '#FFD60A',
  '#30D158',
  '#66D4CF',
  '#64D2FF',
  '#0A84FF',
  '#5E5CE6',
  '#BF5AF2',
  '#FF6482',
  '#A2845E',
  '#98989D',
];

function hashColor(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function colorFromEmoji(emoji: string): string {
  if (!emoji) return FALLBACK_PALETTE[0];
  try {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return hashColor(emoji);
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${size - 12}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 4);

    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 60) continue;
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      // Ponderar píxeles saturados: son los que definen el "color" del emoji.
      const sat = max === 0 ? 0 : (max - min) / max;
      const w = (alpha / 255) * (0.15 + sat * sat);
      r += pr * w;
      g += pg * w;
      b += pb * w;
      weight += w;
    }
    if (weight < 8) return hashColor(emoji);

    const [h, s] = rgbToHsl(r / weight, g / weight, b / weight);
    // Normalizar a un tono vibrante y legible sobre fondo oscuro.
    const sat = Math.min(0.85, Math.max(0.45, s * 1.25));
    return hslToHex(h, sat, 0.6);
  } catch {
    return hashColor(emoji);
  }
}

/** Primer grafema de un texto (para inputs de emoji con teclado nativo). */
export function firstGrapheme(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  try {
    const AnyIntl = Intl as unknown as {
      Segmenter?: new (
        locale: string,
        opts: { granularity: string },
      ) => { segment: (t: string) => Iterable<{ segment: string }> };
    };
    if (!AnyIntl.Segmenter) return Array.from(trimmed)[0] ?? '';
    const seg = new AnyIntl.Segmenter('es', { granularity: 'grapheme' });
    const first = seg.segment(trimmed)[Symbol.iterator]().next();
    return first.done ? '' : first.value.segment;
  } catch {
    return Array.from(trimmed)[0] ?? '';
  }
}
