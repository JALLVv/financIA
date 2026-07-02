import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { haptics } from '@/services/haptics';
import './SegmentedControl.css';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Alto del control (por defecto compacto estilo iOS). */
  size?: 'regular' | 'large';
}

/** Control segmentado estilo iOS con "pastilla" deslizante animada. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'regular',
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    segments.findIndex((s) => s.value === value),
  );

  return (
    <div className={`segmented ${size === 'large' ? 'segmented-large' : ''}`} role="tablist">
      <motion.div
        className="segment-pill"
        style={{ width: `calc((100% - 4px) / ${segments.length})` }}
        initial={false}
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      />
      {segments.map((seg) => {
        const selected = seg.value === value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={selected}
            className={`segment ${selected ? 'segment-selected' : ''}`}
            onClick={() => {
              if (!selected) {
                haptics.light();
                onChange(seg.value);
              }
            }}
          >
            <span className="segment-label">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
