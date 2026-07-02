import { animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { memo, useEffect, useRef } from 'react';

interface AnimatedAmountProps {
  value: number;
  format: (v: number) => string;
  className?: string;
}

/**
 * Número que anima su valor con un spring (contador animado) y hace un
 * pequeño pulso de escala en cada cambio. El texto se escribe directamente
 * en el DOM (sin pasar por estado de React) para no re-renderizar en cada
 * frame del spring — así la animación se mantiene a 60fps.
 */
export const AnimatedAmount = memo(function AnimatedAmount({
  value,
  format,
  className,
}: AnimatedAmountProps) {
  const mv = useMotionValue(value);
  const scale = useMotionValue(1);
  const spanRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useMotionValueEvent(mv, 'change', (v) => {
    if (spanRef.current) spanRef.current.textContent = format(v);
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      mv.set(value);
      if (spanRef.current) spanRef.current.textContent = format(value);
      return;
    }
    const valueControls = animate(mv, value, {
      type: 'spring',
      damping: 34,
      stiffness: 180,
      mass: 1,
    });
    scale.set(0.96);
    const scaleControls = animate(scale, 1, { type: 'spring', damping: 14, stiffness: 260 });
    return () => {
      valueControls.stop();
      scaleControls.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <motion.span
      ref={spanRef}
      className={className}
      style={{ display: 'inline-block', scale }}
    />
  );
});
