import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ClockIcon, ScissorsIcon } from '../components/Icons';
import { EmptyState, ErrorState } from '../components/StatusViews';
import { BookingSteps } from '../components/BookingSteps';
import { useAsync } from '../hooks/useAsync';
import { formatDuration, formatPrice } from '../lib/format';

export function ServicesPage() {
  const { data: services, error, loading, reload } = useAsync((signal) => api.getServices(signal), []);

  return (
    <section>
      <BookingSteps current={1} />

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reserva tu cita</h1>
        <p className="mt-2 text-slate-600">Elige el servicio que necesitas y encuentra el horario que mejor te acomode.</p>
      </header>

      {loading && !services ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Cargando servicios">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="mt-4 h-5 w-2/3 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState title="No pudimos cargar los servicios" message={error} onRetry={reload} />
      ) : !services || services.length === 0 ? (
        <EmptyState
          icon={<ScissorsIcon className="h-10 w-10" />}
          title="No hay servicios disponibles"
          description="El negocio aún no ha publicado servicios. Vuelve a intentarlo más tarde."
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ScissorsIcon />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{service.name}</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
                <ClockIcon className="h-4 w-4" />
                {service.durationMinutes} minutos ({formatDuration(service.durationMinutes)})
              </p>
              <div className="mt-6 flex items-end justify-between gap-4">
                <p className="text-2xl font-bold text-slate-900">{formatPrice(service.price)}</p>
                <Link
                  to={`/book/${service.id}`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  aria-label={`Seleccionar ${service.name}`}
                >
                  Seleccionar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
