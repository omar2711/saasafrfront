'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  TICKET_STATUS_LABELS,
  type SupportTicketDto,
  type TicketAuthorRole,
} from '@/lib/api/support';
import { STATUS_VARIANT } from '@/lib/support-ui';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SupportThreadProps {
  ticket: SupportTicketDto | null;
  /**
   * Lado desde el que se mira la conversación. Decide qué burbujas van a la
   * derecha: el tenant ve sus mensajes a la derecha y los de soporte a la
   * izquierda, y el agente al revés.
   */
  viewerRole: TicketAuthorRole;
  currentUserId?: string;
  canWrite: boolean;
  isSending: boolean;
  reply: string;
  onReplyChange: (value: string) => void;
  onSend: () => void;
  /** Acciones propias de cada lado: cerrar/reabrir en el tenant, estado y asignación en el agente. */
  headerActions?: ReactNode;
  /** El panel del agente muestra de qué empresa es el ticket. */
  showOrg?: boolean;
  emptyLabel?: string;
}

/**
 * Hilo de conversación de un ticket. Lo comparten la pantalla de soporte del
 * tenant y el panel del agente: son la misma conversación vista desde los dos
 * lados, y mantener dos copias garantizaba que divergieran.
 */
export function SupportThread({
  ticket,
  viewerRole,
  currentUserId,
  canWrite,
  isSending,
  reply,
  onReplyChange,
  onSend,
  headerActions,
  showOrg = false,
  emptyLabel = 'Selecciona un ticket para ver la conversación.',
}: SupportThreadProps) {
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages.length]);

  return (
    <Card className="min-h-[520px]">
      <CardContent className="flex h-full flex-col p-0">
        {!ticket ? (
          <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{ticket.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  {showOrg && ticket.orgName ? `${ticket.orgName} · ` : ''}
                  Abierto por {ticket.createdByName ?? 'un usuario'} ·{' '}
                  {formatDateTime(ticket.createdAt)}
                  {ticket.assignedToName ? ` · atiende ${ticket.assignedToName}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn('text-[11px]', STATUS_VARIANT[ticket.status])}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                {headerActions}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {ticket.messages.map((message) => {
                  // El lado se decide por el rol, no por el id del autor: en el
                  // tenant escriben varias personas de la misma empresa y todas
                  // están del mismo lado de la conversación.
                  const ownSide = message.authorRole === viewerRole;
                  const isSelf = !!currentUserId && message.authorId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', ownSide ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[75%]',
                          ownSide ? 'bg-primary/10' : 'bg-muted',
                        )}
                      >
                        <p
                          className={cn(
                            'text-[11px] font-medium text-muted-foreground',
                            ownSide && 'text-right',
                          )}
                        >
                          {isSelf ? 'Tú' : message.authorName ?? 'Usuario'}
                          {message.authorRole === 'agent' && ' · Soporte'}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                        <p
                          className={cn(
                            'mt-1 text-[10px] text-muted-foreground',
                            ownSide && 'text-right',
                          )}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              {ticket.status === 'closed' ? (
                <p className="text-sm text-muted-foreground">
                  Este ticket está cerrado. Reábrelo para seguir la conversación.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={reply}
                    onChange={(e) => onReplyChange(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    disabled={!canWrite}
                    onKeyDown={(e) => {
                      // Enter envía; Shift+Enter hace salto de línea.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                  />
                  <Button onClick={onSend} disabled={!canWrite || isSending || !reply.trim()}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
