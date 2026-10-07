import { apiRequest } from '@/lib/api-client';

export type QuoteStatus =
  | 'pending'
  | 'sent'
  | 'approved'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface QuoteItemDto {
  id: string;
  orgId: string;
  quoteId: string;
  productId: string | null;
  kitId?: string | null;
  kitName?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  createdAt: string;
}

export interface QuoteDto {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  customerId?: string | null;
  quoteNumber: string;
  status: QuoteStatus;
  validUntil?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientNit?: string | null;
  clientAddress?: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItemDto[];
}

export interface CreateQuoteItemPayload {
  productId?: string;
  kitId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateQuotePayload {
  branchId: string;
  customerId?: string;
  quoteNumber: string;
  status?: QuoteStatus;
  validUntil?: string;
  taxTotal?: number;
  discountTotal?: number;
  notes?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientNit?: string;
  clientAddress?: string;
  items: CreateQuoteItemPayload[];
}

export interface UpdateQuotePayload {
  status?: QuoteStatus;
  validUntil?: string;
  notes?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export interface ConvertToSalePayload {
  saleNumber: string;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit' | 'other';
}

export const quotesApi = {
  list: (params?: { branchId?: string; status?: string; dateFrom?: string; dateTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.status) query.set('status', params.status);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<QuoteDto[]>(`/operations/quotes${qs}`);
  },

  get: (id: string) => apiRequest<QuoteDto>(`/operations/quotes/${id}`),

  create: (payload: CreateQuotePayload) =>
    apiRequest<QuoteDto>('/operations/quotes', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateQuotePayload) =>
    apiRequest<QuoteDto>(`/operations/quotes/${id}`, { method: 'PATCH', body: payload }),

  convertToSale: (id: string, payload: ConvertToSalePayload) =>
    apiRequest(`/operations/quotes/${id}/convert-to-sale`, { method: 'POST', body: payload }),
};
