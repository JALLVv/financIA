import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon } from '@/components/ui/Icon';
import { haptics } from '@/services/haptics';

export interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface FilterDropdownProps<T extends string> {
  triggerLabel: ReactNode;
  active: boolean;
  isOpen: boolean;
  onToggle: () => void;
  options: DropdownOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

/**
 * Chip que despliega una lista real de opciones para elegir (no cicla al
 * tocar). El panel se renderiza vía portal en `document.body` con
 * `position: fixed`, porque el chip vive dentro de un contenedor con scroll
 * horizontal (`.filter-chips`) — al fijar `overflow-x`, CSS obliga a
 * `overflow-y` a pasar de `visible` a `auto` también, así que un panel
 * `position: absolute` normal quedaría recortado por ese contenedor.
 */
export function FilterDropdown<T extends string>({
  triggerLabel,
  active,
  isOpen,
  onToggle,
  options,
  value,
  onSelect,
}: FilterDropdownProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  return (
    <div className="filter-dropdown">
      <button
        ref={triggerRef}
        className={`filter-chip ${active ? 'active' : ''}`}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {triggerLabel}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          style={{ display: 'inline-flex' }}
        >
          <ChevronDownIcon size={12} />
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {isOpen && coords && (
            <motion.div
              className="filter-dropdown-panel"
              role="listbox"
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-dropdown-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => {
                    haptics.light();
                    onSelect(opt.value);
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && (
                    <span className="opt-check">
                      <CheckIcon size={14} />
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
