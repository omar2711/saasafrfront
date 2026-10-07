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
import { salesApi, type SaleDto, type SaleStatus } from '@/lib/api/sales';
import { useOrganization } from '@/contexts/organization-context';
import { formatCurrency, formatDate } from '@/lib/format';
import { ExportButtons } from '@/components/reports/export-buttons';
import { describeFilters, type ExportDataset } from '@/lib/export/types';

const STATUS_MAP: Record<SaleStatus, { status: 'draft' | 'success' | 'inactive' | 'warning' | 'pending'; label: string }> = {
  draft: { status: 'draft', label: 'Borrador' },
  completed: { status: 'success', label: 'Completada' },
  voided: { status: 'inactive', label: 'Anulada' },
  refunded: { status: 'warning', label: 'Reembolsada' },
  pending_delivery: { status: 'pending', label: 'Entrega pendiente' },
};

export function SalesHistoryTab() {
  const { branches } = useOrganization();
  const [sales, setSales] = useState<SaleDto[]>([]);
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
      const data = await salesApi.list({
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      });
      setSales(data);
    } catch {
      setError('No se pudo cargar el historial de ventas');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const totalRevenue = sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);

  const buildDataset = (): ExportDataset<SaleDto> => ({
    title: 'Historial de ventas',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Sucursal: branchFilter === 'all' ? 'Todas' : getBranchName(branchFilter),
      Estado: statusFilter === 'all' ? 'Todos' : STATUS_MAP[statusFilter as SaleStatus]?.label,
    }),
    columns: [
      { header: 'Nº venta', value: (s) => s.saleNumber },
      { header: 'Cliente', value: (s) => s.clientName ?? 'Sin nombre' },
      { header: 'Sucursal', value: (s) => getBranchName(s.branchId) },
      { header: 'Items', value: (s) => s.itemCount ?? 0, align: 'right' },
      { header: 'Total', value: (s) => s.total, align: 'right' },
      { header: 'Estado', value: (s) => STATUS_MAP[s.status].label },
      { header: 'Fecha', value: (s) => formatDate(s.createdAt) },
    ],
    rows: sales,
    summary: [
      { label: 'Ventas listadas', value: String(sales.length) },
      { label: 'Total facturado (completadas)', value: formatCurrency(totalRevenue) },
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
            Total facturado (completadas):{' '}
            <span className="font-semibold text-foreground">{formatCurrency(totalRevenue)}</span>
          </span>
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || sales.length === 0} />
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
                <TableHead>Nº venta</TableHead>
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
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Sin ventas en el rango seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                    <TableCell>{sale.clientName ?? 'Sin nombre'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getBranchName(sale.branchId)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sale.itemCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={STATUS_MAP[sale.status].status} label={STATUS_MAP[sale.status].label} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sale.createdAt)}
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
