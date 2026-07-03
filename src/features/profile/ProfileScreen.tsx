import { useRef, useState } from 'react';
import { CameraIcon, ChevronRightIcon, ListIcon, PersonIcon, RepeatIcon, TagIcon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { haptics } from '@/services/haptics';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';
import { CategoriesManageSheet } from './CategoriesManageSheet';
import { ListsManageSheet } from './ListsManageSheet';
import { RecurringManageSheet } from './RecurringManageSheet';
import './profile.css';

/** Redimensiona una imagen a un cuadrado pequeño y devuelve data URL. */
async function resizeImage(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const min = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type ManageSection = 'lists' | 'categories' | 'recurring' | null;

/**
 * Pantalla de perfil: solo un menú de accesos (Listas / Categorías /
 * Recurrentes). Cada opción abre su propio sheet de gestión — nada de
 * ajustes se muestra directamente aquí.
 */
export function ProfileScreen() {
  const open = useUiStore((s) => s.profileOpen);
  const setOpen = useUiStore((s) => s.setProfileOpen);

  const profile = useFinanceStore((s) => s.profile);
  const setProfile = useFinanceStore((s) => s.setProfile);
  const lists = useFinanceStore((s) => s.lists);
  const categories = useFinanceStore((s) => s.categories);
  const recurring = useFinanceStore((s) => s.recurring);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [section, setSection] = useState<ManageSection>(null);

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setProfile({ photo: dataUrl });
      haptics.success();
    } catch {
      /* imagen inválida: ignorar */
    }
  };

  const openSection = (s: ManageSection) => {
    haptics.light();
    setSection(s);
  };

  return (
    <>
      <Sheet open={open} onClose={() => setOpen(false)} title="Perfil" full z={80}>
        <div className="profile-head">
          <button
            className="profile-photo-wrap"
            aria-label="Cambiar foto de perfil"
            onClick={() => fileRef.current?.click()}
          >
            {profile.photo ? (
              <img className="profile-photo" src={profile.photo} alt="Foto de perfil" />
            ) : (
              <span className="profile-photo-placeholder">
                <PersonIcon size={40} strokeWidth={1.6} />
              </span>
            )}
            <span className="profile-photo-edit">
              <CameraIcon size={15} />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhotoChange(e.target.files?.[0])}
          />
          <input
            className="profile-name-input"
            type="text"
            placeholder="Tu nombre"
            value={profile.name}
            maxLength={40}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <button className="profile-menu-row" onClick={() => openSection('lists')}>
            <span className="menu-icon">
              <ListIcon size={17} />
            </span>
            <span className="menu-title">Listas</span>
            <span className="menu-count">{lists.length}</span>
            <span className="menu-chevron">
              <ChevronRightIcon size={16} />
            </span>
          </button>
          <button className="profile-menu-row" onClick={() => openSection('categories')}>
            <span className="menu-icon">
              <TagIcon size={17} />
            </span>
            <span className="menu-title">Categorías</span>
            <span className="menu-count">{categories.length}</span>
            <span className="menu-chevron">
              <ChevronRightIcon size={16} />
            </span>
          </button>
          <button className="profile-menu-row" onClick={() => openSection('recurring')}>
            <span className="menu-icon">
              <RepeatIcon size={17} />
            </span>
            <span className="menu-title">Transacciones recurrentes</span>
            <span className="menu-count">{recurring.length}</span>
            <span className="menu-chevron">
              <ChevronRightIcon size={16} />
            </span>
          </button>
        </div>
      </Sheet>

      <ListsManageSheet open={section === 'lists'} onClose={() => setSection(null)} />
      <CategoriesManageSheet open={section === 'categories'} onClose={() => setSection(null)} />
      <RecurringManageSheet open={section === 'recurring'} onClose={() => setSection(null)} />
    </>
  );
}
