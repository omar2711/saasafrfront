'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { purchaseOrdersApi, type OpenPurchaseOrderLineDto } from '@/lib/api/purchase-orders';
import type { PaymentMethod } from '@/lib/api/sales';

export interface InsufficientCartItem {
  productId: string;
  name: string;
  quantity: number;
  needed: number;
  available: number;
}

interface AdvanceSaleDialogProps {
  isOpen: boolean;
  items: InsufficientCartItem[];
  branchId?: string;
  total: number;
  isSaving?: boolean;
  formatCurrency: (value: number) => string;
  onConfirm: (reservations: Record<string, string>, deposit: { amount: number; method: PaymentMethod }) => void;
  onCancel: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
];

export function AdvanceSaleDialog({
  isOpen,
  items,
  branchId,
  total,
  isSaving,
  formatCurrency,
  onConfirm,
  onCancel,
}: AdvanceSaleDialogProps) {
  const [optionsByProduct, setOptionsByProduct] = useState<Record<string, OpenPurchaseOrderLineDto[]>>({});
  const [selectedPo, setSelectedPo] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDepositAmount('');
      setSelectedPo({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !branchId) return;
    setIsLoading(true);
    setError('');
    Promise.all(
      items.map((item) =>
        purchaseOrdersApi
          .getProductAvailability({ productId: item.productId, branchId })
          .then((lines) => [item.productId, lines] as const),
      ),
    )
      .then((results) => {
        const map: Record<string, OpenPurchaseOrderLineDto[]> = {};
        results.forEach(([productId, lines]) => { map[productId] = lines; });
        setOptionsByProduct(map);
      })
      .catch(() => setError('No se pudieron cargar las ordenes de compra abiertas'))
      .finally(() => setIsLoading(false));
  }, [isOpen, branchId, items]);

  const depositAmountNum = parseFloat(depositAmount);
  const hasValidDeposit = !Number.isNaN(depositAmountNum) && depositAmountNum > 0;
  const depositError = !depositAmount
    ? null
    : Number.isNaN(depositAmountNum) || depositAmountNum <= 0
    ? 'Ingresa un anticipo mayor a 0'
    : depositAmountNum > total
    ? `El anticipo no puede ser mayor al total de la venta (${formatCurrency(total)})`
    : null;

  const itemsReady =
    items.length > 0 &&
    items.every((item) => {
      const poId = selectedPo[item.productId];
      const lines = optionsByProduct[item.productId] ?? [];
      const line = lines.find((l) => l.purchaseOrderId === poId);
      return line && line.availableQty >= item.needed;
    });

  const canSubmit = !isLoading && itemsReady && hasValidDeposit && depositAmountNum <= total;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(selectedPo, { amount: depositAmountNum, method: depositMethod });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Venta adelantada</DialogTitle>
          <DialogDescription>
            Estos productos no tienen stock suficiente. Puedes reservarlos contra una orden de compra
            abierta y registrar un anticipo; el resto se cobrara al entregar.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {items.map((item) => {
              const lines = optionsByProduct[item.productId] ?? [];
              return (
                <div key={item.productId} className="space-y-1.5">
                  <Label>
                    {item.name} — necesitas {item.needed}, hay {item.available} en stock
                  </Label>
                  {lines.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      No hay ordenes de compra abiertas para este producto
                    </p>
                  ) : (
                    <Select
                      value={selectedPo[item.productId] ?? ''}
                      onValueChange={(v) => setSelectedPo((prev) => ({ ...prev, [item.productId]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una orden de compra" />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map((line) => (
                          <SelectItem
                            key={line.purchaseOrderId}
                            value={line.purchaseOrderId}
                            disabled={line.availableQty < item.needed}
                          >
                            {line.orderNumber} — {line.availableQty} disponibles
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label>Anticipo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={total}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  aria-invalid={Boolean(depositError)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metodo</Label>
                <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {depositError && (
              <p className="text-sm text-destructive">{depositError}</p>
            )}
            {!depositError && hasValidDeposit && depositAmountNum <= total && (
              <p className="text-sm text-muted-foreground">
                Saldo pendiente al entregar: {formatCurrency(total - depositAmountNum)}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={!canSubmit || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar reserva
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
