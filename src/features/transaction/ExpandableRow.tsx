import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon } from '@/components/ui/Icon';
import { haptics } from '@/services/haptics';

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface ExpandableRowProps<T extends string> {
  label: string;
  icon?: ReactNode;
  valueLabel: ReactNode;
  options: Option<T>[];
  selected: T;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}

/** Fila de formulario que se expande para elegir una opción (estilo iOS inline picker). */
export function ExpandableRow<T extends string>({
  label,
  icon,
  valueLabel,
  options,
  selected,
  expanded,
  onToggle,
  onSelect,
}: ExpandableRowProps<T>) {
  return (
    <>
      <button
        type="button"
        className="form-row"
        aria-expanded={expanded}
        onClick={() => {
          haptics.light();
          onToggle();
        }}
      >
        {icon}
        <span className="row-label">{label}</span>
        <span className="row-value" style={expanded ? { color: 'var(--accent)' } : undefined}>
          {valueLabel}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{ display: 'inline-flex' }}
          >
            <ChevronDownIcon size={13} />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="expand-options"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`expand-option ${opt.value === selected ? 'selected' : ''}`}
                onClick={() => {
                  haptics.light();
                  onSelect(opt.value);
                }}
              >
                <span>{opt.label}</span>
                {opt.value === selected && (
                  <span className="opt-check">
                    <CheckIcon size={15} />
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
