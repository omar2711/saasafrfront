'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { quotesApi, type QuoteDto, type QuoteStatus } from '@/lib/api/quotes';
import { useOrganization } from '@/contexts/organization-context';
import { formatCurrency, formatDate } from '@/lib/format';
import { ExportButtons } from '@/components/reports/export-buttons';
import { describeFilters, type ExportDataset } from '@/lib/export/types';

const STATUS_MAP: Record<QuoteStatus, { status: 'draft' | 'pending' | 'success' | 'active' | 'inactive' | 'warning'; label: string }> = {
  pending: { status: 'draft', label: 'Borrador' },
  sent: { status: 'pending', label: 'Enviada' },
  approved: { status: 'pending', label: 'Aprobada' },
  accepted: { status: 'success', label: 'Aceptada' },
  rejected: { status: 'inactive', label: 'Rechazada' },
  expired: { status: 'warning', label: 'Expirada' },
  converted: { status: 'active', label: 'Convertida' },
};

export function QuotesHistoryTab() {
  const { branches } = useOrganization();
  const [quotes, setQuotes] = useState<QuoteDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await quotesApi.list({
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      });
      setQuotes(data);
    } catch {
      setError('No se pudo cargar el historial de cotizaciones');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const conversionRate = quotes.length > 0
    ? Math.round((quotes.filter((q) => q.status === 'converted').length / quotes.length) * 100)
    : 0;

  const buildDataset = (): ExportDataset<QuoteDto> => ({
    title: 'Historial de cotizaciones',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Sucursal: branchFilter === 'all' ? 'Todas' : getBranchName(branchFilter),
      Estado: statusFilter === 'all' ? 'Todos' : STATUS_MAP[statusFilter as QuoteStatus]?.label,
    }),
    columns: [
      { header: 'Nº cotización', value: (q) => q.quoteNumber },
      { header: 'Cliente', value: (q) => q.clientName ?? 'Sin nombre' },
      { header: 'Sucursal', value: (q) => getBranchName(q.branchId) },
      { header: 'Items', value: (q) => q.itemCount ?? 0, align: 'right' },
      { header: 'Total', value: (q) => q.total, align: 'right' },
      { header: 'Estado', value: (q) => STATUS_MAP[q.status].label },
      { header: 'Fecha', value: (q) => formatDate(q.createdAt) },
    ],
    rows: quotes,
    summary: [
      { label: 'Cotizaciones listadas', value: String(quotes.length) },
      { label: 'Tasa de conversión', value: `${conversionRate}%` },
    ],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sucursal</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_MAP).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Tasa de conversion: <span className="font-semibold text-foreground">{conversionRate}%</span>
          </span>
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || quotes.length === 0} />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº cotizacion</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Sin cotizaciones en el rango seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm">{quote.quoteNumber}</TableCell>
                    <TableCell>{quote.clientName ?? 'Sin nombre'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getBranchName(quote.branchId)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{quote.itemCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(quote.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={STATUS_MAP[quote.status].status} label={STATUS_MAP[quote.status].label} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(quote.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
