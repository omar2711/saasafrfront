import { apiRequest } from '@/lib/api-client';

export interface KitItemDto {
  id: string;
  kitId: string;
  productId: string;
  productName?: string | null;
  productCostPrice?: number | null;
  quantity: number;
}

export interface KitDto {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  description?: string | null;
  salePrice: number;
  status: 'active' | 'inactive';
  items: KitItemDto[];
  componentsTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKitPayload {
  sku: string;
  name: string;
  description?: string;
  salePrice: number;
  items: { productId: string; quantity: number }[];
}

export interface UpdateKitPayload {
  sku?: string;
  name?: string;
  description?: string;
  salePrice?: number;
  status?: 'active' | 'inactive';
  items?: { productId: string; quantity: number }[];
}

export const kitsApi = {
  list: () => apiRequest<KitDto[]>('/operations/kits'),

  get: (id: string) => apiRequest<KitDto>(`/operations/kits/${id}`),

  create: (payload: CreateKitPayload) =>
    apiRequest<KitDto>('/operations/kits', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateKitPayload) =>
    apiRequest<KitDto>(`/operations/kits/${id}`, { method: 'PATCH', body: payload }),

  delete: (id: string) => apiRequest<void>(`/operations/kits/${id}`, { method: 'DELETE' }),
};
