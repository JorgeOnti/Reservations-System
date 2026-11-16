import { CheckIcon } from './Icons';

const STEPS = ['Servicio', 'Fecha y horario', 'Tus datos'];

/** Indicador de progreso del flujo de reserva. `current` empieza en 1. */
export function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Progreso de la reserva">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={active ? 'step' : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-indigo-600 text-white'
                  : active
                    ? 'border-2 border-indigo-600 text-indigo-700'
                    : 'border-2 border-slate-300 text-slate-400'
              }`}
            >
              {done ? <CheckIcon className="h-4 w-4" /> : step}
            </span>
            <span className={`hidden whitespace-nowrap sm:inline ${active ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
              {label}
            </span>
            {step < STEPS.length && <span className={`h-px flex-1 ${done ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
