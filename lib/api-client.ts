import { QueryCache } from './query-cache';
export const API_BASE_URL = (
  process.env.NEXT_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001'
).replace(/\/+$/, '');
const queryCache = new QueryCache();
const CACHE_EVENT = 'afr:api-invalidated';
const STORAGE_EVENT_KEY = 'afr:api-invalidation';
let listening = false;

function initializeCacheEvents() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  try { queryCache.setStorage(window.sessionStorage); } catch { /* private mode: memory only */ }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
    try {
      const { tenant } = JSON.parse(event.newValue);
      queryCache.clear(tenant ?? undefined);
      window.dispatchEvent(new Event(CACHE_EVENT));
    } catch { /* Ignore unrelated or malformed storage events. */ }
  });
}

export function invalidateApiCache(tenant = getTenantId()) {
  queryCache.clear(tenant ?? undefined);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CACHE_EVENT));
    // Only invalidation metadata crosses tabs; no credentials or response data.
    try { localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ tenant, nonce: crypto.randomUUID() })); } catch { /* storage disabled */ }
  }
}
export function getApiCacheRevision() { return queryCache.revision; }

export function subscribeApiInvalidation(listener: () => void) {
  initializeCacheEvents();
  window.addEventListener(CACHE_EVENT, listener);
  return () => window.removeEventListener(CACHE_EVENT, listener);
}

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
  queryCache.clear();
  localStorage.setItem('access_token', token);
  localStorage.setItem('tenant_id', tenantId);
}

export function clearAuth() {
  invalidateApiCache();
  queryCache.clear();
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  requiresTenant?: boolean;
  cache?: boolean;
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
  initializeCacheEvents();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.cache === false) headers['x-cache-bypass'] = '1';

  const token = getToken();
  const tenantId = requiresTenant ? getTenantId() : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (requiresTenant) {
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
  }

  const load = async (): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
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
  };
  if (method !== 'GET') {
    try { return await load(); }
    finally { invalidateApiCache(tenantId); }
  }
  const url = new URL(path, 'http://internal');
  url.searchParams.sort();
  const ttl = url.pathname.includes('/stock') ? 3000 : url.pathname.includes('/pricing') ? 10000
    : /\/(products|kits|categories)(\/|$)/.test(url.pathname) ? 60000 : 15000;
  if (options.cache === false || !token || !tenantId || !path.startsWith('/operations/')) return load();
  const rawKey = JSON.stringify([API_BASE_URL, token, tenantId, url.pathname + url.search]);
  // Persist only a one-way digest of the authenticated scope, not the token.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return queryCache.read(key, tenantId, ttl, load);
}
