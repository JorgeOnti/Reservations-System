import type { ReactNode } from 'react';
import { AlertIcon, CheckCircleIcon, RefreshIcon } from './Icons';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner className="h-8 w-8 text-indigo-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <AlertIcon className="mx-auto h-10 w-10 text-rose-500" />
      <h3 className="mt-3 font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <RefreshIcon className="h-4 w-4" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex justify-center text-slate-400">{icon}</div>}
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

const ALERT_STYLES: Record<AlertVariant, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const Icon = variant === 'success' ? CheckCircleIcon : AlertIcon;
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 ${ALERT_STYLES[variant]}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-m-1 h-6 w-6 shrink-0 rounded text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
