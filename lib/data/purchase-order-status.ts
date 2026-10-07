import type { POStatus } from '@/lib/api/purchase-orders';

export const PO_STATUSES: POStatus[] = [
  'draft',
  'pending',
  'ordered',
  'approved',
  'received',
  'canceled',
];

export const poStatusMap: Record<string, 'draft' | 'pending' | 'success' | 'active' | 'inactive'> = {
  draft: 'draft',
  pending: 'pending',
  ordered: 'pending',
  approved: 'active',
  received: 'success',
  canceled: 'inactive',
};

export const poStatusLabels: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  ordered: 'Ordenada',
  approved: 'Aprobada',
  received: 'Recibida',
  canceled: 'Cancelada',
};
