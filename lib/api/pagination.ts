import { apiRequest, getToken, getTenantId, getApiCacheRevision } from '@/lib/api-client';

export type ListFilters = Record<string, string | number | undefined>;
export function listPath(path: string, filters: ListFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return `${path}${query.size ? `?${query}` : ''}`;
}

/** Fetch every page for an explicit export; never silently export only page 1. */
export async function listAllPages<T>(path: string, filters: ListFilters = {}, cache = false): Promise<T[]> {
  const token = getToken(); const tenant = getTenantId(); const revision = getApiCacheRevision();
  const rows: T[] = [];
  const ids = new Set<string>();
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    if (token !== getToken() || tenant !== getTenantId() || revision !== getApiCacheRevision()) {
      throw new Error('La sesión o los datos cambiaron durante la exportación. Vuelve a intentarlo.');
    }
    const page = await apiRequest<T[]>(listPath(path, { ...filters, limit, offset }), { cache });
    if (token !== getToken() || tenant !== getTenantId() || revision !== getApiCacheRevision()) {
      throw new Error('La sesión o los datos cambiaron durante la exportación. Vuelve a intentarlo.');
    }
    for (const row of page) {
      const id = (row as { id?: string }).id;
      if (id !== undefined && ids.has(id)) throw new Error('El listado cambió durante la carga. Vuelve a intentarlo.');
      if (id !== undefined) ids.add(id);
      rows.push(row);
    }
    if (page.length < limit) return rows;
  }
}
