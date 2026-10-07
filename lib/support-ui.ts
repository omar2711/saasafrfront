import type { SupportTicketDto, SupportTicketMessageDto, TicketPriority, TicketStatus } from '@/lib/api/support';

/** Compartido por la pantalla del tenant y el panel del agente. */
export const STATUS_VARIANT: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export const PRIORITY_VARIANT: Record<TicketPriority, string> = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-amber-700',
  urgent: 'text-red-600',
};

/**
 * Añade un mensaje al hilo sin duplicarlo.
 *
 * El bug que cierra: el controlador emite por WebSocket ANTES de devolver la
 * respuesta HTTP, así que el eco del socket llega mientras el `await` del POST
 * sigue pendiente. La rama del socket comprobaba el id, pero la del POST no, y
 * al resolverse añadía otra vez la MISMA fila. Las dos copias compartían
 * `message.id`, que es la `key` del render: React descartaba una en el
 * siguiente repintado y parecía que una era "fantasma". En la base de datos
 * siempre hubo una sola.
 *
 * Con un único punto de entrada para ambas ramas, el orden de llegada da igual.
 */
export function appendMessage(
  ticket: SupportTicketDto,
  message: SupportTicketMessageDto,
): SupportTicketDto {
  if (ticket.messages.some((m) => m.id === message.id)) return ticket;
  return {
    ...ticket,
    messages: [...ticket.messages, message],
    messageCount: ticket.messages.length + 1,
    lastMessageAt: message.createdAt,
  };
}
