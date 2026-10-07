import { apiRequest } from "../api-client";
export type AdminRow = Record<string, any>;
export function adminGet<T = AdminRow[]>(
  path: string,
  filter: Record<string, string> = {},
) {
  const query = new URLSearchParams(
    Object.entries(filter).filter(([, v]) => v),
  );
  return apiRequest<T>(`/admin/${path}?${query}`, { requiresTenant: false });
}
export function adminSave(path: string, body: unknown, id?: string) {
  return apiRequest<AdminRow>(`/admin/${path}${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body,
    requiresTenant: false,
  });
}
