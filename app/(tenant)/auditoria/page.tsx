'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  FileText,
  History,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Undo2,
  User,
  UserCog,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportButtons } from '@/components/reports/export-buttons';
import { auditApi, type AuditLogDto, type AuditSummaryDto } from '@/lib/api/audit';
import { describeFilters, type ExportDataset } from '@/lib/export/types';
import { formatDateTime } from '@/lib/format';
import { useOrganization } from '@/contexts/organization-context';
import { cn } from '@/lib/utils';

/**
 * Los códigos son los de `AUDIT_ACTIONS` en el backend. Una acción sin entrada
 * aquí se muestra con su código crudo, que es preferible a esconderla.
 */
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof History; color: string }
> = {
  login: { label: 'Inicio de sesión', icon: User, color: 'text-purple-600 bg-purple-100' },
  logout: { label: 'Cierre de sesión', icon: User, color: 'text-gray-600 bg-gray-100' },
  'sale.void': { label: 'Anulación de venta', icon: ShieldAlert, color: 'text-red-600 bg-red-100' },
  'sale.return': { label: 'Devolución', icon: Undo2, color: 'text-amber-700 bg-amber-100' },
  'sale.return_void': {
    label: 'Anulación de devolución',
    icon: Undo2,
    color: 'text-red-600 bg-red-100',
  },
  'inventory.write_off': {
    label: 'Baja de inventario',
    icon: Package,
    color: 'text-orange-600 bg-orange-100',
  },
  'inventory.adjust': {
    label: 'Ajuste de stock',
    icon: Package,
    color: 'text-blue-600 bg-blue-100',
  },
  'price.change': {
    label: 'Cambio de precio',
    icon: DollarSign,
    color: 'text-yellow-700 bg-yellow-100',
  },
  'user.create': { label: 'Alta de usuario', icon: UserCog, color: 'text-green-600 bg-green-100' },
  'user.status_change': {
    label: 'Cambio de estado de usuario',
    icon: UserCog,
    color: 'text-blue-600 bg-blue-100',
  },
  'role.change': { label: 'Cambio de rol', icon: FileText, color: 'text-indigo-600 bg-indigo-100' },
};

const ENTITY_LABELS: Record<string, string> = {
  session: 'Sesión',
  sale: 'Venta',
  sale_return: 'Devolución',
  product: 'Producto',
  user: 'Usuario',
  role: 'Rol',
};

const actionLabel = (action: string) => ACTION_CONFIG[action]?.label ?? action;
const entityLabel = (entity: string) => ENTITY_LABELS[entity] ?? entity;

/**
 * Resumen legible del metadata. Cada acción guarda claves distintas, así que se
 * describen las que importan y el resto cae a un listado clave: valor.
 */
