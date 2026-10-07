import { apiRequest } from '@/lib/api-client';

export type SaleReturnStatus = 'completed' | 'voided';

/**
 * 'restock': vuelve al inventario vendible.
 * 'damaged': entra y se da de baja en el mismo acto — el backend registra
 * +return y −damage, neto cero, y la pestaña Bajas lo recoge como merma.
 */
export type SaleReturnCondition = 'restock' | 'damaged';

export interface SaleReturnItemDto {
  id: string;
  returnId: string;
  saleItemId: string;
  productId?: string | null;
  productName?: string | null;
  kitId?: string | null;
  kitName?: string | null;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  condition: SaleReturnCondition;
  notes?: string | null;
}

export interface SaleReturnDto {
  id: string;
  orgId: string;
  saleId: string;
  saleNumber?: string | null;
  branchId?: string | null;
  returnNumber: string;
  status: SaleReturnStatus;
  reason?: string | null;
  refundTotal: number;
  items: SaleReturnItemDto[];
  createdAt: string;
  updatedAt: string;
  voidedAt?: string | null;
}

export interface CreateSaleReturnPayload {
  saleId: string;
  reason?: string;
  items: {
    saleItemId: string;
    quantity: number;
    condition?: SaleReturnCondition;
    notes?: string;
  }[];
}

export const saleReturnsApi = {
  list: (params?: { saleId?: string; branchId?: string; status?: SaleReturnStatus }) => {
    const query = new URLSearchParams();
    if (params?.saleId) query.set('saleId', params.saleId);
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<SaleReturnDto[]>(`/operations/sale-returns${qs}`);
  },

  get: (id: string) => apiRequest<SaleReturnDto>(`/operations/sale-returns/${id}`),

  create: (payload: CreateSaleReturnPayload) =>
    apiRequest<SaleReturnDto>('/operations/sale-returns', { method: 'POST', body: payload }),

  void: (id: string) =>
    apiRequest<SaleReturnDto>(`/operations/sale-returns/${id}/void`, { method: 'POST' }),
};
