'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketDto,
} from '@/lib/api/support';
import { PRIORITY_VARIANT, STATUS_VARIANT } from '@/lib/support-ui';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SupportTicketListProps {
  tickets: SupportTicketDto[];
  selectedId?: string | null;
  isLoading: boolean;
  onSelect: (ticket: SupportTicketDto) => void;
  /** El panel del agente cruza organizaciones y necesita saber de cuál es cada ticket. */
  showOrg?: boolean;
  emptyLabel?: string;
}

export function SupportTicketList({
  tickets,
  selectedId,
  isLoading,
  onSelect,
  showOrg = false,
  emptyLabel = 'No hay tickets todavía.',
}: SupportTicketListProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ticket)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-muted/60',
                    selectedId === ticket.id && 'bg-muted',
                  )}
                >
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  {showOrg && ticket.orgName && (
                    <p className="truncate text-[11px] text-muted-foreground">{ticket.orgName}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn('text-[11px]', STATUS_VARIANT[ticket.status])}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                    <span className={cn('text-[11px] font-medium', PRIORITY_VARIANT[ticket.priority])}>
                      {TICKET_PRIORITY_LABELS[ticket.priority]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {ticket.messageCount} mensaje(s)
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(ticket.lastMessageAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
