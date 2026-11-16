import type { ReactNode } from 'react';
import type { Service } from '../api/types';
import { formatDuration, formatPrice } from '../lib/format';
import { ClockIcon, ScissorsIcon } from './Icons';

export function ServiceSummary({ service, children }: { service: Service; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ScissorsIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Servicio seleccionado</p>
          <h2 className="truncate text-lg font-semibold text-slate-900">{service.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-4 w-4" /> {formatDuration(service.durationMinutes)}
            </span>
            <span className="font-medium text-slate-900">{formatPrice(service.price)}</span>
          </div>
        </div>
      </div>
      {children && <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}
