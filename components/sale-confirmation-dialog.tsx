'use client';

import { Loader2, Truck, PackageCheck, AlertTriangle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { PaymentMethod } from '@/lib/api/sales';

export interface SaleConfirmationItem {
  key: string;
  productId?: string;
  kitId?: string;
  name: string;
  price: number;
  quantity: number;
  available?: number;
}

interface SaleConfirmationDialogProps {
  isOpen: boolean;
  items: SaleConfirmationItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  hasInsufficientStock: boolean;
  isProcessing?: boolean;
  formatCurrency: (value: number) => string;
  onConfirm: () => void;
  onGoToAdvanceSale: () => void;
  onCancel: () => void;
  /** Factura: el toggle y los datos fiscales que exige. */
  withInvoice: boolean;
  onWithInvoiceChange: (value: boolean) => void;
  clientName?: string | null;
  clientNit?: string | null;
  onEditCustomer: () => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Credito',
  other: 'Otro',
};

export function SaleConfirmationDialog({
  isOpen,
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  hasInsufficientStock,
  isProcessing,
  formatCurrency,
  onConfirm,
  onGoToAdvanceSale,
  onCancel,
  withInvoice,
  onWithInvoiceChange,
  clientName,
  clientNit,
  onEditCustomer,
}: SaleConfirmationDialogProps) {
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  // Una factura necesita a quien se le emite. El backend lo vuelve a comprobar,
  // pero aqui evita que el cajero descubra el problema despues de cobrar.
  const missingInvoiceData = withInvoice && (!clientName?.trim() || !clientNit?.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar venta</DialogTitle>
          <DialogDescription>
            Revisa los datos antes de finalizar. {items.length} producto(s), {totalUnits} unidad(es) en total.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[40vh]">
          <div className="space-y-2 pr-2">
            {items.map((item) => {
              const isInsufficient = item.available !== undefined && item.available < item.quantity;
              return (
                <div key={item.key} className="flex items-start justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                    {isInsufficient && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-yellow-700">
                        <Truck className="h-3 w-3" />
                        Aun no llega: hay {item.available} de {item.quantity}, se entregara luego
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    {isInsufficient ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Pendiente de entrega
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                        <PackageCheck className="mr-1 h-3 w-3" />
                        Disponible
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IT (13%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {!hasInsufficientStock && (
            <>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted-foreground">Metodo de pago</span>
                <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documento</span>
                <span className="font-medium">{withInvoice ? 'Factura' : 'Recibo'}</span>
              </div>
            </>
          )}
        </div>

        {!hasInsufficientStock && (
          <div className="rounded-md border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label htmlFor="with-invoice" className="text-sm font-medium">
                  Emitir factura
                </Label>
                <p className="text-xs text-muted-foreground">
                  {withInvoice
                    ? 'Se emitira una factura con numero correlativo.'
                    : 'Se entregara un recibo simple, sin factura.'}
                </p>
              </div>
              <Switch
                id="with-invoice"
                checked={withInvoice}
                onCheckedChange={onWithInvoiceChange}
                disabled={isProcessing}
              />
            </div>

            {withInvoice && (
              <div className="mt-2 border-t pt-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Razon social</span>
                  <span className="font-medium truncate">{clientName?.trim() || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">NIT / CI</span>
                  <span className="font-mono font-medium">{clientNit?.trim() || '—'}</span>
                </div>
              </div>
            )}

            {missingInvoiceData && (
              <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Faltan datos para facturar
                </p>
                <p className="mt-0.5">
                  Una factura necesita la razon social y el NIT o CI del cliente.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={onEditCustomer}
                  disabled={isProcessing}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  Agregar datos del cliente
                </Button>
              </div>
            )}
          </div>
        )}

        {hasInsufficientStock && (
          <div className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            Algunos productos no tienen stock suficiente todavia. Puedes continuar como venta adelantada:
            se registrara un anticipo y el resto se cobrara al entregar. Las ventas adelantadas se
            facturan al entregarlas, desde el historial.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Volver
          </Button>
          {hasInsufficientStock ? (
            <Button onClick={onGoToAdvanceSale} disabled={isProcessing}>
              Continuar como venta adelantada
            </Button>
          ) : (
            <Button onClick={onConfirm} disabled={isProcessing || missingInvoiceData}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y cobrar {formatCurrency(total)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
