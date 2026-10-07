import { apiRequest } from '@/lib/api-client';

export interface AuditLogDto {
  id: string;
  orgId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditSummaryDto {
  eventsToday: number;
  priceChanges: number;
  stockAdjustments: number;
  activeUsers: number;
}

export interface ListAuditLogsParams {
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: (params: ListAuditLogsParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<AuditLogDto[]>(`/audit${qs}`);
  },

  summary: () => apiRequest<AuditSummaryDto>('/audit/summary'),
};
