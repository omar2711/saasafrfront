'use client';

import { getBaseCurrency } from '@/lib/format';
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, FileText, FileDown, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { quotesApi, type QuoteDto } from '@/lib/api/quotes';
import { QuotationForm, type QuotationFormData } from '@/components/quotation-form';
import { QuotationPreview } from '@/components/quotation-preview';
import { useOrganization, useSystemSettings } from '@/contexts/organization-context';
import { formatDate } from '@/lib/format';
import { exportQuotePdf } from '@/lib/pdf/quote-pdf';

const statusMap: Record<string, 'draft' | 'pending' | 'success' | 'active' | 'inactive' | 'warning'> = {
  pending: 'draft',
  sent: 'pending',
  approved: 'pending',
  accepted: 'success',
  rejected: 'inactive',
  expired: 'warning',
  converted: 'active',
};

const statusLabels: Record<string, string> = {
  pending: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  converted: 'Convertida',
};

function validityInfo(validUntil?: string | null) {
  if (!validUntil) return null;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: 'Vencida', tone: 'text-destructive' };
  if (days === 0) return { text: 'Vence hoy', tone: 'text-amber-600' };
  return {
    text: `Vence en ${days} ${days === 1 ? 'd\u00eda' : 'd\u00edas'}`,
    tone: days <= 3 ? 'text-amber-600' : 'text-muted-foreground',
  };
}

export default function QuotesPage() {
  const { currentBranch, organization } = useOrganization();
  const { taxRate } = useSystemSettings();
  const [quotes, setQuotes] = useState<QuoteDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<QuoteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Datos de la tienda para el encabezado del presupuesto y del PDF.
  const org = organization as unknown as {
    name?: string | null;
    taxId?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;

  const handleDownloadPdf = async (quote: QuoteDto) => {
    setError(null);
    try {
      // La lista no trae los productos de cada cotización: se pide la completa.
      const full = await quotesApi.get(quote.id);
      exportQuotePdf(full, { name: org?.name, taxId: org?.taxId, phone: org?.phone, address: org?.address });
    } catch {
      setError('No se pudo generar el PDF');
    }
  };

  useEffect(() => {
    quotesApi.list()
      .then(setQuotes)
      .catch(() => setError('Error al cargar cotizaciones'))
      .finally(() => setIsLoading(false));
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: getBaseCurrency(), minimumFractionDigits: 0 }).format(value);

  const filteredQuotes = quotes.filter(q => {
    const matchSearch =
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.clientName ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateQuote = async (formData: QuotationFormData) => {
    if (!currentBranch?.id) {
      setError('Selecciona una sucursal antes de crear una cotizacion');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const TAX_RATE = taxRate / 100;
      const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = subtotal * ((formData.discount ?? 0) / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const tax = formData.applyTax ? subtotalAfterDiscount * TAX_RATE : 0;

      const quoteNumber = `COT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`;
      const created = await quotesApi.create({
        branchId: currentBranch.id,
        customerId: formData.customerId,
        quoteNumber,
        status: 'sent',
        validUntil: new Date(Date.now() + (formData.validityDays || 15) * 24 * 60 * 60 * 1000).toISOString(),
        taxTotal: tax,
        discountTotal: discountAmount,
        notes: formData.notes,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        clientCompany: formData.clientCompany || undefined,
        clientNit: formData.clientNIT || undefined,
        clientAddress: formData.clientAddress || undefined,
        items: formData.items.map(item => ({
          productId: item.productId,
          kitId: item.kitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 0,
        })),
      });
      setQuotes(prev => [created, ...prev]);
      setPreviewQuote(created);
      setIsPreviewOpen(true);
      setIsCreateDialogOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear cotizacion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToSale = async (quote: QuoteDto) => {
    setError(null);
    try {
      const saleNumber = `VTA-${Date.now().toString().slice(-6)}`;
      await quotesApi.convertToSale(quote.id, { saleNumber });
      const updated = await quotesApi.update(quote.id, { status: 'converted' });
      setQuotes(prev => prev.map(q => q.id === quote.id ? updated : q));
      alert(`Cotizacion convertida a venta: ${saleNumber}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al convertir cotizacion');
    }
  };

  const statsThisMonth = quotes.filter(q => {
    const created = new Date(q.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Cargando cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cotizaciones" description="Crea y administra cotizaciones para clientes">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotizacion
        </Button>
      </PageHeader>

      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <QuotationForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateQuote}
        isLoading={isSaving}
      />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Presupuesto</DialogTitle>
          </DialogHeader>
          {previewQuote && (
            <div className="space-y-4">
              <QuotationPreview quote={previewQuote} companyName={org?.name ?? undefined} companyTax={org?.taxId ?? undefined} companyPhone={org?.phone ?? undefined} />
              <div className="flex gap-2">
                <Button onClick={() => handleDownloadPdf(previewQuote)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{statsThisMonth.length}</div>
            <p className="text-sm text-muted-foreground">Cotizaciones este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(statsThisMonth.reduce((s, q) => s + q.total, 0))}</div>
            <p className="text-sm text-muted-foreground">Valor total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {statsThisMonth.length > 0
                ? Math.round((statsThisMonth.filter(q => q.status === 'converted' || q.status === 'accepted').length / statsThisMonth.length) * 100)
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Tasa de conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{quotes.filter(q => q.status === 'sent').length}</div>
            <p className="text-sm text-muted-foreground">Pendientes de respuesta</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero o cliente..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Borrador</SelectItem>
            <SelectItem value="sent">Enviada</SelectItem>
            <SelectItem value="accepted">Aceptada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Cotizacion</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="whitespace-nowrap">Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="whitespace-nowrap">Fecha de creaci&oacute;n</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium font-mono">{quote.quoteNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quote.clientName ?? 'Sin nombre'}</div>
                      <div className="text-sm text-muted-foreground">
                        {quote.clientEmail || quote.clientPhone || 'Sin contacto'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{quote.items?.length ?? 0} productos</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(quote.total)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">{formatDate(quote.validUntil, '-')}</div>
                    {(() => {
                      const v = validityInfo(quote.validUntil);
                      return v ? <div className={`text-xs ${v.tone}`}>{v.text}</div> : null;
                    })()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusMap[quote.status]} label={statusLabels[quote.status]} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">{formatDate(quote.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setPreviewQuote(quote); setIsPreviewOpen(true); }}>
                          <FileText className="mr-2 h-4 w-4" />
                          Ver Presupuesto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadPdf(quote)}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Descargar PDF
                        </DropdownMenuItem>
                        {quote.status === 'sent' && (
                          <>
                            <DropdownMenuItem onClick={() => handleConvertToSale(quote)}>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Aprobar y Convertir
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {quote.status === 'converted' && (
                          <DropdownMenuItem disabled>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Ya convertida en venta
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>Duplicar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            try {
                              await quotesApi.update(quote.id, { status: 'rejected' });
                              setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'rejected' } : q));
                            } catch {
                              setError('Error al eliminar cotizacion');
                            }
                          }}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
