import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 240 }}
    >
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-sub">{subtitle}</div>}
    </motion.div>
  );
}
