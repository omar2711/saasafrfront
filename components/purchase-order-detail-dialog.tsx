'use client';

import { Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/status-badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { poStatusLabels, poStatusMap } from '@/lib/data/purchase-order-status';
import type { PurchaseOrderDto } from '@/lib/api/purchase-orders';
import { formatDate } from '@/lib/format';

interface PurchaseOrderDetailDialogProps {
  isOpen: boolean;
  order: PurchaseOrderDto | null;
  isLoading?: boolean;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(value);

export function PurchaseOrderDetailDialog({
  isOpen,
  order,
  isLoading = false,
  onClose,
}: PurchaseOrderDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Orden {order?.orderNumber ?? ''}
            {order && (
              <StatusBadge status={poStatusMap[order.status]} label={poStatusLabels[order.status]} />
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Proveedor</p>
                <p className="font-medium">{order.supplierName ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sucursal destino</p>
                <p className="font-medium">{order.branchName ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha de creacion</p>
                <p className="font-medium">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha de recepcion</p>
                <p className="font-medium">{formatDate(order.receivedAt)}</p>
              </div>
            </div>

            <Separator />

            {order.items && order.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Costo unitario</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {item.productName ?? 'Producto eliminado'}
                            </div>
                            {item.productSku && (
                              <div className="text-xs text-muted-foreground font-mono">{item.productSku}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                        {item.productUnit ? ` ${item.productUnit}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Esta orden no tiene productos registrados
              </p>
            )}

            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span><span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Descuento:</span><span>-{formatCurrency(order.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>IVA:</span><span>{formatCurrency(order.taxTotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(order.totalCost)}</span>
                </div>
              </CardContent>
            </Card>

            {order.notes && (
              <div>
                <Label className="text-muted-foreground">Notas</Label>
                <p className="mt-1 text-sm">{order.notes}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
