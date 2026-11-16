/** Cliente HTTP centralizado para la API de reservas. */

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(status: number, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'La solicitud contiene datos inválidos.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'Conflicto: el recurso cambió mientras realizabas la operación.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.',
};

export async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      0,
      `No se pudo conectar con el servidor (${API_URL}). Verifica que la API esté en ejecución.`,
    );
  }

  const body = await readBody(response);

  if (!response.ok) {
    const { message, errors } = extractError(body);
    throw new ApiError(
      response.status,
      message ?? DEFAULT_MESSAGES[response.status] ?? `Error inesperado (${response.status}).`,
      errors,
    );
  }

  return { data: body as T, headers: response.headers };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractError(body: unknown): { message?: string; errors?: FieldErrors } {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' && body.length < 300 ? { message: body } : {};
  }
  const record = body as Record<string, unknown>;
  const message =
    typeof record.message === 'string'
      ? record.message
      : typeof record.title === 'string'
        ? record.title
        : undefined;
  const errors =
    record.errors && typeof record.errors === 'object' ? (record.errors as FieldErrors) : undefined;
  return { message, errors };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}
