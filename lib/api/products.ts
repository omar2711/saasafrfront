import { apiRequest } from '@/lib/api-client';
import { listPath, listAllPages } from './pagination';
export interface ProductFilters { search?: string; status?: string; limit?: number; offset?: number; }

export interface ProductDto {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  category?: string | null;
  categoryId?: string | null;
  description?: string | null;
  salePrice: number;
  costPrice?: number | null;
  /** Rango de venta autorizado. null = sin limite por ese extremo. */
  minSalePrice?: number | null;
  maxSalePrice?: number | null;
  unit?: string | null;
  imageUrl?: string | null;
  status: 'active' | 'inactive' | 'pending_pricing';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  category?: string;
  categoryId?: string;
  description?: string;
  salePrice: number;
  costPrice?: number;
  minSalePrice?: number | null;
  maxSalePrice?: number | null;
  unit?: string;
  image?: string;
  minStock?: number;
  branchId?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: 'active' | 'inactive' | 'pending_pricing';
}

export const productsApi = {
  list: () => listAllPages<ProductDto>('/operations/products', {}, true),
  listPage: (filters: ProductFilters = {}) => apiRequest<ProductDto[]>(listPath('/operations/products', { limit: 100, ...filters })),

  create: (payload: CreateProductPayload) =>
    apiRequest<ProductDto>('/operations/products', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateProductPayload) =>
    apiRequest<ProductDto>(`/operations/products/${id}`, { method: 'PATCH', body: payload }),

  delete: (id: string) =>
    apiRequest<void>(`/operations/products/${id}`, { method: 'DELETE' }),

  listDeleted: () => apiRequest<ProductDto[]>('/operations/products/deleted'),

  restore: (id: string) =>
    apiRequest<ProductDto>(`/operations/products/${id}/restore`, { method: 'POST' }),
};
