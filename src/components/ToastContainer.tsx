import { useToast } from '@/hooks/useToast';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-success-600" />,
    error: <XCircle className="w-5 h-5 text-error-600" />,
    info: <Info className="w-5 h-5 text-secondary-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-600" />,
  };

  const bgColors = {
    success: 'bg-success-50 border-success-200',
    error: 'bg-error-50 border-error-200',
    info: 'bg-secondary-50 border-secondary-200',
    warning: 'bg-warning-50 border-warning-200',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-md animate-slide-in ${bgColors[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm text-neutral-800 flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
