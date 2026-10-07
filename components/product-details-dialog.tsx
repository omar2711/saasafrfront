'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type ProductDto } from '@/lib/api/products';
import { Package, AlertCircle } from 'lucide-react';

interface ProductDetailsDialogProps {
  isOpen: boolean;
  product: ProductDto | null;
  stock?: number;
  minStock?: number;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  `Bs ${value.toLocaleString('es-BO')}`;

export function ProductDetailsDialog({ isOpen, product, stock = 0, minStock = 0, onClose }: ProductDetailsDialogProps) {
  if (!product) return null;

  const margin = product.salePrice > 0 && product.costPrice
    ? ((product.salePrice - product.costPrice) / product.salePrice) * 100
    : 0;
  const isLowStock = stock < minStock;

  const statusLabel = product.status === 'active'
    ? 'Activo'
    : product.status === 'pending_pricing'
    ? 'Pendiente de precio'
    : 'Inactivo';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </DialogTitle>
          <DialogDescription>
            Identificador: {product.sku} | Categoría: {product.category ?? '-'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stock Actual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stock}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock mínimo: {minStock}
                  </p>
                  {isLowStock && (
                    <Badge variant="destructive" className="mt-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Bajo stock
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-lg">
                    {statusLabel}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Descripción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{product.description || 'Sin descripción'}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="precios" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Precio de Compra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(product.costPrice ?? 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Precio de Venta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(product.salePrice)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Margen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {margin.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
