import { AlertTriangle } from 'lucide-react';

interface RedFlagAlertProps {
  description?: string;
  onClose?: () => void;
}

export function RedFlagAlert({ description, onClose }: RedFlagAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-error-600 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">PRIORITY ALERT</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-lg text-neutral-800 mb-2">
            Your symptoms may require immediate medical attention.
          </p>
          <p className="text-base text-neutral-600 mb-6">
            Please alert hospital staff immediately.
          </p>
          {description && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-error-700">{description}</p>
            </div>
          )}
          <p className="text-xs text-neutral-500 mb-4">
            This is a triage alert, not a diagnosis. A healthcare professional will evaluate you.
          </p>
          <button
            onClick={onClose}
            className="btn-primary-lg w-full"
          >
            I Understand — Alert Staff
          </button>
        </div>
      </div>
    </div>
  );
}
