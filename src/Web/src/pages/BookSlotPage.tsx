import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { BookingSteps } from '../components/BookingSteps';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '../components/Icons';
import { ServiceSummary } from '../components/ServiceSummary';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { useAsync } from '../hooks/useAsync';
import { addDays, formatLongDate, isValidIsoDate, todayIso } from '../lib/format';

export function BookSlotPage() {
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = Number(serviceIdParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const today = todayIso();
  const dateParam = searchParams.get('date');
  const date = isValidIsoDate(dateParam) && dateParam >= today ? dateParam : today;

  // Normaliza la URL si la fecha es inválida o pasada.
  useEffect(() => {
    if (dateParam !== date) {
      setSearchParams({ date }, { replace: true });
    }
  }, [date, dateParam, setSearchParams]);

  const setDate = (value: string) => {
    if (isValidIsoDate(value)) setSearchParams({ date: value < today ? today : value }, { replace: true });
  };

  const services = useAsync(
    async (signal) => {
      if (!Number.isInteger(serviceId) || serviceId <= 0) throw new ApiError(404, 'Servicio no encontrado.');
      const list = await api.getServices(signal);
      const found = list.find((s) => s.id === serviceId);
      if (!found) throw new ApiError(404, 'El servicio no existe o ya no está disponible.');
      return found;
    },
    [serviceId],
  );

  const availability = useAsync(
    (signal) => (services.data ? api.getAvailability(serviceId, date, signal) : Promise.resolve(undefined)),
    [serviceId, date, services.data],
  );

  if (services.loading && !services.data) return <LoadingState label="Cargando servicio…" />;

  if (services.error || !services.data) {
    return (
      <ErrorState
        title="No pudimos cargar el servicio"
        message={services.error ?? 'Servicio no encontrado.'}
        onRetry={services.reload}
      />
    );
  }

  const service = services.data;
  const slots = availability.data?.slots ?? [];
  const dayStatus = availability.data?.dayStatus;
  const nextDayButton = (
    <button
      type="button"
      onClick={() => setDate(addDays(date, 1))}
      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      Ver día siguiente <ChevronRightIcon className="h-4 w-4" />
    </button>
  );

  return (
    <section>
      <BookingSteps current={2} />

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Elige fecha y horario</h1>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Cambiar servicio
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <ServiceSummary service={service} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="date" className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarIcon className="h-4 w-4" /> Fecha
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(addDays(date, -1))}
                disabled={date <= today}
                aria-label="Día anterior"
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <input
                id="date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setDate(addDays(date, 1))}
                aria-label="Día siguiente"
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">{formatLongDate(date)}</p>
          </div>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <ClockIcon className="h-5 w-5 text-indigo-600" /> Horarios disponibles
          </h2>
          <p className="mt-1 text-sm text-slate-500">{formatLongDate(date)}</p>

          <div className="mt-5">
            {availability.error ? (
              <ErrorState title="No pudimos consultar la disponibilidad" message={availability.error} onRetry={availability.reload} />
            ) : availability.loading || !availability.data ? (
              <LoadingState label="Buscando horarios disponibles…" />
            ) : dayStatus === 'Closed' ? (
              <EmptyState
                icon={<CalendarIcon className="h-10 w-10" />}
                title="El negocio está cerrado este día"
                description="Selecciona otra fecha para ver los horarios disponibles."
                action={nextDayButton}
              />
            ) : dayStatus === 'Past' ? (
              <EmptyState
                title="Esta fecha ya pasó"
                description="Selecciona una fecha a partir de hoy."
                action={
                  <button
                    type="button"
                    onClick={() => setDate(today)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Ir a hoy
                  </button>
                }
              />
            ) : slots.length === 0 ? (
              <EmptyState
                icon={<ClockIcon className="h-10 w-10" />}
                title="No hay horarios disponibles"
                description="Todos los horarios de este día están ocupados o ya pasaron. Prueba con otra fecha."
                action={nextDayButton}
              />
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {slots.map((slot) => (
                    <li key={slot.startAt}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/book/${service.id}/details?${new URLSearchParams({ date, startAt: slot.startAt })}`,
                          )
                        }
                        className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-3 text-center transition hover:border-indigo-500 hover:bg-indigo-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      >
                        <span className="block text-base font-semibold">{slot.startTime}</span>
                        <span className="block text-xs opacity-75">hasta {slot.endTime}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-500">
                  {slots.length} {slots.length === 1 ? 'horario disponible' : 'horarios disponibles'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
