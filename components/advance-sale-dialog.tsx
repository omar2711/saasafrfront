'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, PackageCheck, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
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
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      icon={PackageCheck}
      title="Venta adelantada"
      description="Estos productos no tienen stock suficiente. Reserva contra una orden de compra abierta y registra un anticipo; el resto se cobra al entregar."
      submitLabel="Confirmar reserva"
      onSubmit={handleConfirm}
      isSubmitting={Boolean(isSaving)}
      submitDisabled={!canSubmit}
      error={error || null}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <FormSection icon={PackageCheck} title="Productos a reservar">
            {items.map((item) => {
              const lines = optionsByProduct[item.productId] ?? [];
              return (
                <FormField
                  key={item.productId}
                  label={item.name}
                  hint={`Necesitas ${item.needed}, hay ${item.available} en stock`}
                >
                  {lines.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      No hay órdenes de compra abiertas para este producto
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
                </FormField>
              );
            })}
          </FormSection>

          <FormSection icon={Wallet} title="Anticipo">
            <FormGrid>
              <FormField
                label="Anticipo"
                error={depositError}
                hint={
                  !depositError && hasValidDeposit && depositAmountNum <= total
                    ? `Saldo pendiente al entregar: ${formatCurrency(total - depositAmountNum)}`
                    : undefined
                }
              >
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
              </FormField>
              <FormField label="Método de pago">
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
              </FormField>
            </FormGrid>
          </FormSection>
        </>
      )}
    </FormDialog>
  );
}