function describeMetadata(log: AuditLogDto): string {
  const meta = log.metadata;
  if (!meta) return '';

  if (log.action === 'price.change') {
    const scope = meta.branchId ? 'sucursal' : 'global';
    return `Precio ${scope}: ${meta.previousSalePrice ?? '—'} → ${meta.newSalePrice ?? '—'}`;
  }
  if (log.action === 'sale.void') {
    return `Venta ${meta.saleNumber ?? ''} por ${meta.total ?? '—'}${
      meta.restockedInventory ? ' · stock repuesto' : ' · sin movimiento de stock'
    }`;
  }
  if (log.action === 'sale.return' || log.action === 'sale.return_void') {
    const damaged = Number(meta.damagedLines ?? 0);
    return `${meta.returnNumber ?? ''} · ${meta.lines ?? 0} línea(s)${
      damaged > 0 ? `, ${damaged} dada(s) de baja` : ''
    }`;
  }
  if (log.action === 'inventory.write_off' || log.action === 'inventory.adjust') {
    return `${meta.quantity ?? '—'} unidad(es) · stock ${meta.stockBefore ?? '—'} → ${
      meta.stockAfter ?? '—'
    }${meta.notes ? ` · ${meta.notes}` : ''}`;
  }
  if (log.action === 'user.status_change') {
    return `${meta.email ?? ''}: ${meta.previousStatus ?? '—'} → ${meta.newStatus ?? '—'}`;
  }
  if (log.action === 'role.change') {
    return `${meta.roleName ?? ''} · ${meta.operation === 'grant' ? 'concedido' : 'revocado'}`;
  }

  return Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

export default function AuditPage() {
  const { hasPermission, permissions } = useOrganization();
  // permissions vacío = todavía cargando; no se bloquea la pantalla por eso.
  const canRead = permissions.length === 0 || hasPermission('audit.read');

  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [summary, setSummary] = useState<AuditSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [list, totals] = await Promise.all([
        auditApi.list({
          action: actionFilter === 'all' ? undefined : actionFilter,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
        }),
        auditApi.summary(),
      ]);
      setLogs(list);
      setSummary(totals);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la auditoría');
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!canRead) {
      setIsLoading(false);
      return;
    }
    loadData();
  }, [canRead, loadData]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter(
      (log) =>
        (log.userName ?? '').toLowerCase().includes(term) ||
        (log.userEmail ?? '').toLowerCase().includes(term) ||
        actionLabel(log.action).toLowerCase().includes(term) ||
        describeMetadata(log).toLowerCase().includes(term),
    );
  }, [logs, searchTerm]);

  const buildDataset = (): ExportDataset<AuditLogDto> => ({
    title: 'Auditoría',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Accion: actionFilter === 'all' ? 'Todas' : actionLabel(actionFilter),
      Busqueda: searchTerm.trim() || undefined,
    }),
    columns: [
      { header: 'Fecha', value: (log) => formatDateTime(log.createdAt) },
      { header: 'Usuario', value: (log) => log.userName ?? log.userEmail ?? 'Sistema' },
      { header: 'Acción', value: (log) => actionLabel(log.action) },
      { header: 'Entidad', value: (log) => entityLabel(log.entityType) },
      { header: 'Detalle', value: (log) => describeMetadata(log) },
      { header: 'IP', value: (log) => log.ip ?? '' },
    ],
    rows: filtered,
    summary: [{ label: 'Eventos listados', value: String(filtered.length) }],
  });

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Auditoría" description="Historial de actividad y cambios en el sistema" />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No tienes permiso para ver el historial de auditoría.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoría" description="Historial de actividad y cambios en el sistema">
        <ExportButtons buildDataset={buildDataset} disabled={isLoading || filtered.length === 0} />
      </PageHeader>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summary?.eventsToday ?? 0}</div>
            <p className="text-sm text-muted-foreground">Eventos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summary?.priceChanges ?? 0}</div>
            <p className="text-sm text-muted-foreground">Cambios de precio (30 días)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summary?.stockAdjustments ?? 0}</div>
            <p className="text-sm text-muted-foreground">Ajustes y bajas (30 días)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summary?.activeUsers ?? 0}</div>
            <p className="text-sm text-muted-foreground">Usuarios activos hoy</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Acción</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ACTION_CONFIG).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Usuario, acción o detalle..."
              className="pl-9 w-full sm:w-[260px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Sin eventos en el rango seleccionado.
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((log) => {
                const config = ACTION_CONFIG[log.action];
                const Icon = config?.icon ?? History;
                const who = log.userName ?? log.userEmail ?? 'Sistema';
                const initials = who
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <li key={log.id} className="flex items-start gap-3 p-4">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        config?.color ?? 'text-gray-600 bg-gray-100',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{actionLabel(log.action)}</span>
                        <Badge variant="secondary">{entityLabel(log.entityType)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">
                        {describeMetadata(log) || 'Sin detalle adicional'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                        {log.ip ? ` · ${log.ip}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{initials || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm text-muted-foreground sm:inline">{who}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
