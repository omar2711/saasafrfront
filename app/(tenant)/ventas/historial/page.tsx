'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, Eye, Ban, Undo2, Loader2, Package, Package2, Receipt, History, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { salesApi, type PaymentMethod, type SaleDto, type SaleStatus } from '@/lib/api/sales';
import { resolveSaleClient } from '@/lib/utils/sale-client';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { SaleReturnDialog } from '@/components/sale-return-dialog';
import { SaleReturnsListDialog } from '@/components/sale-returns-list-dialog';
import { SaleReceiptDialog, type SaleReceiptData } from '@/components/sale-receipt-dialog';
import { useOrganization } from '@/contexts/organization-context';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUS_MAP: Record<SaleStatus, { status: 'draft' | 'success' | 'inactive' | 'warning' | 'pending'; label: string }> = {
  draft: { status: 'draft', label: 'Borrador' },
  completed: { status: 'success', label: 'Completada' },
  voided: { status: 'inactive', label: 'Anulada' },
  refunded: { status: 'warning', label: 'Reembolsada' },
  pending_delivery: { status: 'pending', label: 'Entrega pendiente' },
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Credito',
  other: 'Otro',
};

export default function SalesHistoryPage() {
  const { organization, branches, hasPermission } = useOrganization();
  const canVoid = hasPermission('sales.void');
  const canReturn = hasPermission('sales.return');

  const [sales, setSales] = useState<SaleDto[]>([]);
  const [productMap, setProductMap] = useState<Record<string, ProductDto>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [detailSale, setDetailSale] = useState<SaleDto | null>(null);
  const [returnSale, setReturnSale] = useState<SaleDto | null>(null);
  const [returnsListSale, setReturnsListSale] = useState<SaleDto | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidingSale, setVoidingSale] = useState<SaleDto | null>(null);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<SaleReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [list, products] = await Promise.all([salesApi.list(), productsApi.list()]);
      setSales(list);
      setProductMap(Object.fromEntries(products.map((p) => [p.id, p])));
    } catch {
      setError('No se pudieron cargar las ventas');
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

  const resolveClient = resolveSaleClient;

  const filteredSales = sales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    const client = resolveClient(sale);
    const matchSearch =
      sale.saleNumber.toLowerCase().includes(term) ||
      (client.name ?? '').toLowerCase().includes(term) ||
      (client.nit ?? '').toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openDetail = async (sale: SaleDto) => {
    try {
      const full = await salesApi.get(sale.id);
      setDetailSale(full);
    } catch {
      setError('No se pudo cargar el detalle de la venta');
    }
  };

  const resolveItemName = (item: NonNullable<SaleDto['items']>[number]) =>
    item.kitName ||
    item.productName ||
    (item.productId && productMap[item.productId]?.name) ||
    'Producto eliminado';

  const buildReceiptData = (sale: SaleDto): SaleReceiptData => {
    // Una venta ya entregada no es "adelantada" solo por tener deliveredAt: lo que
    // la distingue es haberse cobrado en mas de un pago (anticipo + saldo).
    const isAdvanceSale =
      sale.status === 'pending_delivery' ||
      (!!sale.deliveredAt && (sale.payments?.length ?? 0) > 1);
    const client = resolveClient(sale);
    const deposit = sale.depositTotal ?? 0;
    return {
      saleNumber: sale.saleNumber,
      soldAt: sale.soldAt,
      companyName: organization?.name ?? 'Mi Empresa',
      companyTaxId: organization?.taxId ?? null,
      companyAddress: organization?.address ?? null,
      companyPhone: organization?.phone ?? null,
      advanceSaleTerms: organization?.advanceSaleTerms ?? null,
      // La reimpresion tiene que salir igual que el documento original.
      documentType: sale.documentType ?? 'receipt',
      invoiceNumber: sale.invoice?.invoiceNumber ?? sale.invoiceNumber ?? null,
      branchName: sale.branchName ?? getBranchName(sale.branchId),
      cashierName: sale.soldByName ?? undefined,
      clientName: client.name,
      clientNit: client.nit,
      clientPhone: client.phone,
      paymentMethod: sale.paymentMethod ?? 'cash',
      isAdvanceSale,
      items: (sale.items ?? []).map((item) => ({
        name: resolveItemName(item),
        quantity: item.quantity,
        price: item.unitPrice,
        pendingQty: sale.status === 'pending_delivery' ? item.quantity : 0,
      })),
      subtotal: sale.subtotal,
      tax: sale.taxTotal,
      total: sale.total,
      // Solo tiene sentido mostrar Anticipo/Saldo si el cobro fue parcial.
      depositAmount: isAdvanceSale && deposit > 0 && deposit < sale.total ? deposit : undefined,
    };
  };

  const openReceipt = async (sale: SaleDto) => {
    try {
      const full = sale.items ? sale : await salesApi.get(sale.id);
      setReceiptData(buildReceiptData(full));
      setIsReceiptOpen(true);
    } catch {
      setError('No se pudo cargar el recibo de la venta');
    }
  };

  const handleVoid = async () => {
    const sale = voidingSale;
    if (!sale) return;
    setVoidingId(sale.id);
    setError('');
    try {
      await salesApi.void(sale.id);
      setVoidingSale(null);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al anular la venta');
      setVoidingSale(null);
    } finally {
      setVoidingId(null);
    }
  };

  const canVoidSale = (sale: SaleDto) =>
    canVoid && (sale.status === 'completed' || sale.status === 'pending_delivery');

  // Facturar despues de haber cobrado con recibo: el cliente vuelve y la pide.
  const canInvoiceSale = (sale: SaleDto) =>
    sale.status === 'completed' && sale.documentType !== 'invoice' && !sale.invoiceNumber;

  const handleInvoice = async (sale: SaleDto) => {
    setInvoicingId(sale.id);
    setError('');
    try {
      await salesApi.createInvoice(sale.id);
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo emitir la factura');
    } finally {
      setInvoicingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de Ventas" description="Consulta, anula o devuelve ventas registradas" />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Dialog open={!!detailSale} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Venta {detailSale?.saleNumber}</DialogTitle>
              {detailSale && (
                <Button variant="outline" size="sm" onClick={() => openReceipt(detailSale)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Ver recibo
                </Button>
              )}
            </div>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{resolveClient(detailSale).name ?? 'Consumidor final'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">CI / NIT</p>
                  <p className="font-medium font-mono">{resolveClient(detailSale).nit ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Telefono</p>
                  <p className="font-medium">{resolveClient(detailSale).phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Sucursal</p>
                  <p className="font-medium">{detailSale.branchName ?? getBranchName(detailSale.branchId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vendedor</p>
                  <p className="font-medium">{detailSale.soldByName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Metodo de pago</p>
                  <p className="font-medium">
                    {detailSale.paymentMethod
                      ? PAYMENT_METHOD_LABELS[detailSale.paymentMethod]
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha</p>
                  <p className="font-medium">{formatDateTime(detailSale.soldAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <StatusBadge
                    status={STATUS_MAP[detailSale.status].status}
                    label={STATUS_MAP[detailSale.status].label}
                  />
                </div>
              </div>
              <div className="rounded-lg border divide-y">
                {(detailSale.items ?? []).map((item) => {
                  const isKit = !!item.kitName;
                  const label = resolveItemName(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
                          {isKit ? (
                            <Package2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(item.total)}</span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(detailSale.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SaleReturnsListDialog
        isOpen={!!returnsListSale}
        sale={returnsListSale}
        canVoid={canReturn}
        onClose={() => setReturnsListSale(null)}
        onChanged={loadData}
      />

      <SaleReturnDialog
        isOpen={!!returnSale}
        sale={returnSale}
        productMap={productMap}
        onSuccess={() => { setReturnSale(null); loadData(); }}
        onCancel={() => setReturnSale(null)}
      />

      <SaleReceiptDialog
        isOpen={isReceiptOpen}
        sale={receiptData}
        formatCurrency={formatCurrency}
        onClose={() => setIsReceiptOpen(false)}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero, cliente o CI/NIT..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_MAP).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº venta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No hay ventas
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">
                      {sale.saleNumber}
                      {sale.documentType === 'invoice' && (
                        <div className="mt-0.5">
                          <Badge
                            variant="secondary"
                            className={
                              sale.invoiceStatus === 'voided'
                                ? 'bg-muted text-muted-foreground line-through'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            }
                          >
                            {sale.invoiceNumber ?? 'Factura'}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{resolveClient(sale).name ?? 'Consumidor final'}</div>
                      {resolveClient(sale).nit && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {resolveClient(sale).nit}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.branchName ?? getBranchName(sale.branchId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sale.itemCount ?? sale.items?.length ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={STATUS_MAP[sale.status].status} label={STATUS_MAP[sale.status].label} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sale.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(sale)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openReceipt(sale)}>
                            <Receipt className="mr-2 h-4 w-4" />
                            {sale.documentType === 'invoice'
                              ? 'Ver / imprimir factura'
                              : 'Ver / imprimir recibo'}
                          </DropdownMenuItem>
                          {canInvoiceSale(sale) && (
                            <DropdownMenuItem
                              onClick={() => handleInvoice(sale)}
                              disabled={invoicingId === sale.id}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Emitir factura
                            </DropdownMenuItem>
                          )}
                          {sale.status === 'completed' && canReturn && (
                            <DropdownMenuItem onClick={async () => setReturnSale(await salesApi.get(sale.id))}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              Devolver
                            </DropdownMenuItem>
                          )}
                          {canReturn && (
                            <DropdownMenuItem onClick={() => setReturnsListSale(sale)}>
                              <History className="mr-2 h-4 w-4" />
                              Devoluciones de esta venta
                            </DropdownMenuItem>
                          )}
                          {canVoidSale(sale) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setVoidingSale(sale)}
                                disabled={voidingId === sale.id}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Anular
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!voidingSale} onOpenChange={(open) => !open && setVoidingSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular venta {voidingSale?.saleNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              {voidingSale?.status === 'pending_delivery'
                ? 'Esta venta todavia no descontó stock, así que no se repondrá nada. El anticipo cobrado no se devuelve automáticamente.'
                : 'Se repondrá el stock de todos los productos de la venta. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anular venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
