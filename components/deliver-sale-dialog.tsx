'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  credit: 'Credito',
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Entregar venta {sale.saleNumber}
          </DialogTitle>
          <DialogDescription>
            Al entregar se descuenta el stock reservado. {hasBalance
              ? 'Registra el cobro del saldo pendiente.'
              : 'Esta venta ya esta pagada por completo.'}
          </DialogDescription>
        </DialogHeader>

        {(error || localError) && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {localError ?? error}
          </div>
        )}

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

        {hasBalance && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deliver-amount">Monto a cobrar *</Label>
              <Input
                id="deliver-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliver-method">Metodo de pago *</Label>
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
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Entregando...' : hasBalance ? 'Cobrar y entregar' : 'Entregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
