'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RotateCcw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productsApi, type ProductDto } from '@/lib/api/products';

interface DeletedProductsTabProps {
  onRestored?: () => void;
}

export function DeletedProductsTab({ onRestored }: DeletedProductsTabProps) {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await productsApi.listDeleted();
      setProducts(data);
    } catch {
      setError('No se pudieron cargar los productos eliminados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    setError('');
    try {
      await productsApi.restore(id);
      await loadData();
      onRestored?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al restaurar el producto');
    } finally {
      setRestoringId(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Productos eliminados</h3>
        <p className="text-sm text-muted-foreground">
          Papelera. Restaura productos eliminados accidentalmente.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    La papelera está vacía
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category || '—'}
                    </TableCell>
                    <TableCell>{formatCurrency(product.salePrice)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(product.id)}
                        disabled={restoringId === product.id}
                      >
                        {restoringId === product.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Restaurar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
