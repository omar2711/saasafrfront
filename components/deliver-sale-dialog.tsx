'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaymentMethod, SaleDto } from '@/lib/api/sales';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  other: 'Otro',
};

interface DeliverSaleDialogProps {
  isOpen: boolean;
  sale: SaleDto | null;
  isSubmitting?: boolean;
  error?: string | null;
  formatCurrency: (value: number) => string;
  onConfirm: (payment?: { amount: number; method: PaymentMethod }) => void;
  onCancel: () => void;
}

export function DeliverSaleDialog({
  isOpen,
  sale,
  isSubmitting = false,
  error,
  formatCurrency,
  onConfirm,
  onCancel,
}: DeliverSaleDialogProps) {
  const deposit = sale?.depositTotal ?? 0;
  const balanceDue = sale ? Math.max(0, sale.total - deposit) : 0;

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount(balanceDue > 0 ? String(balanceDue) : '');
      setMethod('cash');
      setLocalError(null);
    }
    // balanceDue depende de `sale`, que solo cambia al abrir el dialogo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.id]);

  if (!sale) return null;

  const parsedAmount = Number(amount);
  const hasBalance = balanceDue > 0;

  const handleConfirm = () => {
    if (!hasBalance) {
      onConfirm();
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setLocalError('Ingresa el monto a cobrar');
      return;
    }
    if (parsedAmount > balanceDue) {
      setLocalError(`El cobro no puede superar el saldo pendiente (${formatCurrency(balanceDue)})`);
      return;
    }
    setLocalError(null);
    onConfirm({ amount: parsedAmount, method });
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      icon={Truck}
      title={`Entregar venta ${sale.saleNumber}`}
      description={
        hasBalance
          ? 'Al entregar se descuenta el stock reservado. Registra el cobro del saldo pendiente.'
          : 'Al entregar se descuenta el stock reservado. Esta venta ya está pagada por completo.'
      }
      size="md"
      submitLabel={hasBalance ? 'Cobrar y entregar' : 'Entregar'}
      onSubmit={handleConfirm}
      isSubmitting={isSubmitting}
      error={localError ?? error ?? null}
    >
      <FormSection icon={Truck} title="Resumen de la venta">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Anticipo pagado</span>
            <span>{formatCurrency(deposit)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Saldo pendiente</span>
            <span className={hasBalance ? 'text-primary' : ''}>{formatCurrency(balanceDue)}</span>
          </div>
        </div>
      </FormSection>

      {hasBalance && (
        <FormSection icon={Truck} title="Cobro del saldo">
          <FormGrid>
            <FormField label="Monto a cobrar" htmlFor="deliver-amount" required>
              <Input
                id="deliver-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>
            <FormField label="Método de pago" htmlFor="deliver-method" required>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger id="deliver-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((key) => (
                    <SelectItem key={key} value={key}>{PAYMENT_METHOD_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>
      )}
    </FormDialog>
  );
}
