'use client';

import { useState, useEffect } from 'react';
import { Loader2, Package, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saleReturnsApi, type SaleReturnCondition } from '@/lib/api/sale-returns';
import type { SaleDto } from '@/lib/api/sales';
import type { ProductDto } from '@/lib/api/products';

interface SaleReturnDialogProps {
  isOpen: boolean;
  sale: SaleDto | null;
  productMap?: Record<string, ProductDto>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SaleReturnDialog({ isOpen, sale, productMap = {}, onSuccess, onCancel }: SaleReturnDialogProps) {
  const [alreadyReturned, setAlreadyReturned] = useState<Record<string, number>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  // Por defecto 'restock': es lo que hacia el sistema antes de existir el campo.
  const [conditions, setConditions] = useState<Record<string, SaleReturnCondition>>({});
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !sale) return;
    setIsLoading(true);
    setError('');
    setQuantities({});
    setConditions({});
    setLineNotes({});
    setReason('');
    saleReturnsApi
      .list({ saleId: sale.id, status: 'completed' })
      .then((returns) => {
        const totals: Record<string, number> = {};
        for (const ret of returns) {
          for (const item of ret.items) {
            totals[item.saleItemId] = (totals[item.saleItemId] ?? 0) + item.quantity;
          }
        }
        setAlreadyReturned(totals);
      })
      .catch(() => setError('No se pudo cargar el historial de devoluciones de esta venta'))
      .finally(() => setIsLoading(false));
  }, [isOpen, sale]);

  const getRemaining = (saleItemId: string, soldQty: number) =>
    soldQty - (alreadyReturned[saleItemId] ?? 0);

  const handleSubmit = async () => {
    if (!sale) return;
    setError('');
    const items = Object.entries(quantities)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([saleItemId, qty]) => ({
        saleItemId,
        quantity: parseFloat(qty),
        condition: conditions[saleItemId] ?? 'restock',
        notes: lineNotes[saleItemId]?.trim() || undefined,
      }));

    if (items.length === 0) {
      setError('Indica al menos una cantidad a devolver');
      return;
    }

    setIsSaving(true);
    try {
      await saleReturnsApi.create({ saleId: sale.id, reason: reason.trim() || undefined, items });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar la devolucion');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devolver productos</DialogTitle>
          <DialogDescription>
            {sale ? `Venta ${sale.saleNumber}` : ''} — indica la cantidad a devolver por cada linea (puede ser parcial).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {(sale?.items ?? []).map((item) => {
              const remaining = getRemaining(item.id, item.quantity);
              const isKit = !!item.kitName;
              const label = isKit
                ? item.kitName
                : (item.productId && productMap[item.productId]?.name) || 'Producto eliminado';
              if (remaining <= 0) return null;
              return (
                <div key={item.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
                      {isKit ? (
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        Vendido: {item.quantity} · Disponible para devolver: {remaining}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={remaining}
                      step="0.01"
                      className="w-24"
                      value={quantities[item.id] ?? ''}
                      onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>

                  {parseFloat(quantities[item.id] ?? '0') > 0 && (
                    <div className="space-y-2 pl-11">
                      <div className="space-y-1">
                        <Label className="text-xs">Estado del producto devuelto</Label>
                        <Select
                          value={conditions[item.id] ?? 'restock'}
                          onValueChange={(value) =>
                            setConditions((prev) => ({ ...prev, [item.id]: value as SaleReturnCondition }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restock">Vuelve al inventario</SelectItem>
                            <SelectItem value="damaged">Dañado — se da de baja</SelectItem>
                          </SelectContent>
                        </Select>
                        {conditions[item.id] === 'damaged' && (
                          <p className="text-[11px] text-muted-foreground">
                            No suma stock vendible: entra y sale como merma, y aparece en Reportes → Bajas.
                          </p>
                        )}
                      </div>
                      <Input
                        className="h-8 text-sm"
                        placeholder="Detalle de la línea (opcional)"
                        value={lineNotes[item.id] ?? ''}
                        onChange={(e) => setLineNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {(sale?.items ?? []).every((item) => getRemaining(item.id, item.quantity) <= 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos los productos de esta venta ya fueron devueltos
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar devolucion
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
