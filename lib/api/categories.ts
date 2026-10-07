import { apiRequest } from '@/lib/api-client';

export interface CategoryDto {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
  productCount: number;
  productCountInBranch?: number | null;
  stockInBranch?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export const categoriesApi = {
  list: (branchId?: string) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    return apiRequest<CategoryDto[]>(`/operations/categories${params}`);
  },

  create: (payload: CreateCategoryPayload) =>
    apiRequest<CategoryDto>('/operations/categories', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateCategoryPayload) =>
    apiRequest<CategoryDto>(`/operations/categories/${id}`, { method: 'PATCH', body: payload }),

  remove: (id: string) =>
    apiRequest<void>(`/operations/categories/${id}`, { method: 'DELETE' }),
};
