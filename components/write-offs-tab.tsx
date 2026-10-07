'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, PackageX, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { inventoryApi, type MovementDto, type StockDto } from '@/lib/api/inventory';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { ProductStockAdjustDialog, type StockAdjustPayload } from '@/components/product-stock-adjust-dialog';
import { useOrganization } from '@/contexts/organization-context';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ExportButtons } from '@/components/reports/export-buttons';
import { describeFilters, type ExportDataset } from '@/lib/export/types';

interface WriteOffsTabProps {
  /** Se dispara tras registrar una baja, para que la pestana Inventario refresque el stock. */
  onWriteOffRegistered?: () => void;
  /**
   * En Reportes la pestana es de consulta: oculta el boton de registrar. El
   * alta sigue viviendo en Inventario, que es donde el usuario tiene delante el
   * stock de la sucursal.
   */
  readOnly?: boolean;
}

export function WriteOffsTab({ onWriteOffRegistered, readOnly = false }: WriteOffsTabProps) {
  const { branches, currentBranch, hasPermission } = useOrganization();
  const canWriteOff = !readOnly && hasPermission('inventory.write_off');

  const [movements, setMovements] = useState<MovementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Registro de una baja nueva: primero se elige el producto, luego cantidad y motivo.
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [stocks, setStocks] = useState<StockDto[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await inventoryApi.listMovements({
        movementType: 'damage',
        branchId: branchFilter === 'all' ? undefined : branchFilter,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      });
      setMovements(data);
    } catch {
      setError('No se pudo cargar el historial de bajas');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const openPicker = async () => {
    setError('');
    setIsPickerOpen(true);
    try {
      const [productList, stockList] = await Promise.all([
        productsApi.list(),
        inventoryApi.listStock(currentBranch?.id),
      ]);
      setProducts(productList);
      setStocks(stockList);
    } catch {
      setError('No se pudieron cargar los productos');
      setIsPickerOpen(false);
    }
  };

  const getStock = (productId: string) =>
    stocks.find((s) => s.productId === productId)?.quantityOnHand ?? 0;

  const handleRegisterWriteOff = async (payload: StockAdjustPayload) => {
    if (!selectedProduct || !currentBranch) return;
    setIsSaving(true);
    setError('');
    try {
      await inventoryApi.createMovement({
        branchId: currentBranch.id,
        productId: selectedProduct.id,
        movementType: payload.movementType,
        quantity: payload.quantity,
        notes: payload.reason,
      });
      setSelectedProduct(null);
      await loadMovements();
      onWriteOffRegistered?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la baja');
    } finally {
      setIsSaving(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredMovements = term
    ? movements.filter(
        (m) =>
          (m.productName ?? '').toLowerCase().includes(term) ||
          (m.productSku ?? '').toLowerCase().includes(term) ||
          (m.notes ?? '').toLowerCase().includes(term),
      )
    : movements;

  const totalUnits = filteredMovements.reduce((sum, m) => sum + m.quantity, 0);
  const totalCost = filteredMovements.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);

  const buildDataset = (): ExportDataset<MovementDto> => ({
    title: 'Bajas de inventario',
    subtitle: describeFilters({
      Desde: dateFrom,
      Hasta: dateTo,
      Sucursal: branchFilter === 'all' ? 'Todas' : branches.find((b) => b.id === branchFilter)?.name,
      Busqueda: searchTerm.trim() || undefined,
    }),
    columns: [
      { header: 'Producto', value: (m) => m.productName ?? m.productId },
      { header: 'Identificador', value: (m) => m.productSku ?? '' },
      { header: 'Sucursal', value: (m) => m.branchName ?? '' },
      { header: 'Cantidad', value: (m) => m.quantity, align: 'right' },
      { header: 'Costo', value: (m) => m.totalCost ?? '', align: 'right' },
      { header: 'Motivo', value: (m) => m.notes ?? '' },
      { header: 'Usuario', value: (m) => m.createdByName ?? '' },
      { header: 'Fecha', value: (m) => formatDateTime(m.createdAt) },
    ],
    rows: filteredMovements,
    summary: [
      { label: 'Bajas registradas', value: String(filteredMovements.length) },
      { label: 'Unidades dadas de baja', value: String(totalUnits) },
      { label: 'Costo de la merma', value: formatCurrency(totalCost) },
    ],
  });

  // Solo productos con stock en la sucursal actual: no tiene sentido dar de baja lo que no hay.
  const productsWithStock = products.filter((p) => getStock(p.id) > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end justify-between">
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
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Producto, identificador o motivo..."
                className="pl-9 w-[240px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons buildDataset={buildDataset} disabled={isLoading || filteredMovements.length === 0} />
          {canWriteOff && (
            <Button onClick={openPicker} disabled={!currentBranch}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar baja
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredMovements.length}</div>
            <p className="text-sm text-muted-foreground">Bajas registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{totalUnits}</div>
            <p className="text-sm text-muted-foreground">Unidades dadas de baja</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <PackageX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay bajas registradas en el rango seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.productName ?? 'Producto eliminado'}</div>
                      {m.productSku && (
                        <div className="text-xs text-muted-foreground font-mono">{m.productSku}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">−{m.quantity}</TableCell>
                    <TableCell className="text-sm max-w-[280px]">{m.notes ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.branchName ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.createdByName ?? '—'}</TableCell>
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

      <Dialog open={isPickerOpen} onOpenChange={(open) => { if (!open) { setIsPickerOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecciona el producto a dar de baja</DialogTitle>
            <DialogDescription>
              Sucursal: {currentBranch?.name ?? '—'}. Solo se listan productos con stock disponible.
            </DialogDescription>
          </DialogHeader>
          <Select
            value=""
            onValueChange={(productId) => {
              const product = products.find((p) => p.id === productId);
              if (product) {
                setSelectedProduct(product);
                setIsPickerOpen(false);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Buscar producto..." />
            </SelectTrigger>
            <SelectContent>
              {productsWithStock.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No hay productos con stock en esta sucursal
                </div>
              ) : (
                productsWithStock.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {getStock(p.id)} {p.unit ?? 'u'}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      <ProductStockAdjustDialog
        isOpen={!!selectedProduct}
        product={selectedProduct}
        stock={selectedProduct ? getStock(selectedProduct.id) : 0}
        lockedKind="baja"
        isSubmitting={isSaving}
        onConfirm={handleRegisterWriteOff}
        onCancel={() => setSelectedProduct(null)}
      />
    </div>
  );
}
