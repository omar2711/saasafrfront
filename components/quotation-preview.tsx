'use client';

import { type QuoteDto } from '@/lib/api/quotes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateLong } from '@/lib/format';

interface QuotationPreviewProps {
  quote: QuoteDto;
  companyName?: string;
  companyLogo?: string;
  companyTax?: string;
  companyPhone?: string;
}

export function QuotationPreview({
  quote,
  companyName = 'Mi Tienda',
  companyTax = 'RFC: ABC123456789',
  companyPhone = '+52 55 1234 5678',
}: QuotationPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date?: string | null) => formatDateLong(date, '-');

  const statusLabels: Record<string, string> = {
    pending: 'Borrador',
    sent: 'Enviada',
    approved: 'Aprobada',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired: 'Expirada',
    converted: 'Convertida',
  };

  const statusBadges: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    sent: 'default',
    approved: 'default',
    accepted: 'default',
    rejected: 'destructive',
    expired: 'outline',
    converted: 'default',
  };

  return (
    <Card className="overflow-hidden bg-white">
      <CardContent className="p-8 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-8 border-b">
          <div>
            <h1 className="text-3xl font-bold">{companyName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{companyTax}</p>
            <p className="text-sm text-muted-foreground">{companyPhone}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">PRESUPUESTO</div>
            <div className="text-sm font-mono text-muted-foreground">{quote.quoteNumber}</div>
          </div>
        </div>

        {/* Quote Status & Dates */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Fecha de emisión</div>
            <div className="font-medium">{formatDate(quote.createdAt)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Vigencia</div>
            <div className="font-medium">{formatDate(quote.validUntil)}</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-sm text-muted-foreground">Estado</div>
            <Badge variant={statusBadges[quote.status]}>
              {statusLabels[quote.status]}
            </Badge>
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-8 pb-8 border-b">
          <div className="text-sm font-semibold text-muted-foreground mb-2">CLIENTE</div>
          <div className="space-y-1">
            <div className="font-semibold">{quote.clientName}</div>
            {quote.clientPhone && (
              <div className="text-sm text-muted-foreground">Tel: {quote.clientPhone}</div>
            )}
            {quote.clientEmail && (
              <div className="text-sm text-muted-foreground">Email: {quote.clientEmail}</div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="text-left py-3 px-2 font-semibold">Descripción</th>
                <th className="text-right py-3 px-2 font-semibold w-20">Cantidad</th>
                <th className="text-right py-3 px-2 font-semibold w-24">Precio Unit.</th>
                <th className="text-right py-3 px-2 font-semibold w-24">Descuento</th>
                <th className="text-right py-3 px-2 font-semibold w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(quote.items ?? []).map((item, index) => (
                <tr key={index} className="border-b border-muted">
                  <td className="py-3 px-2">
                    <div className="font-medium">Producto</div>
                    <div className="text-xs text-muted-foreground">Cantidad: {item.quantity}</div>
                  </td>
                  <td className="text-right py-3 px-2">{item.quantity}</td>
                  <td className="text-right py-3 px-2 font-medium">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right py-3 px-2">
                    {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                  </td>
                  <td className="text-right py-3 px-2 font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {/* Totals Section */}
        <div className="ml-auto w-full sm:w-80 mb-8">
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-muted-foreground">Subtotal</td>
                <td className="text-right py-2 font-medium">{formatCurrency(quote.subtotal)}</td>
              </tr>
              {quote.discountTotal > 0 && (
                <tr className="border-b text-yellow-600">
                  <td className="py-2">Descuento</td>
                  <td className="text-right py-2 font-medium">-{formatCurrency(quote.discountTotal)}</td>
                </tr>
              )}
              <tr className="border-b">
                <td className="py-2 text-muted-foreground">IVA (16%)</td>
                <td className="text-right py-2 font-medium">{formatCurrency(quote.taxTotal)}</td>
              </tr>
              <tr className="border-b-2 border-foreground text-base">
                <td className="py-3 font-bold">TOTAL</td>
                <td className="text-right py-3 font-bold text-lg text-primary">
                  {formatCurrency(quote.total)}
                </td>
              </tr>
            </tbody>
          </table></div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mb-8 pb-8 border-b">
            <div className="text-sm font-semibold text-muted-foreground mb-2">OBSERVACIONES</div>
            <div className="text-sm whitespace-pre-wrap">{quote.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>Presupuesto válido hasta el {formatDate(quote.validUntil)}</p>
          <p>Gracias por tu interés en nuestros productos</p>
        </div>
      </CardContent>
    </Card>
  );
}
