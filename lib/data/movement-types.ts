import type { MovementType } from '@/lib/api/inventory';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  transfer_in: 'Traspaso (entrada)',
  transfer_out: 'Traspaso (salida)',
  adjustment: 'Ajuste (entrada)',
  adjustment_out: 'Ajuste (salida)',
  return: 'Devolucion',
  damage: 'Baja por dano',
};

export const MOVEMENT_TYPES = Object.keys(MOVEMENT_LABELS) as MovementType[];
