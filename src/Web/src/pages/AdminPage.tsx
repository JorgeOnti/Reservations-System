import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Booking } from '../api/types';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from '../components/Icons';
import { StatusBadge } from '../components/StatusBadge';
import { Alert, EmptyState, ErrorState, LoadingState, Spinner } from '../components/StatusViews';
import { useAsync } from '../hooks/useAsync';
import { addDays, formatLongDate, formatPrice, isValidIsoDate, todayIso } from '../lib/format';

type Notice = { variant: 'success' | 'error'; message: string } | null;

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayIso();
  const dateParam = searchParams.get('date');
  const date = isValidIsoDate(dateParam) ? dateParam : today;

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const { data, error, loading, reload } = useAsync(
    async (signal) => ({ date, bookings: await api.getBookings(date, signal) }),
    [date],
  );
  // Solo mostramos datos de la fecha seleccionada (evita ver la lista del día anterior mientras carga).
  const bookings = data?.date === date ? data.bookings : undefined;

  useEffect(() => setNotice(null), [date]);

  const setDate = (value: string) => {
    if (isValidIsoDate(value)) setSearchParams({ date: value }, { replace: true });
  };

  const cancelBooking = async (booking: Booking) => {
    const ok = window.confirm(
      `¿Cancelar la reserva de ${booking.customerName} (${booking.serviceName}) a las ${booking.localStartTime}?`,
    );
    if (!ok) return;

    setCancellingId(booking.id);
    setNotice(null);
    try {
      await api.cancelBooking(booking.id, booking.cancelToken);
      setNotice({
        variant: 'success',
        message: `Reserva de ${booking.customerName} a las ${booking.localStartTime} cancelada. El horario quedó disponible.`,
      });
      reload();
    } catch (err) {
      setNotice({ variant: 'error', message: getErrorMessage(err) });
    } finally {
      setCancellingId(null);
    }
  };

  const confirmed = bookings?.filter((b) => b.status === 'Confirmed') ?? [];
  const cancelled = bookings?.filter((b) => b.status === 'Cancelled') ?? [];
  const revenue = confirmed.reduce((sum, b) => sum + b.servicePrice, 0);

  return (
    <section>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Panel del Negocio</h1>
          <p className="mt-1 text-slate-600">{formatLongDate(date)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate(addDays(date, -1))}
            aria-label="Día anterior"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <label htmlFor="admin-date" className="sr-only">
            Fecha
          </label>
          <input
            id="admin-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="button"
            onClick={() => setDate(addDays(date, 1))}
            aria-label="Día siguiente"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          {date !== today && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hoy
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading ? <Spinner className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
            Actualizar
          </button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reservas del día" value={bookings ? String(bookings.length) : '—'} />
        <Stat label="Confirmadas" value={bookings ? String(confirmed.length) : '—'} accent="text-emerald-600" />
        <Stat label="Canceladas" value={bookings ? String(cancelled.length) : '—'} accent="text-slate-500" />
        <Stat label="Ingresos estimados" value={bookings ? formatPrice(revenue) : '—'} accent="text-indigo-600" />
      </div>

      {notice && (
        <div className="mb-4">
          <Alert variant={notice.variant} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        </div>
      )}

      {error ? (
        <ErrorState title="No pudimos cargar las reservas" message={error} onRetry={reload} />
      ) : !bookings ? (
        <LoadingState label="Cargando reservas…" />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-10 w-10" />}
          title="No hay reservas para este día"
          description="Cuando los clientes reserven, sus citas aparecerán aquí."
        />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Tabla (pantallas medianas en adelante) */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Horario</th>
                  <th scope="col" className="px-4 py-3">Servicio</th>
                  <th scope="col" className="px-4 py-3">Cliente</th>
                  <th scope="col" className="px-4 py-3">Contacto</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className={b.status === 'Cancelled' ? 'bg-slate-50/60 text-slate-400' : ''}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                      {b.localStartTime} – {b.localEndTime}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{b.serviceName}</div>
                      <div className="text-xs text-slate-500">{formatPrice(b.servicePrice)}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.customerName}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${b.customerEmail}`} className="block text-indigo-600 hover:underline">
                        {b.customerEmail}
                      </a>
                      <a href={`tel:${b.customerPhone}`} className="block text-xs text-slate-500 hover:underline">
                        {b.customerPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === 'Confirmed' && (
                        <CancelButton busy={cancellingId === b.id} disabled={cancellingId !== null} onClick={() => cancelBooking(b)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (móvil) */}
          <ul className="space-y-3 md:hidden">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {b.localStartTime} – {b.localEndTime}
                    </p>
                    <p className="text-sm text-slate-600">{b.serviceName}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 space-y-0.5 text-sm">
                  <p className="font-medium text-slate-800">{b.customerName}</p>
                  <a href={`mailto:${b.customerEmail}`} className="block text-indigo-600">
                    {b.customerEmail}
                  </a>
                  <a href={`tel:${b.customerPhone}`} className="block text-slate-500">
                    {b.customerPhone}
                  </a>
                </div>
                {b.status === 'Confirmed' && (
                  <div className="mt-4">
                    <CancelButton
                      busy={cancellingId === b.id}
                      disabled={cancellingId !== null}
                      onClick={() => cancelBooking(b)}
                      fullWidth
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent = 'text-slate-900' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function CancelButton({
  busy,
  disabled,
  onClick,
  fullWidth = false,
}: {
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {busy && <Spinner className="h-4 w-4" />}
      {busy ? 'Cancelando…' : 'Cancelar reserva'}
    </button>
  );
}
