'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { inventoryApi, NEGATIVE_MOVEMENT_TYPES, type MovementDto } from '@/lib/api/inventory';
import { MOVEMENT_LABELS } from '@/lib/data/movement-types';
import { type ProductDto } from '@/lib/api/products';
import { Package, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

interface ProductMovementsDialogProps {
  isOpen: boolean;
  product: ProductDto | null;
  branchId?: string;
  onClose: () => void;
}


export function ProductMovementsDialog({ isOpen, product, branchId, onClose }: ProductMovementsDialogProps) {
  const [movements, setMovements] = useState<MovementDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) return;
    setIsLoading(true);
    setError(null);
    inventoryApi.listMovements({ branchId, productId: product.id })
      .then(setMovements)
      .catch(() => setError('Error al cargar movimientos'))
      .finally(() => setIsLoading(false));
  }, [isOpen, product, branchId]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Movimientos - {product.name}
          </DialogTitle>
          <DialogDescription>Identificador: {product.sku}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando movimientos...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!isLoading && !error && movements.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay movimientos registrados.</p>
        )}

        <div className="space-y-2">
          {movements.map((mov) => {
            const isPositive = !NEGATIVE_MOVEMENT_TYPES.includes(mov.movementType);
            return (
              <Card key={mov.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isPositive ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{MOVEMENT_LABELS[mov.movementType] ?? mov.movementType}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(mov.createdAt)}
                          {mov.createdByName ? ` · ${mov.createdByName}` : ''}
                          {mov.referenceId ? ` - ${mov.referenceType ?? ''} ${mov.referenceId}` : ''}
                        </p>
                        {mov.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{mov.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}{mov.quantity}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
