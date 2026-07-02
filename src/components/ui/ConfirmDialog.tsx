import { AnimatePresence, motion } from 'framer-motion';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Alerta estilo iOS para acciones destructivas. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="alert-backdrop"
          className="alert-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        />
      )}
      {open && (
        <motion.div
          key="alert-card"
          className="alert-card glass"
          role="alertdialog"
          aria-label={title}
          style={{ x: '-50%', y: '-50%' }}
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 24, stiffness: 380 }}
        >
          <div className="alert-body">
            <div className="alert-title">{title}</div>
            {message && <div className="alert-message">{message}</div>}
          </div>
          <div className="alert-actions">
            <button className="alert-btn" onClick={onCancel}>
              Cancelar
            </button>
            <button className="alert-btn destructive" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
