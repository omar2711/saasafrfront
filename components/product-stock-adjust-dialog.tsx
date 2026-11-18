'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SlidersHorizontal } from 'lucide-react';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormField } from '@/components/form-layout';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ProductDto } from '@/lib/api/products';
import { NEGATIVE_MOVEMENT_TYPES, type MovementType } from '@/lib/api/inventory';

export type StockAdjustKind = 'entrada' | 'salida' | 'baja' | 'ajuste';

export interface StockAdjustPayload {
  quantity: number;
  movementType: MovementType;
  reason: string;
}

interface ProductStockAdjustDialogProps {
  isOpen: boolean;
  product: ProductDto | null;
  stock?: number;
  /** Fija el tipo de movimiento y oculta el selector (ej: registrar baja desde la pestana Bajas). */
  lockedKind?: StockAdjustKind;
  isSubmitting?: boolean;
  onConfirm: (payload: StockAdjustPayload) => void;
  onCancel: () => void;
}

const KIND_LABELS: Record<StockAdjustKind, string> = {
  entrada: 'Entrada (compra / devolucion)',
  salida: 'Salida (venta manual / perdida)',
  baja: 'Baja por dano / merma / perdida',
  ajuste: 'Ajuste (correccion de inventario)',
};

/**
 * El signo lo determina el tipo de movimiento que se manda al backend, no la
 * cantidad (que siempre viaja positiva). Antes la pagina mandaba siempre
 * 'adjustment' con Math.abs(), asi que una salida terminaba sumando stock.
 */
function resolveMovementType(kind: StockAdjustKind, direction: 'increase' | 'decrease'): MovementType {
  switch (kind) {
    case 'entrada':
      return 'adjustment';
    case 'salida':
    case 'baja':
      return kind === 'baja' ? 'damage' : 'adjustment_out';
    case 'ajuste':
      return direction === 'increase' ? 'adjustment' : 'adjustment_out';
  }
}

export function ProductStockAdjustDialog({
  isOpen,
  product,
  stock = 0,
  lockedKind,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ProductStockAdjustDialogProps) {
  const [adjustType, setAdjustType] = useState<StockAdjustKind>(lockedKind ?? 'entrada');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Al reabrir el dialogo se limpia el formulario para no arrastrar el ajuste previo.
  useEffect(() => {
    if (isOpen) {
      setAdjustType(lockedKind ?? 'entrada');
      setDirection('decrease');
      setQuantity('');
      setReason('');
      setErrors({});
    }
  }, [isOpen, lockedKind]);

  if (!product) return null;

  const currentStock = stock;
  const movementType = resolveMovementType(adjustType, direction);
  const isNegative = NEGATIVE_MOVEMENT_TYPES.includes(movementType);
  const parsedQuantity = Number(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const nextStock = hasValidQuantity
    ? currentStock + (isNegative ? -parsedQuantity : parsedQuantity)
    : currentStock;

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!hasValidQuantity) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    } else if (isNegative && parsedQuantity > currentStock) {
      newErrors.quantity = `No hay suficiente stock. Disponible: ${currentStock}`;
    }

    if (!reason.trim()) {
      newErrors.reason = 'Debes indicar el motivo del movimiento';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm({ quantity: parsedQuantity, movementType, reason: reason.trim() });
    }
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      icon={SlidersHorizontal}
      title={`${lockedKind === 'baja' ? 'Registrar baja' : 'Ajustar stock'} - ${product.name}`}
      description={`Stock actual: ${currentStock} ${product.unit}`}
      size="md"
      submitLabel={adjustType === 'baja' ? 'Confirmar baja' : 'Confirmar ajuste'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    >
      <FormSection icon={SlidersHorizontal} title="Movimiento">
        {!lockedKind && (
          <FormField label="Tipo de movimiento" htmlFor="type" required>
            <Select value={adjustType} onValueChange={(val) => setAdjustType(val as StockAdjustKind)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as StockAdjustKind[]).map((kind) => (
                  <SelectItem key={kind} value={kind}>{KIND_LABELS[kind]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {adjustType === 'ajuste' && (
          <FormField label="Dirección del ajuste" htmlFor="direction" required>
            <Select value={direction} onValueChange={(val) => setDirection(val as 'increase' | 'decrease')}>
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Aumentar stock</SelectItem>
                <SelectItem value="decrease">Disminuir stock</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        )}

        <FormField label="Cantidad" htmlFor="quantity" required error={errors.quantity}>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Ingresa la cantidad"
            aria-invalid={Boolean(errors.quantity)}
            className={errors.quantity ? 'border-destructive' : ''}
          />
        </FormField>
      </FormSection>

      <FormSection icon={SlidersHorizontal} title="Detalle">
        <FormField label="Motivo / referencia" htmlFor="reason" required error={errors.reason}>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              adjustType === 'baja'
                ? 'Ej: Producto dañado en almacén, caja mojada, vencido...'
                : 'Ej: Devolución cliente, merma, error de inventario...'
            }
            aria-invalid={Boolean(errors.reason)}
            className={`resize-none ${errors.reason ? 'border-destructive' : ''}`}
            rows={3}
          />
        </FormField>

        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Stock actual: <span className="font-bold">{currentStock}</span>
          </p>
          {hasValidQuantity && (
            <p className="mt-2 text-sm">
              Nuevo stock:
              <span className={`ml-2 font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                {nextStock}
              </span>
              <span className="ml-2 text-muted-foreground">
                ({isNegative ? '−' : '+'}{parsedQuantity})
              </span>
            </p>
          )}
        </div>
      </FormSection>
    </FormDialog>
  );
}
