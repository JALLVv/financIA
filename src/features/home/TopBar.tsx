import { motion } from 'framer-motion';
import { ChevronDownIcon, PersonIcon, SearchIcon } from '@/components/ui/Icon';
import { haptics } from '@/services/haptics';
import { useActiveList } from '@/hooks/useDerivedData';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/useUiStore';

export function TopBar() {
  const activeList = useActiveList();
  const profile = useFinanceStore((s) => s.profile);
  const setListPickerOpen = useUiStore((s) => s.setListPickerOpen);
  const listPickerOpen = useUiStore((s) => s.listPickerOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);

  return (
    <header className="topbar">
      <button
        className="list-pill glass"
        aria-label="Cambiar lista"
        onClick={() => {
          haptics.light();
          setListPickerOpen(true);
        }}
      >
        <motion.span
          key={activeList?.id}
          className="list-pill-name"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        >
          {activeList?.name}
        </motion.span>
        <span className="chev" style={{ transform: listPickerOpen ? 'rotate(180deg)' : undefined }}>
          <ChevronDownIcon size={14} />
        </span>
      </button>

      <div className="topbar-actions">
        <button
          className="icon-btn"
          aria-label="Buscar"
          onClick={() => {
            haptics.light();
            setSearchOpen(true);
          }}
        >
          <SearchIcon size={19} />
        </button>
        <button
          className="icon-btn"
          aria-label="Perfil"
          onClick={() => {
            haptics.light();
            setProfileOpen(true);
          }}
          style={profile.photo ? { padding: 0, overflow: 'hidden' } : undefined}
        >
          {profile.photo ? (
            <img className="profile-avatar" src={profile.photo} alt="Perfil" />
          ) : (
            <PersonIcon size={19} />
          )}
        </button>
      </div>
    </header>
  );
}
