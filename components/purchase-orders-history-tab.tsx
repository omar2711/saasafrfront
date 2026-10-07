'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { PurchaseOrderDetailDialog } from '@/components/purchase-order-detail-dialog';
import { purchaseOrdersApi, type PurchaseOrderDto } from '@/lib/api/purchase-orders';
import { suppliersApi, type SupplierDto } from '@/lib/api/suppliers';
import { PO_STATUSES, poStatusLabels, poStatusMap } from '@/lib/data/purchase-order-status';
import { useOrganization } from '@/contexts/organization-context';
import { formatCurrency, formatDate } from '@/lib/format';
import { ExportButtons } from '@/components/reports/export-buttons';
import { describeFilters, type ExportDataset } from '@/lib/export/types';

export function PurchaseOrdersHistoryTab() {
  const { branches } = useOrganization();

  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [detailOrder, setDetailOrder] = useState<PurchaseOrderDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await purchaseOrdersApi.list({
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      });
      setOrders(data);
    } catch {
      setError('No se pudo cargar el historial de ordenes de compra');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, supplierFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openDetail = async (order: PurchaseOrderDto) => {
    // La lista no trae los items: hay que pedir la orden completa.
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailOrder(null);
    try {
      setDetailOrder(await purchaseOrdersApi.get(order.id));
    } catch {
      setError('No se pudo cargar el detalle de la orden');
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredOrders = term
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          (o.supplierName ?? '').toLowerCase().includes(term),
      )
    : orders;

  const totalPurchased = filteredOrders
    .filter((o) => o.status !== 'canceled')
    .reduce((sum, o) => sum + o.totalCost, 0);

  const buildDataset = (): ExportDataset<PurchaseOrderDto> => ({
    title: 'Historial de compras',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Proveedor: supplierFilter === 'all' ? 'Todos' : suppliers.find((s) => s.id === supplierFilter)?.name,
      Sucursal: branchFilter === 'all' ? 'Todas' : branches.find((b) => b.id === branchFilter)?.name,
      Estado: statusFilter === 'all' ? 'Todos' : poStatusLabels[statusFilter as keyof typeof poStatusLabels],
      Busqueda: searchTerm.trim() || undefined,
    }),
    columns: [
      { header: 'N.º orden', value: (o) => o.orderNumber },
      { header: 'Proveedor', value: (o) => o.supplierName ?? '' },
      { header: 'Sucursal', value: (o) => o.branchName ?? '' },
      { header: 'Items', value: (o) => o.itemCount ?? 0, align: 'right' },
      { header: 'Total', value: (o) => o.totalCost, align: 'right' },
      { header: 'Estado', value: (o) => poStatusLabels[o.status] },
      { header: 'Creada', value: (o) => formatDate(o.createdAt) },
      { header: 'Recibida', value: (o) => formatDate(o.receivedAt) },
    ],
    rows: filteredOrders,
    summary: [
      { label: 'Órdenes en el periodo', value: String(filteredOrders.length) },
      { label: 'Total comprado (sin canceladas)', value: formatCurrency(totalPurchased) },
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
          <Label className="text-xs">Proveedor</Label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PO_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{poStatusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="N.º de orden o proveedor..."
              className="pl-9 w-[240px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="ml-auto">
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || filteredOrders.length === 0} />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredOrders.length}</div>
            <p className="text-sm text-muted-foreground">Ordenes en el periodo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalPurchased)}</div>
            <p className="text-sm text-muted-foreground">Total comprado (sin canceladas)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.º orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Recibida</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No hay ordenes de compra en el periodo seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell>{order.supplierName ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.branchName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.itemCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(order.totalCost)}</TableCell>
                    <TableCell>
                      <StatusBadge status={poStatusMap[order.status]} label={poStatusLabels[order.status]} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(order.receivedAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(order)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchaseOrderDetailDialog
        isOpen={isDetailOpen}
        order={detailOrder}
        isLoading={isDetailLoading}
        onClose={() => { setIsDetailOpen(false); setDetailOrder(null); }}
      />
    </div>
  );
}
