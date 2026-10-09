import { apiRequest } from '@/lib/api-client';

export type SaleStatus = 'draft' | 'completed' | 'voided' | 'refunded' | 'pending_delivery';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'other';
/** Con que documento se cobro la venta. Inmutable: la factura puede anularse, la venta se hizo con factura. */
export type SaleDocumentType = 'receipt' | 'invoice';

export interface InvoiceDto {
  id: string;
  orgId: string;
  saleId: string;
  invoiceNumber: string;
  status: 'issued' | 'voided';
  issuedAt: string;
  dueDate?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItemDto {
  id: string;
  orgId: string;
  saleId: string;
  productId: string | null;
  productName?: string | null;
  productSku?: string | null;
  kitId?: string | null;
  kitName?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  total: number;
  totalCost: number;
  createdAt: string;
}

export interface SalePaymentDto {
  id: string;
  orgId: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  paidAt: string;
  createdAt: string;
}

export interface SaleDto {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  customerId?: string | null;
  quoteId?: string | null;
  saleNumber: string;
  status: SaleStatus;
  soldAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  costTotal: number;
  /** Datos del cliente ocasional capturados en el POS. */
  clientName?: string | null;
  clientNit?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  /** Datos vivos del cliente registrado (JOIN a customers). Tienen prioridad al mostrar. */
  customerName?: string | null;
  customerTaxId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  paymentMethod?: PaymentMethod | null;
  soldBy?: string | null;
  soldByName?: string | null;
  voidedAt?: string | null;
  deliveredAt?: string | null;
  documentType?: SaleDocumentType;
  /** Aplanados desde la factura para no pedir el detalle en los listados. */
  invoiceNumber?: string | null;
  invoiceStatus?: 'issued' | 'voided' | null;
  invoice?: InvoiceDto | null;
  itemCount?: number;
  /** Suma de los pagos no anulados. El saldo pendiente es `total - depositTotal`. */
  depositTotal?: number;
  payments?: SalePaymentDto[];
  createdAt: string;
  updatedAt: string;
  items?: SaleItemDto[];
}

export interface CreateSaleItemPayload {
  productId?: string;
  kitId?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount?: number;
  purchaseOrderId?: string;
}

export interface CreateSalePaymentPayload {
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
}

export interface CreateSalePayload {
  branchId: string;
  customerId?: string;
  quoteId?: string;
  saleNumber: string;
  status?: SaleStatus;
  soldAt?: string;
  taxTotal?: number;
  /** 'invoice' emite la factura en la misma transaccion y exige NIT y razon social. */
  documentType?: SaleDocumentType;
  paymentMethod?: PaymentMethod;
  clientName?: string;
  clientNit?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  payments?: CreateSalePaymentPayload[];
  items: CreateSaleItemPayload[];
}

export const salesApi = {
  list: (params?: { branchId?: string; status?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.status) query.set('status', params.status);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<SaleDto[]>(`/operations/sales${qs}`);
  },

  get: (id: string) => apiRequest<SaleDto>(`/operations/sales/${id}`),

  create: (payload: CreateSalePayload) =>
    apiRequest<SaleDto>('/operations/sales', { method: 'POST', body: payload }),

  update: (id: string, payload: { status?: SaleStatus; paymentMethod?: PaymentMethod; clientName?: string }) =>
    apiRequest<SaleDto>(`/operations/sales/${id}`, { method: 'PATCH', body: payload }),

  void: (id: string) => apiRequest<SaleDto>(`/operations/sales/${id}/void`, { method: 'POST' }),

  /** Facturar a posteriori una venta que se cobro con recibo. */
  createInvoice: (id: string) =>
    apiRequest<InvoiceDto>(`/operations/sales/${id}/invoice`, { method: 'POST', body: {} }),

  deliver: (id: string, payload?: { payment?: { amount: number; method: PaymentMethod } }) =>
    apiRequest<SaleDto>(`/operations/sales/${id}/deliver`, { method: 'POST', body: payload ?? {} }),

  addPayment: (id: string, payload: { amount: number; method: PaymentMethod }) =>
    apiRequest(`/operations/sales/${id}/payments`, { method: 'POST', body: payload }),
};
