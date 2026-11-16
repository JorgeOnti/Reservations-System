import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, getErrorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Booking } from '../api/types';
import { AlertIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';
import { Alert, Spinner } from '../components/StatusViews';
import { formatLongDate } from '../lib/format';

type CancelState =
  | { step: 'confirm' }
  | { step: 'cancelling' }
  | { step: 'done'; booking: Booking }
  | { step: 'error'; status: number; message: string };

export function CancelPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<CancelState>({ step: 'confirm' });

  const cancel = async () => {
    setState({ step: 'cancelling' });
    try {
      const booking = await api.cancelBooking(id, token);
      setState({ step: 'done', booking });
    } catch (error) {
      setState({
        step: 'error',
        status: error instanceof ApiError ? error.status : 0,
        message: getErrorMessage(error),
      });
    }
  };

  return (
    <section className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!token ? (
          <Result
            icon={<AlertIcon className="h-14 w-14 text-amber-500" />}
            title="Enlace de cancelación incompleto"
            description="El enlace no contiene el token de cancelación. Usa el enlace completo que recibiste por correo."
          />
        ) : state.step === 'done' ? (
          <Result
            icon={<CheckCircleIcon className="h-14 w-14 text-emerald-500" />}
            title="Reserva cancelada"
            description={
              <>
                Tu reserva de <strong>{state.booking.serviceName}</strong> del{' '}
                <strong>{formatLongDate(state.booking.localDate)}</strong> a las{' '}
                <strong>{state.booking.localStartTime}</strong> fue cancelada. El horario quedó liberado y ya está
                disponible para otros clientes.
              </>
            }
          >
            <Link
              to={`/book/${state.booking.serviceId}?date=${state.booking.localDate}`}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Reservar otro horario
            </Link>
          </Result>
        ) : state.step === 'error' ? (
          <Result
            icon={
              state.status === 409 ? (
                <AlertIcon className="h-14 w-14 text-sky-500" />
              ) : (
                <XCircleIcon className="h-14 w-14 text-rose-500" />
              )
            }
            title={
              state.status === 409
                ? 'La reserva ya estaba cancelada'
                : state.status === 403
                  ? 'Enlace de cancelación no válido'
                  : state.status === 404
                    ? 'Reserva no encontrada'
                    : 'No se pudo cancelar la reserva'
            }
            description={state.message}
          >
            {state.status === 0 || state.status >= 500 ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Reintentar
              </button>
            ) : (
              <Link to="/" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Ir al inicio
              </Link>
            )}
          </Result>
        ) : (
          <div className="p-6 sm:p-8">
            <h1 className="text-xl font-bold text-slate-900">Cancelar reserva</h1>
            <p className="mt-2 text-sm text-slate-600">
              ¿Seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer y el horario quedará disponible
              para otras personas.
            </p>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Folio: <span className="break-all font-mono text-slate-700">{id}</span>
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                No, conservar mi reserva
              </Link>
              <button
                type="button"
                onClick={cancel}
                disabled={state.step === 'cancelling'}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70"
              >
                {state.step === 'cancelling' && <Spinner className="h-4 w-4" />}
                {state.step === 'cancelling' ? 'Cancelando…' : 'Sí, cancelar reserva'}
              </button>
            </div>
          </div>
        )}
      </div>
      {state.step === 'done' && (
        <div className="mt-4">
          <Alert variant="success">Recibirás un correo confirmando la cancelación.</Alert>
        </div>
      )}
    </section>
  );
}

function Result({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="p-6 text-center sm:p-8">
      <div className="flex justify-center">{icon}</div>
      <h1 className="mt-3 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {children && <div className="mt-6 flex justify-center gap-3">{children}</div>}
    </div>
  );
}
