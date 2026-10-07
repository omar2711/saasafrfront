'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
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
import { DeliverSaleDialog } from '@/components/deliver-sale-dialog';
import { salesApi, type PaymentMethod, type SaleDto } from '@/lib/api/sales';
import { resolveSaleClient } from '@/lib/utils/sale-client';
import { useOrganization } from '@/contexts/organization-context';
import { formatDate } from '@/lib/format';

export default function PendingDeliverySalesPage() {
  const { branches, hasPermission } = useOrganization();
  const canDeliver = hasPermission('sales.deliver');
  const [sales, setSales] = useState<SaleDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [deliveringSale, setDeliveringSale] = useState<SaleDto | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // `depositTotal` viene ya calculado en el listado: antes se hacia un GET por
      // venta solo para sumar los pagos.
      setSales(await salesApi.list({ status: 'pending_delivery' }));
    } catch {
      setError('No se pudieron cargar las ventas pendientes de entrega');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(value);

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const handleDeliver = async (payment?: { amount: number; method: PaymentMethod }) => {
    if (!deliveringSale) return;
    setIsDelivering(true);
    setDeliverError(null);
    try {
      await salesApi.deliver(deliveringSale.id, payment ? { payment } : undefined);
      setDeliveringSale(null);
      await loadData();
    } catch (e: unknown) {
      setDeliverError(e instanceof Error ? e.message : 'Error al entregar la venta');
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas pendientes de entrega"
        description="Ventas adelantadas con anticipo, a la espera de que llegue el stock reservado"
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº venta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Anticipo / Total</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Fecha</TableHead>
                {canDeliver && <TableHead className="w-[140px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No hay ventas pendientes de entrega
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => {
                  const client = resolveSaleClient(sale);
                  const deposit = sale.depositTotal ?? 0;
                  const balanceDue = Math.max(0, sale.total - deposit);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                      <TableCell>
                        <div>{client.name ?? 'Consumidor final'}</div>
                        {client.nit && (
                          <div className="text-xs text-muted-foreground font-mono">{client.nit}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sale.branchName ?? getBranchName(sale.branchId)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{formatCurrency(deposit)}</span>
                        <span className="text-muted-foreground"> / {formatCurrency(sale.total)}</span>
                      </TableCell>
                      <TableCell className={balanceDue > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                        {formatCurrency(balanceDue)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sale.createdAt)}
                      </TableCell>
                      {canDeliver && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setDeliverError(null); setDeliveringSale(sale); }}
                          >
                            <PackageCheck className="mr-2 h-4 w-4" />
                            Entregar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeliverSaleDialog
        isOpen={!!deliveringSale}
        sale={deliveringSale}
        isSubmitting={isDelivering}
        error={deliverError}
        formatCurrency={formatCurrency}
        onConfirm={handleDeliver}
        onCancel={() => { setDeliveringSale(null); setDeliverError(null); }}
      />
    </div>
  );
}
