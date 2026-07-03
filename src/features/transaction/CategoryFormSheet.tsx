import { useEffect, useMemo, useState } from 'react';
import { PlusIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import type { Category } from '@/models/types';
import { CATEGORY_COLOR_CHOICES, colorFromEmoji, firstGrapheme } from '@/services/emojiColor';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';

interface CategoryFormSheetProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  /** Si se pasa, edita en lugar de crear. */
  editing?: Category | null;
  onSaved?: (category: Category) => void;
  z?: number;
}

/**
 * Crear / editar categoría: emoji con teclado nativo, color generado
 * automáticamente a partir del emoji (modificable con los swatches).
 */
export function CategoryFormSheet({
  open,
  onClose,
  listId,
  editing,
  onSaved,
  z = 130,
}: CategoryFormSheetProps) {
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_CHOICES[1]);
  const [colorOverridden, setColorOverridden] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setEmoji(editing.emoji);
      setColor(editing.color);
      setColorOverridden(true);
    } else {
      setName('');
      setEmoji('');
      setColor(CATEGORY_COLOR_CHOICES[1]);
      setColorOverridden(false);
    }
  }, [open, editing]);

  // Color automático inspirado en el emoji (mientras el usuario no lo cambie).
  useEffect(() => {
    if (!emoji || colorOverridden) return;
    setColor(colorFromEmoji(emoji));
  }, [emoji, colorOverridden]);

  const valid = useMemo(() => name.trim().length > 0 && emoji.length > 0, [name, emoji]);

  const save = () => {
    if (!valid) return;
    haptics.success();
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), emoji, color });
      onSaved?.({ ...editing, name: name.trim(), emoji, color });
    } else {
      const cat = addCategory({ listId, name: name.trim(), emoji, color });
      onSaved?.(cat);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Editar categoría' : 'Nueva categoría'}
      z={z}
      headerAction={
        <button className="btn-plain" disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }} onClick={save}>
          OK
        </button>
      }
    >
      <div className="cat-form">
        <div className="cat-form-preview">
          <div
            className="preview-circle"
            style={{
              background: `${color}30`,
              boxShadow: emoji ? `0 0 28px ${color}44` : undefined,
            }}
          >
            <input
              type="text"
              inputMode="text"
              aria-label="Emoji de la categoría"
              value={emoji}
              onChange={(e) => setEmoji(firstGrapheme(e.target.value))}
            />
            {!emoji && (
              <span className="preview-circle-plus" aria-hidden>
                <PlusIcon size={28} strokeWidth={1.8} />
              </span>
            )}
          </div>
          <span className="preview-hint">
            {emoji ? 'Color generado del emoji' : 'Toca el círculo y elige un emoji'}
          </span>
        </div>

        <div className="form-group">
          <div className="form-row">
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="section-title">Color</div>
          <div className="color-swatches">
            {CATEGORY_COLOR_CHOICES.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={`Color ${c}`}
                className={`color-swatch ${c.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  haptics.light();
                  setColor(c);
                  setColorOverridden(true);
                }}
              />
            ))}
          </div>
        </div>

        <button className="btn-primary" disabled={!valid} onClick={save}>
          {editing ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
    </Sheet>
  );
}
