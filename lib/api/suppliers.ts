import { apiRequest } from '@/lib/api-client';

export interface SupplierDto {
  id: string;
  orgId: string;
  name: string;
  taxId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  /** Departamento / estado / provincia. */
  stateRegion?: string | null;
  /** Pais / region. */
  location?: string | null;
  company?: string | null;
  notes?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  taxId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  stateRegion?: string;
  location?: string;
  company?: string;
  notes?: string;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {
  status?: 'active' | 'inactive';
  isActive?: boolean;
}

export const suppliersApi = {
  list: () => apiRequest<SupplierDto[]>('/operations/suppliers'),

  create: (payload: CreateSupplierPayload) =>
    apiRequest<SupplierDto>('/operations/suppliers', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateSupplierPayload) =>
    apiRequest<SupplierDto>(`/operations/suppliers/${id}`, { method: 'PATCH', body: payload }),

  delete: (id: string) =>
    apiRequest<void>(`/operations/suppliers/${id}`, { method: 'DELETE' }),
};
