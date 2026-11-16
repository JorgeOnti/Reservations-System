import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { getErrorMessage } from '../api/client';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Ejecuta una petición asíncrona cuando cambian las dependencias, cancelando la anterior.
 * Conserva los datos previos mientras recarga para evitar parpadeos.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fn(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, error, loading, reload };
}
