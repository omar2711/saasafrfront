import { apiRequest } from '@/lib/api-client';

export interface CustomerDto {
  id: string;
  orgId: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  /** Solo vienen en el listado; get/create/update no los calculan. */
  salesCount?: number;
  salesTotal?: number;
  lastPurchaseAt?: string | null;
}

export interface CreateCustomerPayload {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  status?: 'active' | 'inactive';
}

export interface CustomerHistorySaleDto {
  id: string;
  saleNumber: string;
  status: string;
  soldAt: string;
  total: number;
  paymentMethod: string | null;
  branchName: string | null;
  itemCount: number;
}

export interface CustomerHistoryQuoteDto {
  id: string;
  quoteNumber: string;
  status: string;
  validUntil: string | null;
  total: number;
  branchName: string | null;
  itemCount: number;
  createdAt: string;
}

export interface CustomerHistoryDto {
  summary: {
    salesCount: number;
    salesTotal: number;
    quotesCount: number;
    lastPurchaseAt: string | null;
  };
  sales: CustomerHistorySaleDto[];
  quotes: CustomerHistoryQuoteDto[];
}

export const customersApi = {
  list: () => apiRequest<CustomerDto[]>('/operations/customers'),

  get: (id: string) => apiRequest<CustomerDto>(`/operations/customers/${id}`),

  history: (id: string) => apiRequest<CustomerHistoryDto>(`/operations/customers/${id}/history`),

  create: (payload: CreateCustomerPayload) =>
    apiRequest<CustomerDto>('/operations/customers', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateCustomerPayload) =>
    apiRequest<CustomerDto>(`/operations/customers/${id}`, { method: 'PATCH', body: payload }),

  delete: (id: string) =>
    apiRequest<void>(`/operations/customers/${id}`, { method: 'DELETE' }),
};
