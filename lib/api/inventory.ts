import { apiRequest } from '@/lib/api-client';

export interface StockDto {
  id: string;
  orgId: string;
  branchId: string;
  productId: string;
  quantityOnHand: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementType =
  | 'purchase'
  | 'sale'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'adjustment_out'
  | 'return'
  | 'damage';

/** Tipos que reducen el stock. El resto suma. Espeja NEGATIVE_MOVEMENT_TYPES del backend. */
export const NEGATIVE_MOVEMENT_TYPES: MovementType[] = [
  'sale',
  'transfer_out',
  'adjustment_out',
  'damage',
];

export interface MovementDto {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  productId: string;
  productName?: string | null;
  productSku?: string | null;
  movementType: MovementType;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface CreateMovementPayload {
  branchId: string;
  productId: string;
  movementType: MovementType;
  /** Siempre positiva: el signo lo determina movementType. */
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export const inventoryApi = {
  listStock: (branchId?: string) => {
    const params = branchId ? `?branchId=${branchId}` : '';
    return apiRequest<StockDto[]>(`/operations/inventory/stock${params}`);
  },

  listMovements: (params?: {
    limit?: number;
    offset?: number;
    branchId?: string;
    productId?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.productId) query.set('productId', params.productId);
    if (params?.movementType) query.set('movementType', params.movementType);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<MovementDto[]>(`/operations/inventory/movements${qs}`);
  },

  createMovement: (payload: CreateMovementPayload) =>
    apiRequest<MovementDto>('/operations/inventory/movements', { method: 'POST', body: payload }),
};
