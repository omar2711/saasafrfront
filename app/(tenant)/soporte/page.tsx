'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, MessageCircle, Plus, Wifi, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupportThread } from '@/components/support-thread';
import { SupportTicketList } from '@/components/support-ticket-list';
import { useSupportSocket } from '@/hooks/use-support-socket';
import {
  supportApi,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type SupportTicketDto,
  type SupportTicketMessageDto,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/api/support';
import { appendMessage } from '@/lib/support-ui';
import { useOrganization } from '@/contexts/organization-context';

/**
 * Canales alternativos al ticket. Son datos de la plataforma, no del tenant, así
 * que viven en variables de entorno: meterlos en la base de datos obligaría a
 * una migración y a una pantalla de configuración para dos constantes. Si no
 * están definidas, los botones no se pintan.
 */
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function SupportPage() {
  const { organization, currentUser, hasPermission, permissions } = useOrganization();
  const canWrite = permissions.length === 0 || hasPermission('support.write');

  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [selected, setSelected] = useState<SupportTicketDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [reply, setReply] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [isCreating, setIsCreating] = useState(false);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setTickets(
        await supportApi.list(statusFilter === 'all' ? {} : { status: statusFilter }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los tickets');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = async (ticket: SupportTicketDto) => {
    setError('');
    try {
      setSelected(await supportApi.get(ticket.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el ticket');
    }
  };

  /**
   * Lo que llega por el socket ya está persistido: aquí solo se refleja en la
   * pantalla. El dedupe vive en `appendMessage`, que usan las dos ramas (socket
   * y respuesta del POST), así que el orden de llegada da igual.
   */
  const handleSocketMessage = useCallback(
    (ticketId: string, message: SupportTicketMessageDto) => {
      setSelected((prev) => (prev && prev.id === ticketId ? appendMessage(prev, message) : prev));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, messageCount: t.messageCount + 1, lastMessageAt: message.createdAt }
            : t,
        ),
      );
    },
    [],
  );

  const handleSocketTicket = useCallback((ticket: SupportTicketDto) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      return exists ? prev.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t)) : [ticket, ...prev];
    });
    setSelected((prev) =>
      prev && prev.id === ticket.id ? { ...ticket, messages: prev.messages } : prev,
    );
  }, []);

  const { connected } = useSupportSocket({
    ticketId: selected?.id ?? null,
    onMessage: handleSocketMessage,
    onTicketUpdated: handleSocketTicket,
  });

  const handleSend = async () => {
    if (!selected || !reply.trim()) return;
    setIsSending(true);
    setError('');
    try {
      const message = await supportApi.addMessage(selected.id, reply.trim());
      setSelected((prev) => (prev && prev.id === selected.id ? appendMessage(prev, message) : prev));
      setReply('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreate = async () => {
    if (!newSubject.trim() || !newBody.trim()) {
      setError('El asunto y el mensaje son obligatorios');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const ticket = await supportApi.create({
        subject: newSubject.trim(),
        body: newBody.trim(),
        priority: newPriority,
      });
      setIsCreateOpen(false);
      setNewSubject('');
      setNewBody('');
      setNewPriority('normal');
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      setSelected(ticket);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    try {
      const updated = await supportApi.update(selected.id, {
        status: selected.status === 'closed' ? 'open' : 'closed',
      });
      setSelected({ ...updated, messages: selected.messages });
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  };

  const contactContext = encodeURIComponent(
    `Hola, necesito soporte con ${organization?.name ?? 'mi tienda'}.`,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Soporte" description="Abre un ticket y conversa con el equipo técnico">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={
              connected
                ? 'Los mensajes nuevos llegan al instante'
                : 'Sin conexión en vivo: recarga para ver mensajes nuevos'
            }
          >
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {connected ? 'En vivo' : 'Sin conexión en vivo'}
          </span>
          <Button onClick={() => setIsCreateOpen(true)} disabled={!canWrite}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo ticket
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {(SUPPORT_WHATSAPP || SUPPORT_EMAIL) && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">¿Prefieres otro canal?</p>
              <p className="text-xs text-muted-foreground">
                El ticket deja constancia escrita del caso. Para algo urgente, escríbenos directo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_WHATSAPP && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${contactContext}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {SUPPORT_EMAIL && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                      `Soporte · ${organization?.name ?? ''}`.trim(),
                    )}`}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Correo
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'all' | TicketStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TICKET_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SupportTicketList
            tickets={tickets}
            selectedId={selected?.id}
            isLoading={isLoading}
            onSelect={openTicket}
          />
        </div>

        <SupportThread
          ticket={selected}
          viewerRole="customer"
          currentUserId={currentUser?.id}
          canWrite={canWrite}
          isSending={isSending}
          reply={reply}
          onReplyChange={setReply}
          onSend={handleSend}
          headerActions={
            <Button variant="outline" size="sm" onClick={handleClose} disabled={!canWrite}>
              {selected?.status === 'closed' ? 'Reabrir' : 'Cerrar'}
            </Button>
          }
        />
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Nuevo ticket de soporte</DialogTitle>
            <DialogDescription>
              Describe el problema con el mayor detalle posible. El equipo responde en este mismo
              hilo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-subject">Asunto *</Label>
              <Input
                id="ticket-subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ej: El recibo se corta al imprimir en A4"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-priority">Prioridad</Label>
              <Select
                value={newPriority}
                onValueChange={(value) => setNewPriority(value as TicketPriority)}
              >
                <SelectTrigger id="ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {TICKET_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-body">Mensaje *</Label>
              <Textarea
                id="ticket-body"
                rows={5}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Qué hiciste, qué esperabas y qué pasó."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
