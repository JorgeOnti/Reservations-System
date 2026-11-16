import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, getErrorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Booking } from '../api/types';
import { BookingSteps } from '../components/BookingSteps';
import { CalendarIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';
import { ServiceSummary } from '../components/ServiceSummary';
import { Alert, ErrorState, LoadingState, Spinner } from '../components/StatusViews';
import { useAsync } from '../hooks/useAsync';
import { formatDuration, formatLongDate, formatPrice, isValidIsoDate } from '../lib/format';
import { validateCustomer, type CustomerForm, type CustomerFormErrors } from '../lib/validation';

const EMPTY_FORM: CustomerForm = { customerName: '', customerEmail: '', customerPhone: '' };

export function BookDetailsPage() {
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = Number(serviceIdParam);
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date');
  const startAt = searchParams.get('startAt');
  const startMs = startAt ? Date.parse(startAt) : NaN;

  const [booking, setBooking] = useState<Booking | null>(null);

  const context = useAsync(
    async (signal) => {
      if (!isValidIsoDate(date) || Number.isNaN(startMs)) return null;
      const [services, availability] = await Promise.all([
        api.getServices(signal),
        api.getAvailability(serviceId, date, signal),
      ]);
      const service = services.find((s) => s.id === serviceId);
      if (!service) throw new ApiError(404, 'El servicio no existe o ya no está disponible.');
      const slot = availability.slots.find((s) => Date.parse(s.startAt) === startMs) ?? null;
      return { service, slot };
    },
    [serviceId, date, startMs],
  );

  if (!isValidIsoDate(date) || Number.isNaN(startMs)) {
    return <Navigate to={`/book/${serviceIdParam ?? ''}`} replace />;
  }

  const backToSlots = `/book/${serviceId}?date=${date}`;

  if (booking) {
    return <ConfirmationCard booking={booking} />;
  }

  if (context.loading && !context.data) return <LoadingState label="Preparando tu reserva…" />;

  if (context.error || !context.data) {
    return (
      <ErrorState
        title="No pudimos preparar tu reserva"
        message={context.error ?? 'Información de reserva incompleta.'}
        onRetry={context.reload}
      />
    );
  }

  const { service, slot } = context.data;

  return (
    <section>
      <BookingSteps current={3} />

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Completa tus datos</h1>
        <Link to={backToSlots} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Cambiar horario
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside>
          <ServiceSummary service={service}>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarIcon className="h-4 w-4 text-slate-400" />
                <dt className="sr-only">Fecha</dt>
                <dd>{formatLongDate(date)}</dd>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <ClockIcon className="h-4 w-4 text-slate-400" />
                <dt className="sr-only">Horario</dt>
                <dd>{slot ? slot.label : 'Horario no disponible'}</dd>
              </div>
            </dl>
          </ServiceSummary>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {slot ? (
            <CustomerFormCard
              onSubmit={(form) =>
                api.createBooking({
                  serviceId: service.id,
                  startAt: slot.startAt,
                  customerName: form.customerName.trim(),
                  customerEmail: form.customerEmail.trim(),
                  customerPhone: form.customerPhone.trim(),
                })
              }
              onSuccess={setBooking}
              backToSlots={backToSlots}
            />
          ) : (
            <Alert variant="warning" title="Este horario ya no está disponible">
              <p>Es posible que alguien más lo haya reservado o que ya haya pasado.</p>
              <Link to={backToSlots} className="mt-3 inline-block font-semibold underline">
                Elegir otro horario
              </Link>
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
}

function CustomerFormCard({
  onSubmit,
  onSuccess,
  backToSlots,
}: {
  onSubmit: (form: CustomerForm) => Promise<Booking>;
  onSuccess: (booking: Booking) => void;
  backToSlots: string;
}) {
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CustomerForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ conflict: boolean; message: string } | null>(null);

  const update = (field: keyof CustomerForm, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setErrors(validateCustomer(next));
  };

  const blur = (field: keyof CustomerForm) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validateCustomer(form));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateCustomer(form);
    setErrors(validation);
    setTouched({ customerName: true, customerEmail: true, customerPhone: true });
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      onSuccess(await onSubmit(form));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError({ conflict: true, message: error.message });
      } else {
        if (error instanceof ApiError && error.fieldErrors) {
          const serverErrors: CustomerFormErrors = {};
          for (const key of Object.keys(EMPTY_FORM) as (keyof CustomerForm)[]) {
            const messages = error.fieldErrors[key];
            if (messages?.length) serverErrors[key] = messages[0];
          }
          setErrors(serverErrors);
        }
        setSubmitError({ conflict: false, message: getErrorMessage(error) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="font-semibold text-slate-900">Datos de contacto</h2>
        <p className="mt-1 text-sm text-slate-500">Te enviaremos la confirmación y el enlace de cancelación por correo.</p>
      </div>

      {submitError &&
        (submitError.conflict ? (
          <Alert variant="warning" title="Ese horario acaba de ser reservado">
            <p>{submitError.message}</p>
            <Link to={backToSlots} className="mt-3 inline-block font-semibold underline">
              Elegir otro horario
            </Link>
          </Alert>
        ) : (
          <Alert variant="error" title="No se pudo completar la reserva" onClose={() => setSubmitError(null)}>
            {submitError.message}
          </Alert>
        ))}

      <Field
        id="customerName"
        label="Nombre completo"
        autoComplete="name"
        value={form.customerName}
        error={touched.customerName ? errors.customerName : undefined}
        onChange={(v) => update('customerName', v)}
        onBlur={() => blur('customerName')}
        placeholder="Ej. Ana López García"
      />
      <Field
        id="customerEmail"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        value={form.customerEmail}
        error={touched.customerEmail ? errors.customerEmail : undefined}
        onChange={(v) => update('customerEmail', v)}
        onBlur={() => blur('customerEmail')}
        placeholder="tu@correo.com"
      />
      <Field
        id="customerPhone"
        label="Teléfono"
        type="tel"
        autoComplete="tel"
        value={form.customerPhone}
        error={touched.customerPhone ? errors.customerPhone : undefined}
        onChange={(v) => update('customerPhone', v)}
        onBlur={() => blur('customerPhone')}
        placeholder="Ej. 55 1234 5678"
      />

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting && <Spinner className="h-4 w-4" />}
        {submitting ? 'Confirmando reserva…' : 'Confirmar reserva'}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ConfirmationCard({ booking }: { booking: Booking }) {
  const cancelPath = `/cancel/${booking.id}?${new URLSearchParams({ token: booking.cancelToken })}`;
  const rows: [string, string][] = [
    ['Servicio', booking.serviceName],
    ['Fecha', formatLongDate(booking.localDate)],
    ['Horario', `${booking.localStartTime} - ${booking.localEndTime} (${formatDuration(booking.serviceDurationMinutes)})`],
    ['Precio', formatPrice(booking.servicePrice)],
    ['Nombre', booking.customerName],
    ['Correo', booking.customerEmail],
    ['Teléfono', booking.customerPhone],
    ['Folio', booking.id],
  ];

  return (
    <section className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-emerald-50 px-6 py-8 text-center">
          <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">¡Reserva confirmada!</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enviamos la confirmación a <strong>{booking.customerEmail}</strong>.
          </p>
        </div>

        <dl className="divide-y divide-slate-100 px-6">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className={`col-span-2 font-medium text-slate-900 ${label === 'Folio' ? 'break-all font-mono text-xs' : ''}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-6 py-5">
          <Alert variant="info" title="Enlace de cancelación (demo)">
            <p>
              Este es el mismo enlace que recibe el cliente por correo. Si la API no tiene SMTP configurado, también
              aparece en la consola de la API.
            </p>
            <Link to={cancelPath} className="mt-2 inline-block break-all font-semibold underline">
              {booking.cancelUrl}
            </Link>
          </Alert>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Hacer otra reserva
            </Link>
            <Link
              to={cancelPath}
              className="flex-1 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancelar esta reserva
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
