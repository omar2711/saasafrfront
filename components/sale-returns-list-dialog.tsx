'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { saleReturnsApi, type SaleReturnDto } from '@/lib/api/sale-returns';
import type { SaleDto } from '@/lib/api/sales';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface SaleReturnsListDialogProps {
  isOpen: boolean;
  sale: SaleDto | null;
  canVoid: boolean;
  onClose: () => void;
  /** Se dispara tras anular, para que la venta recargue su estado. */
  onChanged: () => void;
}

/**
 * `saleReturnsApi.void` existía en el cliente y en el backend, pero no se
 * invocaba desde ninguna parte: no había forma de anular una devolución. Y como
 * anular una venta con devoluciones está bloqueado, un error al devolver dejaba
 * al usuario en un callejón sin salida.
 */
export function SaleReturnsListDialog({
  isOpen,
  sale,
  canVoid,
  onClose,
  onChanged,
}: SaleReturnsListDialogProps) {
  const [returns, setReturns] = useState<SaleReturnDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SaleReturnDto | null>(null);

  const loadReturns = useCallback(async () => {
    if (!sale) return;
    setIsLoading(true);
    setError('');
    try {
      setReturns(await saleReturnsApi.list({ saleId: sale.id }));
    } catch {
      setError('No se pudieron cargar las devoluciones de esta venta');
    } finally {
      setIsLoading(false);
    }
  }, [sale]);

  useEffect(() => {
    if (!isOpen) return;
    loadReturns();
  }, [isOpen, loadReturns]);

  const handleVoid = async () => {
    if (!confirming) return;
    setVoidingId(confirming.id);
    setError('');
    try {
      await saleReturnsApi.void(confirming.id);
      setConfirming(null);
      await loadReturns();
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la devolución');
    } finally {
      setVoidingId(null);
    }
  };

  const hasDamaged = (saleReturn: SaleReturnDto) =>
    saleReturn.items.some((item) => item.condition === 'damaged');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Devoluciones de la venta</DialogTitle>
            <DialogDescription>
              {sale ? `Venta ${sale.saleNumber}` : ''} — historial de devoluciones registradas.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : returns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Esta venta no tiene devoluciones registradas.
            </p>
          ) : (
            <div className="space-y-3">
              {returns.map((saleReturn) => (
                <div key={saleReturn.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {saleReturn.returnNumber}
                        </span>
                        {saleReturn.status === 'voided' ? (
                          <Badge variant="secondary">Anulada</Badge>
                        ) : (
                          <Badge>Vigente</Badge>
                        )}
                        {hasDamaged(saleReturn) && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            con merma
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(saleReturn.createdAt)}
                        {saleReturn.reason ? ` · ${saleReturn.reason}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(saleReturn.refundTotal)}</p>
                      {canVoid && saleReturn.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          onClick={() => setConfirming(saleReturn)}
                          disabled={voidingId === saleReturn.id}
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Anular
                        </Button>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1 text-sm">
                    {saleReturn.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="truncate">
                          {item.quantity} × {item.productName ?? item.kitName ?? 'Producto eliminado'}
                          {item.condition === 'damaged' && (
                            <span className="text-amber-700"> · dado de baja</span>
                          )}
                          {item.notes && (
                            <span className="text-muted-foreground"> · {item.notes}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatCurrency(item.refundAmount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular la devolución {confirming?.returnNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming && hasDamaged(confirming)
                ? 'Se deshacen los movimientos de inventario: lo repuesto vuelve a salir y lo que se dio de baja se reingresa. El stock queda como antes de la devolución.'
                : 'Se vuelve a descontar del stock lo que esta devolución había repuesto. El stock queda como antes de la devolución.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anular devolución
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
