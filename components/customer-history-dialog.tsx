'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { customersApi, type CustomerDto, type CustomerHistoryDto } from '@/lib/api/customers';
import { formatDate } from '@/lib/format';

interface CustomerHistoryDialogProps {
  isOpen: boolean;
  customer: CustomerDto | null;
  onClose: () => void;
}

const SALE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  completed: 'Completada',
  voided: 'Anulada',
  refunded: 'Reembolsada',
  pending_delivery: 'Entrega pendiente',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  sent: 'Enviada',
  approved: 'Aprobada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(value);

export function CustomerHistoryDialog({ isOpen, customer, onClose }: CustomerHistoryDialogProps) {
  const [history, setHistory] = useState<CustomerHistoryDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setIsLoading(true);
    setError(null);
    setHistory(null);
    customersApi
      .history(customer.id)
      .then(setHistory)
      .catch(() => setError('No se pudo cargar el historial del cliente'))
      .finally(() => setIsLoading(false));
  }, [isOpen, customer]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de {customer?.name}</DialogTitle>
          <DialogDescription>
            {customer?.taxId ? `CI/NIT: ${customer.taxId}` : 'Sin CI/NIT registrado'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        {isLoading || !history ? (
          !error && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(history.summary.salesTotal)}</div>
                  <p className="text-sm text-muted-foreground">Total comprado</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{history.summary.salesCount}</div>
                  <p className="text-sm text-muted-foreground">Compras</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatDate(history.summary.lastPurchaseAt)}</div>
                  <p className="text-sm text-muted-foreground">Ultima compra</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="ventas">
              <TabsList>
                <TabsTrigger value="ventas">Ventas ({history.sales.length})</TabsTrigger>
                <TabsTrigger value="cotizaciones">Cotizaciones ({history.quotes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ventas">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N.º venta</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.sales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Este cliente todavia no tiene compras
                            </TableCell>
                          </TableRow>
                        ) : (
                          history.sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{sale.branchName ?? '—'}</TableCell>
                              <TableCell><Badge variant="secondary">{sale.itemCount}</Badge></TableCell>
                              <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                              <TableCell className="text-sm">
                                {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(sale.soldAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cotizaciones">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N.º cotizacion</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Valida hasta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.quotes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Este cliente todavia no tiene cotizaciones
                            </TableCell>
                          </TableRow>
                        ) : (
                          history.quotes.map((quote) => (
                            <TableRow key={quote.id}>
                              <TableCell className="font-mono text-sm">{quote.quoteNumber}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{quote.branchName ?? '—'}</TableCell>
                              <TableCell><Badge variant="secondary">{quote.itemCount}</Badge></TableCell>
                              <TableCell className="font-semibold">{formatCurrency(quote.total)}</TableCell>
                              <TableCell className="text-sm">
                                {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(quote.validUntil)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
