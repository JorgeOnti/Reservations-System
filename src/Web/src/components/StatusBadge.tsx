import type { BookingStatus } from '../api/types';

export function StatusBadge({ status }: { status: BookingStatus }) {
  const confirmed = status === 'Confirmed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        confirmed
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${confirmed ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {confirmed ? 'Confirmada' : 'Cancelada'}
    </span>
  );
}
