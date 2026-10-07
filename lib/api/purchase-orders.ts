import { apiRequest } from '@/lib/api-client';

export type POStatus = 'draft' | 'pending' | 'ordered' | 'approved' | 'received' | 'canceled';

export interface POItemDto {
  id: string;
  orgId: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string | null;
  productSku?: string | null;
  productUnit?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  supplierId: string;
  supplierName?: string | null;
  orderNumber: string;
  status: POStatus;
  orderedAt?: string | null;
  receivedAt?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalCost: number;
  notes?: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  items?: POItemDto[];
}

export interface CreatePOItemPayload {
  productId?: string;
  productName?: string;
  sku?: string;
  category?: string;
  unit?: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  branchId: string;
  supplierId: string;
  orderNumber: string;
  orderedAt?: string;
  status?: POStatus;
  taxTotal?: number;
  discountTotal?: number;
  notes?: string;
  items: CreatePOItemPayload[];
}

export interface UpdatePurchaseOrderPayload {
  status?: POStatus;
  orderedAt?: string;
  receivedAt?: string;
  discountTotal?: number;
  taxTotal?: number;
  notes?: string;
}

export interface OpenPurchaseOrderLineDto {
  purchaseOrderId: string;
  orderNumber: string;
  status: POStatus;
  orderedQty: number;
  reservedQty: number;
  availableQty: number;
}

export const purchaseOrdersApi = {
  list: (params?: {
    branchId?: string;
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.supplierId) query.set('supplierId', params.supplierId);
    if (params?.status) query.set('status', params.status);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<PurchaseOrderDto[]>(`/operations/purchases/orders${qs}`);
  },

  get: (id: string) =>
    apiRequest<PurchaseOrderDto>(`/operations/purchases/orders/${id}`),

  create: (payload: CreatePurchaseOrderPayload) =>
    apiRequest<PurchaseOrderDto>('/operations/purchases/orders', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdatePurchaseOrderPayload) =>
    apiRequest<PurchaseOrderDto>(`/operations/purchases/orders/${id}`, { method: 'PATCH', body: payload }),

  receive: (id: string) =>
    apiRequest<PurchaseOrderDto>(`/operations/purchases/orders/${id}/receive`, { method: 'POST' }),

  getProductAvailability: (params: { productId: string; branchId: string }) =>
    apiRequest<OpenPurchaseOrderLineDto[]>(
      `/operations/purchases/orders/product-availability?productId=${params.productId}&branchId=${params.branchId}`,
    ),
};
