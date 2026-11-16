import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarIcon } from './Icons';

function navClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function Layout() {
  const { pathname } = useLocation();
  const bookingActive = pathname === '/' || pathname.startsWith('/book') || pathname.startsWith('/cancel');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Sistema de Reservas</span>
          </NavLink>
          <nav className="flex items-center gap-1" aria-label="Navegación principal">
            <NavLink to="/" className={() => navClass(bookingActive)}>
              Reservar
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => navClass(isActive)}>
              Panel del Negocio
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
          Sistema de Reservas · ASP.NET Core + React
        </div>
      </footer>
    </div>
  );
}
