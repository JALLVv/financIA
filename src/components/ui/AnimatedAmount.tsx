import { animate, motion, useMotionValue } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

interface AnimatedAmountProps {
  value: number;
  format: (v: number) => string;
  className?: string;
}

/**
 * Número que anima su valor con un spring (contador animado) y hace un
 * pequeño pulso de escala en cada cambio.
 */
export const AnimatedAmount = memo(function AnimatedAmount({
  value,
  format,
  className,
}: AnimatedAmountProps) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const first = useRef(true);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      mv.set(value);
      setDisplay(value);
      return;
    }
    setPulseKey((k) => k + 1);
    const controls = animate(mv, value, {
      type: 'spring',
      damping: 34,
      stiffness: 180,
      mass: 1,
    });
    return () => controls.stop();
  }, [value, mv]);

  useEffect(() => mv.on('change', (v) => setDisplay(v)), [mv]);

  return (
    <motion.span
      key={pulseKey}
      className={className}
      initial={pulseKey === 0 ? false : { scale: 0.96 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 260 }}
      style={{ display: 'inline-block' }}
    >
      {format(display)}
    </motion.span>
  );
});
