import { Link } from 'react-router-dom';
import { EmptyState } from '../components/StatusViews';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Página no encontrada"
      description="La dirección que buscas no existe."
      action={
        <Link to="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Ir al inicio
        </Link>
      }
    />
  );
}
