import { apiRequest } from '@/lib/api-client';

export type TransferStatus = 'in_transit' | 'completed' | 'voided';

export interface TransferItemDto {
  id: string;
  transferId: string;
  productId: string;
  productName?: string | null;
  quantity: number;
}

export interface TransferDto {
  id: string;
  orgId: string;
  sourceBranchId: string;
  sourceBranchName?: string | null;
  destBranchId: string;
  destBranchName?: string | null;
  transferNumber: string;
  status: TransferStatus;
  notes?: string | null;
  items: TransferItemDto[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  voidedAt?: string | null;
}

export interface CreateTransferPayload {
  sourceBranchId: string;
  destBranchId: string;
  notes?: string;
  items: { productId: string; quantity: number }[];
}

export const transfersApi = {
  list: (params?: { branchId?: string; status?: TransferStatus }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<TransferDto[]>(`/operations/inventory/transfers${qs}`);
  },

  get: (id: string) => apiRequest<TransferDto>(`/operations/inventory/transfers/${id}`),

  create: (payload: CreateTransferPayload) =>
    apiRequest<TransferDto>('/operations/inventory/transfers', { method: 'POST', body: payload }),

  receive: (id: string) =>
    apiRequest<TransferDto>(`/operations/inventory/transfers/${id}/receive`, { method: 'POST' }),

  void: (id: string) =>
    apiRequest<TransferDto>(`/operations/inventory/transfers/${id}/void`, { method: 'POST' }),
};
