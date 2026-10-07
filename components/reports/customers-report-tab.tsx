'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { CustomerHistoryDialog } from '@/components/customer-history-dialog';
import { ExportButtons } from '@/components/reports/export-buttons';
import { customersApi, type CustomerDto } from '@/lib/api/customers';
import { describeFilters, type ExportDataset } from '@/lib/export/types';
import { formatCurrency, formatDate } from '@/lib/format';

type SortKey = 'total' | 'count' | 'recent' | 'name';

const SORT_LABELS: Record<SortKey, string> = {
  total: 'Mayor compra total',
  count: 'Más compras',
  recent: 'Compra más reciente',
  name: 'Nombre (A-Z)',
};

/**
 * Los agregados (compras, total, última compra) vienen ya calculados en
 * `GET /operations/customers` con un LEFT JOIN LATERAL. Pedir el historial de
 * cada cliente para armar esta tabla sería una petición por fila.
 */
export function CustomersReportTab() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [onlyBuyers, setOnlyBuyers] = useState('all');

  const [detailCustomer, setDetailCustomer] = useState<CustomerDto | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setCustomers(await customersApi.list());
    } catch {
      setError('No se pudo cargar el reporte de clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = customers.filter((c) => {
      const matchesTerm =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.taxId ?? '').toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesBuyers = onlyBuyers === 'all' || (c.salesCount ?? 0) > 0;
      return matchesTerm && matchesStatus && matchesBuyers;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'count':
          return (b.salesCount ?? 0) - (a.salesCount ?? 0);
        case 'recent':
          return (b.lastPurchaseAt ?? '').localeCompare(a.lastPurchaseAt ?? '');
        case 'name':
          return a.name.localeCompare(b.name, 'es');
        default:
          return (b.salesTotal ?? 0) - (a.salesTotal ?? 0);
      }
    });
  }, [customers, searchTerm, statusFilter, sortKey, onlyBuyers]);

  const totalBilled = rows.reduce((sum, c) => sum + (c.salesTotal ?? 0), 0);
  const buyersCount = rows.filter((c) => (c.salesCount ?? 0) > 0).length;

  const buildDataset = (): ExportDataset<CustomerDto> => ({
    title: 'Reporte de clientes',
    subtitle: describeFilters({
      Busqueda: searchTerm.trim() || undefined,
      Estado: statusFilter === 'all' ? 'Todos' : statusFilter === 'active' ? 'Activos' : 'Inactivos',
      Filtro: onlyBuyers === 'buyers' ? 'Solo con compras' : 'Todos',
      Orden: SORT_LABELS[sortKey],
    }),
    columns: [
      { header: 'Cliente', value: (c) => c.name },
      { header: 'CI/NIT', value: (c) => c.taxId ?? '' },
      { header: 'Teléfono', value: (c) => c.phone ?? '' },
      { header: 'Correo', value: (c) => c.email ?? '' },
      { header: 'Ciudad', value: (c) => c.city ?? '' },
      { header: 'Compras', value: (c) => c.salesCount ?? 0, align: 'right' },
      { header: 'Total comprado', value: (c) => c.salesTotal ?? 0, align: 'right' },
      { header: 'Última compra', value: (c) => formatDate(c.lastPurchaseAt, '') },
      { header: 'Estado', value: (c) => (c.status === 'active' ? 'Activo' : 'Inactivo') },
    ],
    rows,
    summary: [
      { label: 'Clientes listados', value: String(rows.length) },
      { label: 'Clientes con al menos una compra', value: String(buyersCount) },
      { label: 'Total facturado a estos clientes', value: formatCurrency(totalBilled) },
    ],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nombre, CI/NIT o correo..."
              className="pl-9 w-[240px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Con compras</Label>
          <Select value={onlyBuyers} onValueChange={setOnlyBuyers}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              <SelectItem value="buyers">Solo con compras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ordenar por</Label>
          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || rows.length === 0} />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-sm text-muted-foreground">Clientes listados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{buyersCount}</div>
            <p className="text-sm text-muted-foreground">Con al menos una compra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
            <p className="text-sm text-muted-foreground">Total facturado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CI/NIT</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total comprado</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No hay clientes que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="font-mono text-sm">{customer.taxId ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.phone ?? customer.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{customer.salesCount ?? 0}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(customer.salesTotal ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(customer.lastPurchaseAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver historial</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerHistoryDialog
        isOpen={detailCustomer !== null}
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
      />
    </div>
  );
}
