"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCheck, Wifi, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportThread } from "@/components/support-thread";
import { SupportTicketList } from "@/components/support-ticket-list";
import { useSupportSocket } from "@/hooks/use-support-socket";
import { authApi } from "@/lib/api/auth";
import { organizationsApi, type OrgDto } from "@/lib/api/organizations";
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
} from "@/lib/api/support";
import { appendMessage } from "@/lib/support-ui";

const ALL = "all";

/**
 * Panel del agente de soporte.
 *
 * El super admin no tiene organización seleccionada, así que todas las llamadas
 * van con `requiresTenant: false`: el backend lo resuelve con OptionalTenantGuard
 * y los usecases ya contemplan al agente cruzando organizaciones.
 */
const AGENT_OPTS = { requiresTenant: false } as const;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [orgs, setOrgs] = useState<OrgDto[]>([]);
  const [selected, setSelected] = useState<SupportTicketDto | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | TicketStatus>(
    ALL,
  );
  const [orgFilter, setOrgFilter] = useState<string>(ALL);
  const [reply, setReply] = useState("");

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setTickets(
        await supportApi.list(
          {
            ...(statusFilter === ALL ? {} : { status: statusFilter }),
            ...(orgFilter === ALL ? {} : { orgId: orgFilter }),
          },
          AGENT_OPTS,
        ),
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los tickets",
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, orgFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    organizationsApi
      .list()
      .then(setOrgs)
      .catch(() => setOrgs([]));
    authApi
      .me()
      .then((me) => setCurrentUserId(me.sub))
      .catch(() => {});
  }, []);

  const openTicket = async (ticket: SupportTicketDto) => {
    setError("");
    try {
      setSelected(await supportApi.get(ticket.id, AGENT_OPTS));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el ticket");
    }
  };

  const handleSocketMessage = useCallback(
    (ticketId: string, message: SupportTicketMessageDto) => {
      setSelected((prev) =>
        prev && prev.id === ticketId ? appendMessage(prev, message) : prev,
      );
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                messageCount: t.messageCount + 1,
                lastMessageAt: message.createdAt,
              }
            : t,
        ),
      );
    },
    [],
  );

  const handleSocketTicket = useCallback((ticket: SupportTicketDto) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      return exists
        ? prev.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t))
        : [ticket, ...prev];
    });
    setSelected((prev) =>
      prev && prev.id === ticket.id
        ? { ...ticket, messages: prev.messages }
        : prev,
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
    setError("");
    try {
      const message = await supportApi.addMessage(
        selected.id,
        reply.trim(),
        AGENT_OPTS,
      );
      setSelected((prev) =>
        prev && prev.id === selected.id ? appendMessage(prev, message) : prev,
      );
      setReply("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  };

  const patchTicket = async (
    payload: Parameters<typeof supportApi.update>[1],
  ) => {
    if (!selected) return;
    setError("");
    try {
      const updated = await supportApi.update(selected.id, payload, AGENT_OPTS);
      setSelected({ ...updated, messages: selected.messages });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "No se pudo actualizar el ticket",
      );
    }
  };

  const openCount = tickets.filter(
    (t) => t.status !== "closed" && t.status !== "resolved",
  ).length;
  const isMine = selected?.assignedTo && selected.assignedTo === currentUserId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Tickets de todas las organizaciones de la plataforma"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{openCount} sin resolver</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {connected ? "En vivo" : "Sin conexión en vivo"}
          </span>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as typeof ALL | TicketStatus)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TICKET_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las organizaciones</SelectItem>
              {orgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SupportTicketList
            tickets={tickets}
            selectedId={selected?.id}
            isLoading={isLoading}
            onSelect={openTicket}
            showOrg
            emptyLabel="No hay tickets con estos filtros."
          />
        </div>

        <SupportThread
          ticket={selected}
          viewerRole="agent"
          currentUserId={currentUserId}
          canWrite
          isSending={isSending}
          reply={reply}
          onReplyChange={setReply}
          onSend={handleSend}
          showOrg
          emptyLabel="Selecciona un ticket para atenderlo."
          headerActions={
            selected && (
              <>
                <Select
                  value={selected.priority}
                  onValueChange={(value) =>
                    patchTicket({ priority: value as TicketPriority })
                  }
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
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
                <Select
                  value={selected.status}
                  onValueChange={(value) =>
                    patchTicket({ status: value as TicketStatus })
                  }
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TICKET_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!currentUserId || !!isMine}
                  onClick={() =>
                    currentUserId && patchTicket({ assignedTo: currentUserId })
                  }
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  {isMine ? "Asignado a ti" : "Asignármelo"}
                </Button>
              </>
            )
          }
        />
      </div>
    </div>
  );
}
