import { apiRequest } from '@/lib/api-client';

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketAuthorRole = 'customer' | 'agent';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En curso',
  waiting_customer: 'Esperando tu respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export interface SupportTicketMessageDto {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string | null;
  authorRole: TicketAuthorRole;
  body: string;
  createdAt: string;
}

export interface SupportTicketDto {
  id: string;
  orgId: string;
  orgName: string | null;
  createdBy: string;
  createdByName: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  assignedToName: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Solo viene lleno en el detalle; el listado lo deja vacío. */
  messages: SupportTicketMessageDto[];
}

export interface CreateTicketPayload {
  subject: string;
  body: string;
  priority?: TicketPriority;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}

/**
 * El panel del agente pasa `{ requiresTenant: false }`: el super admin no tiene
 * organización seleccionada y un `tenant_id` rancio en localStorage (de una
 * sesión de tenant anterior en el mismo navegador) haría que el backend evaluase
 * una organización que no toca.
 */
export interface SupportRequestOptions {
  requiresTenant?: boolean;
}

export const supportApi = {
  list: (
    params: { status?: TicketStatus; orgId?: string } = {},
    opts: SupportRequestOptions = {},
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<SupportTicketDto[]>(`/support/tickets${qs}`, opts);
  },

  get: (id: string, opts: SupportRequestOptions = {}) =>
    apiRequest<SupportTicketDto>(`/support/tickets/${id}`, opts),

  create: (payload: CreateTicketPayload, opts: SupportRequestOptions = {}) =>
    apiRequest<SupportTicketDto>('/support/tickets', { ...opts, method: 'POST', body: payload }),

  update: (id: string, payload: UpdateTicketPayload, opts: SupportRequestOptions = {}) =>
    apiRequest<SupportTicketDto>(`/support/tickets/${id}`, {
      ...opts,
      method: 'PATCH',
      body: payload,
    }),

  addMessage: (id: string, body: string, opts: SupportRequestOptions = {}) =>
    apiRequest<SupportTicketMessageDto>(`/support/tickets/${id}/messages`, {
      ...opts,
      method: 'POST',
      body: { body },
    }),
};
