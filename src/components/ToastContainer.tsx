'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const borderColors = {
  error: 'border-red-500/50',
  success: 'border-green-500/50',
  info: 'border-amber/50',
};

const iconColors = {
  error: 'text-red-400',
  success: 'text-green-400',
  info: 'text-amber',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`bg-bg-card border ${borderColors[toast.type]} rounded-lg p-3 shadow-lg max-w-80 flex items-start gap-2`}
    >
      <span className={`text-sm ${iconColors[toast.type]} shrink-0 mt-0.5`}>
        {toast.type === 'error' ? '!' : toast.type === 'success' ? '\u2713' : '\u2139'}
      </span>
      <p className="text-xs text-text flex-1">{toast.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="text-muted hover:text-text text-xs shrink-0">&times;</button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
