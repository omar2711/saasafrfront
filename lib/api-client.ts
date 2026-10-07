export const API_BASE_URL = (
  process.env.NEXT_API_URL?.trim() || 'http://localhost:3001'
).replace(/\/+$/, '');

const AUTH_KEYS = [
  'access_token',
  'refresh_token',
  'tenant_id',
  'user_email',
  'is_super_admin',
  'session_id',
] as const;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenant_id');
}

export function getIsSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('is_super_admin') === 'true';
}

export function setAuth(token: string, tenantId: string) {
  localStorage.setItem('access_token', token);
  localStorage.setItem('tenant_id', tenantId);
}

export function clearAuth() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  requiresTenant?: boolean;
}

/**
 * Conserva `code` y `status` del backend además del mensaje. Todo el código que
 * hacía `catch (e) { e.message }` sigue funcionando porque extiende Error, pero
 * ahora se puede distinguir un 403 por horario de un 403 por permisos.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(message: string, status: number, code: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, requiresTenant = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (requiresTenant) {
    const tenantId = getTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
  }

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(' ')
      : errorBody?.message;
    throw new ApiError(
      message ?? `Request failed: ${response.status}`,
      response.status,
      errorBody?.code ?? `HTTP_${response.status}`,
      Array.isArray(errorBody?.details) ? errorBody.details : [],
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
