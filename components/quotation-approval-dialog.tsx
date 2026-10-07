'use client';

import { Quote } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface ApprovalDialogProps {
  quote: Quote | null;
  isOpen: boolean;
  isLoading?: boolean;
  stockWarnings?: Array<{ productId: string; productName: string; available: number; requested: number }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QuotationApprovalDialog({
  quote,
  isOpen,
  isLoading = false,
  stockWarnings = [],
  onConfirm,
  onCancel,
}: ApprovalDialogProps) {
  if (!quote) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const hasStockWarnings = stockWarnings.length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Aprobar Presupuesto</AlertDialogTitle>
          <AlertDialogDescription>
            {quote.quoteNumber} • {quote.clientName}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Stock Warnings */}
          {hasStockWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-yellow-900">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold text-sm">Advertencia de Stock</span>
              </div>
              <div className="space-y-1 text-sm text-yellow-800">
                {stockWarnings.map((warning) => (
                  <div key={warning.productId} className="text-xs">
                    <span className="font-medium">{warning.productName}:</span> Se requieren{' '}
                    <span className="font-semibold">{warning.requested}</span> unidades pero solo hay{' '}
                    <span className="font-semibold">{warning.available}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Resumen del Presupuesto</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Productos:</span>
                <Badge variant="secondary">{quote.items.length} items</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cantidad total:</span>
                <span className="font-medium">
                  {quote.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Monto:</span>
                <span className="font-bold text-lg">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="text-sm font-semibold text-blue-900">Cuando apruebas este presupuesto:</div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex gap-2">
                <span className="flex-shrink-0">✓</span>
                <span>Se crea automáticamente una venta</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0">✓</span>
                <span>Se reduce el inventario</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0">✓</span>
                <span>Se actualiza el reporte de ventas</span>
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading || hasStockWarnings}
            className={hasStockWarnings ? 'cursor-not-allowed opacity-50' : ''}
          >
            {isLoading ? 'Aprobando...' : 'Aprobar Presupuesto'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
