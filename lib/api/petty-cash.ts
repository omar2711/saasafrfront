import { apiRequest } from '@/lib/api-client';

export type PettyCashTransactionType = 'income' | 'expense';

export interface PettyCashTransactionDto {
  id: string;
  orgId: string;
  branchId: string | null;
  type: PettyCashTransactionType;
  amount: number;
  description: string;
  category: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashSummaryDto {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface PettyCashListResult {
  transactions: PettyCashTransactionDto[];
  summary: PettyCashSummaryDto;
}

export interface CreatePettyCashTransactionPayload {
  type: PettyCashTransactionType;
  amount: number;
  description: string;
  category: string;
  reference?: string;
  branchId?: string;
}

export const pettyCashApi = {
  list: (params?: { branchId?: string; type?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.type) query.set('type', params.type);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<PettyCashListResult>(`/operations/petty-cash${qs}`);
  },

  create: (payload: CreatePettyCashTransactionPayload) =>
    apiRequest<PettyCashTransactionDto>('/operations/petty-cash', {
      method: 'POST',
      body: payload,
    }),

  delete: (id: string) =>
    apiRequest<void>(`/operations/petty-cash/${id}`, { method: 'DELETE' }),
};
