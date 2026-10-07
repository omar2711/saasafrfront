'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lockedKind === 'baja' ? 'Registrar baja' : 'Ajustar stock'} - {product.name}
          </DialogTitle>
          <DialogDescription>
            Stock actual: <span className="font-bold">{currentStock}</span> {product.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!lockedKind && (
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de movimiento *</Label>
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
            </div>
          )}

          {adjustType === 'ajuste' && (
            <div className="space-y-2">
              <Label htmlFor="direction">Direccion del ajuste *</Label>
              <Select value={direction} onValueChange={(val) => setDirection(val as 'increase' | 'decrease')}>
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Aumentar stock</SelectItem>
                  <SelectItem value="decrease">Disminuir stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ingresa la cantidad"
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo / referencia *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                adjustType === 'baja'
                  ? 'Ej: Producto dañado en almacen, caja mojada, vencido...'
                  : 'Ej: Devolucion cliente, merma, error de inventario...'
              }
              className={`resize-none ${errors.reason ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="font-bold">{currentStock}</span>
            </p>
            {hasValidQuantity && (
              <p className="text-sm mt-2">
                Nuevo stock:
                <span className={`font-bold ml-2 ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                  {nextStock}
                </span>
                <span className="text-muted-foreground ml-2">
                  ({isNegative ? '−' : '+'}{parsedQuantity})
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : adjustType === 'baja'
                ? 'Confirmar baja'
                : 'Confirmar ajuste'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
