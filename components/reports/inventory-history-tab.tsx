'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { inventoryApi, NEGATIVE_MOVEMENT_TYPES, type MovementDto } from '@/lib/api/inventory';
import { MOVEMENT_LABELS } from '@/lib/data/movement-types';
import { useOrganization } from '@/contexts/organization-context';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ExportButtons } from '@/components/reports/export-buttons';
import { describeFilters, type ExportDataset } from '@/lib/export/types';

const isNegative = (type: MovementDto['movementType']) => NEGATIVE_MOVEMENT_TYPES.includes(type);

export function InventoryHistoryTab() {
  const { branches } = useOrganization();
  const [movements, setMovements] = useState<MovementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await inventoryApi.listMovements({
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        movementType: typeFilter === 'all' ? undefined : typeFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      });
      setMovements(data);
    } catch {
      setError('No se pudo cargar el historial de inventario');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildDataset = (): ExportDataset<MovementDto> => ({
    title: 'Historial de inventario',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Sucursal: branchFilter === 'all' ? 'Todas' : branches.find((b) => b.id === branchFilter)?.name,
      Tipo: typeFilter === 'all' ? 'Todos' : MOVEMENT_LABELS[typeFilter as MovementDto['movementType']],
    }),
    columns: [
      { header: 'Producto', value: (m) => m.productName ?? m.productId },
      { header: 'Sucursal', value: (m) => m.branchName ?? '' },
      { header: 'Tipo', value: (m) => MOVEMENT_LABELS[m.movementType] ?? m.movementType },
      { header: 'Cantidad', value: (m) => (isNegative(m.movementType) ? -m.quantity : m.quantity), align: 'right' },
      { header: 'Motivo', value: (m) => m.notes ?? '' },
      { header: 'Usuario', value: (m) => m.createdByName ?? '' },
      { header: 'Costo total', value: (m) => (m.totalCost != null ? m.totalCost : ''), align: 'right' },
      { header: 'Fecha', value: (m) => formatDateTime(m.createdAt) },
    ],
    rows: movements,
    summary: [{ label: 'Movimientos', value: String(movements.length) }],
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
          <Label className="text-xs">Tipo</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || movements.length === 0} />
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
                <TableHead>Producto</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Costo total</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Sin movimientos en el rango seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.productName ?? m.productId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.branchName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MOVEMENT_LABELS[m.movementType] ?? m.movementType}</Badge>
                    </TableCell>
                    <TableCell className={isNegative(m.movementType) ? 'text-red-600' : 'text-green-600'}>
                      {isNegative(m.movementType) ? '−' : '+'}{m.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                      {m.notes ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.createdByName ?? '—'}</TableCell>
                    <TableCell>{m.totalCost != null ? formatCurrency(m.totalCost) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(m.createdAt)}
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
