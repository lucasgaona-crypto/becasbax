import { CheckCircle2, X, XCircle } from 'lucide-react';

export interface FeedbackState {
  ok: boolean;
  httpStatus: number;
  rule: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface FeedbackBannerProps {
  feedback: FeedbackState | null;
  onDismiss: () => void;
}

export function FeedbackBanner({ feedback, onDismiss }: FeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border rounded-lg px-4 py-3 flex items-start justify-between gap-4 transition-opacity duration-150 ${
        feedback.ok
          ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
          : 'bg-red-50/70 border-red-200 text-slate-900'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {feedback.ok ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <XCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
            <span className={`font-semibold ${feedback.ok ? 'text-emerald-800' : 'text-red-800'}`}>
              {feedback.ok ? 'Operación aceptada' : 'Operación rechazada'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">{feedback.rule}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">HTTP {feedback.httpStatus}</span>
          </div>
          <p className="text-sm text-slate-900 mt-1">{feedback.message}</p>
          {feedback.details && (
            <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">{feedback.details}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-white/70 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
