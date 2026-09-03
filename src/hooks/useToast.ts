import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastCallback: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function toast(type: ToastType, message: string) {
  if (toastCallback) {
    toastCallback({ type, message });
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  // Register the callback for external toast() calls
  if (!toastCallback) {
    toastCallback = addToast;
  }

  return { toasts, removeToast };
}
