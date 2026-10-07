'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Receipt as ReceiptIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PaymentMethod, SaleDocumentType } from '@/lib/api/sales';
import { formatDate, formatTime } from '@/lib/format';

export interface SaleReceiptItem {
  name: string;
  quantity: number;
  price: number;
  pendingQty?: number;
}

export interface SaleReceiptData {
  saleNumber: string;
  soldAt: string;
  companyName: string;
  branchName: string;
  /**
   * Todo lo de factura es opcional: este mismo componente imprime el recibo
   * desde el punto de venta y desde el historial, y una venta con recibo no
   * tiene nada de esto.
   */
  documentType?: SaleDocumentType;
  invoiceNumber?: string | null;
  companyTaxId?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  cashierName?: string;
  clientName?: string | null;
  clientNit?: string | null;
  clientPhone?: string | null;
  paymentMethod: PaymentMethod;
  isAdvanceSale: boolean;
  items: SaleReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  depositAmount?: number;
  /** Condiciones de venta anticipada configuradas por la tienda. */
  advanceSaleTerms?: string | null;
}

interface SaleReceiptDialogProps {
  isOpen: boolean;
  sale: SaleReceiptData | null;
  formatCurrency: (value: number) => string;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Credito',
  other: 'Otro',
};

type ReceiptFormat = 'ticket' | 'pdf';

export function SaleReceiptDialog({ isOpen, sale, formatCurrency, onClose }: SaleReceiptDialogProps) {
  const [format, setFormat] = useState<ReceiptFormat>('pdf');
  // createPortal necesita `document`, que no existe en el render del servidor.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!sale) return null;

  // Zona horaria de la organizacion, no la del navegador: un PC en UTC
  // imprimia el recibo con 4 horas de mas.
  const formattedDate = formatDate(sale.soldAt);
  const formattedTime = formatTime(sale.soldAt);

  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPendingUnits = sale.items.reduce((sum, item) => sum + (item.pendingQty ?? 0), 0);
  const hasDeposit = typeof sale.depositAmount === 'number';
  const balanceDue = hasDeposit ? sale.total - (sale.depositAmount ?? 0) : 0;
  const saleTypeLabel = sale.isAdvanceSale ? 'Venta adelantada' : 'Venta normal';
  const showAdvanceTerms = sale.isAdvanceSale && !!sale.advanceSaleTerms?.trim();
  const isInvoice = sale.documentType === 'invoice';
  const documentLabel = isInvoice ? 'FACTURA' : 'RECIBO';

  const handlePrint = () => {
    window.print();
  };

  const ticketBody = (
    <div className="mx-auto w-full max-w-[280px] print:max-w-none print:w-[76mm] font-mono text-[11px] leading-relaxed">
      <div className="text-center mb-1.5">
        <p className="font-bold text-sm">{sale.companyName}</p>
        {sale.companyTaxId && <p>NIT: {sale.companyTaxId}</p>}
        <p>{sale.branchName}</p>
        {sale.companyAddress && <p>{sale.companyAddress}</p>}
        {sale.companyPhone && <p>Tel: {sale.companyPhone}</p>}
        <p className="font-bold mt-1">{documentLabel}</p>
      </div>
      <div className="border-t border-dashed border-current my-1.5" />
      {sale.invoiceNumber && <div>Factura: {sale.invoiceNumber}</div>}
      <div>Venta: {sale.saleNumber}</div>
      <div>Fecha: {formattedDate} {formattedTime}</div>
      {sale.cashierName && <div>Cajero: {sale.cashierName}</div>}
      <div>Cliente: {sale.clientName || 'Consumidor final'}</div>
      {sale.clientNit && <div>NIT/CI: {sale.clientNit}</div>}
      {sale.clientPhone && <div>Tel: {sale.clientPhone}</div>}
      <div>Pago: {PAYMENT_METHOD_LABELS[sale.paymentMethod]}</div>
      <div>Tipo: {saleTypeLabel}</div>
      <div className="border-t border-dashed border-current my-1.5" />
      {sale.items.map((item, index) => (
        <div key={index} className="mb-1.5">
          <div>{item.name}</div>
          <div className="flex justify-between">
            <span>{item.quantity} x {formatCurrency(item.price)}</span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
          {!!item.pendingQty && item.pendingQty > 0 && (
            <div>** Pend. entrega: {item.pendingQty}</div>
          )}
        </div>
      ))}
      <div className="border-t border-dashed border-current my-1.5" />
      <div className="flex justify-between"><span>Cant. productos</span><span>{totalUnits}</span></div>
      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
      <div className="flex justify-between"><span>IT (13%)</span><span>{formatCurrency(sale.tax)}</span></div>
      <div className="border-t border-dashed border-current my-1.5" />
      <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatCurrency(sale.total)}</span></div>
      {hasDeposit && (
        <>
          <div className="flex justify-between"><span>Anticipo</span><span>{formatCurrency(sale.depositAmount ?? 0)}</span></div>
          <div className="flex justify-between"><span>Saldo</span><span>{formatCurrency(balanceDue)}</span></div>
        </>
      )}
      {totalPendingUnits > 0 && (
        <>
          <div className="border-t border-dashed border-current my-1.5" />
          <div>** {totalPendingUnits} unidad(es) pendientes de entrega</div>
        </>
      )}
      {showAdvanceTerms && (
        <>
          <div className="border-t border-dashed border-current my-1.5" />
          <div className="whitespace-pre-wrap">{sale.advanceSaleTerms}</div>
        </>
      )}
      <div className="text-center mt-2">Gracias por su compra</div>
    </div>
  );

  const sheetBody = (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-3 border-b pb-2 mb-2">
        <div>
          <p className="font-bold text-base leading-tight">{sale.companyName}</p>
          {sale.companyTaxId && <p className="text-xs">NIT: {sale.companyTaxId}</p>}
          <p className="text-xs text-muted-foreground">{sale.branchName}</p>
          {sale.companyAddress && (
            <p className="text-xs text-muted-foreground">{sale.companyAddress}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide font-semibold">{documentLabel}</p>
          {sale.invoiceNumber && (
            <p className="font-mono font-semibold">{sale.invoiceNumber}</p>
          )}
          <p className="text-[10px] text-muted-foreground">Venta</p>
          <p className="font-mono text-xs">{sale.saleNumber}</p>
          <Badge
            variant="secondary"
            className={cn(
              'mt-1',
              sale.isAdvanceSale
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                : 'bg-green-100 text-green-700 hover:bg-green-100',
            )}
          >
            {saleTypeLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-x-3 gap-y-0.5 text-xs mb-2">
        <span className="text-muted-foreground">Fecha</span>
        <span className="font-medium">{formattedDate}</span>
        <span className="text-muted-foreground">Hora</span>
        <span className="font-medium">{formattedTime}</span>
        {sale.cashierName && (
          <>
            <span className="text-muted-foreground">Cajero</span>
            <span className="font-medium">{sale.cashierName}</span>
          </>
        )}
        <span className="text-muted-foreground">Pago</span>
        <span className="font-medium">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
      </div>

      <div className="rounded border bg-muted/40 px-2 py-1.5 mb-2 print:bg-transparent">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
          Datos del cliente
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{sale.clientName || 'Consumidor final'}</span>
          <span className="text-muted-foreground">NIT / CI</span>
          <span className="font-medium font-mono">{sale.clientNit || '—'}</span>
          {sale.clientPhone && (
            <>
              <span className="text-muted-foreground">Telefono</span>
              <span className="font-medium">{sale.clientPhone}</span>
            </>
          )}
        </div>
      </div>

      {/* La tabla no es del <Table> de shadcn (que ya trae su contenedor con
          scroll), así que lo lleva aquí. En impresión no debe desplazarse. */}
      <div className="mb-2 overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[360px] text-xs border-collapse print:min-w-0">
        <thead>
          <tr className="border-b border-foreground/30">
            <th className="text-left py-1 font-semibold">Producto</th>
            <th className="text-right py-1 font-semibold w-14">Cant.</th>
            <th className="text-right py-1 font-semibold w-20">P. Unit.</th>
            <th className="text-right py-1 font-semibold w-24">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={index} className="border-b border-muted">
              <td className="py-1">
                {item.name}
                {!!item.pendingQty && item.pendingQty > 0 && (
                  <div className="text-[10px] text-yellow-700">
                    Pendiente de entrega: {item.pendingQty}
                  </div>
                )}
              </td>
              <td className="text-right py-1">{item.quantity}</td>
              <td className="text-right py-1">{formatCurrency(item.price)}</td>
              <td className="text-right py-1 font-medium">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="ml-auto w-full sm:w-64 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cant. productos</span>
          <span>{totalUnits}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">IT (13%)</span>
          <span>{formatCurrency(sale.tax)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
          <span>Total</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        {hasDeposit && (
          <>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Anticipo pagado</span>
              <span>{formatCurrency(sale.depositAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Saldo pendiente</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </>
        )}
      </div>

      {totalPendingUnits > 0 && (
        <div className="mt-2 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700 print:bg-transparent print:border print:border-yellow-700">
          Quedan {totalPendingUnits} unidad(es) pendientes de entrega. Se entregaran cuando llegue la
          mercaderia{hasDeposit ? ' y se cobrara el saldo restante' : ''}.
        </div>
      )}

      {showAdvanceTerms && (
        <div className="mt-2 border-t pt-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Condiciones de la venta anticipada
          </p>
          <p className="text-[11px] leading-snug whitespace-pre-wrap">{sale.advanceSaleTerms}</p>
        </div>
      )}
    </div>
  );

  const body = format === 'ticket' ? ticketBody : sheetBody;

  /*
   * El recibo se imprime desde un portal colgado directamente de <body>, no desde
   * dentro del Dialog. Radix renderiza el dialogo en un contenedor `position: fixed`
   * de una pagina de alto, y Chrome NO pagina contenido dentro de un ancestro fixed:
   * lo recorta. Por eso el formato Hoja perdia la tabla de productos en cuanto la
   * venta tenia suficientes lineas para pasar del alto de la hoja.
   */
  const printStyles = `
    .sale-receipt-print { display: none; }
    @media print {
      @page {
        size: ${format === 'ticket' ? '80mm auto' : 'A4'};
        margin: ${format === 'ticket' ? '2mm' : '10mm'};
      }
      body > *:not(.sale-receipt-print) { display: none !important; }
      .sale-receipt-print {
        display: block !important;
        position: static;
        width: 100%;
        color: #000;
        background: #fff;
      }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
      thead { display: table-header-group; }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>

      {isMounted && isOpen
        ? createPortal(
            <div className="sale-receipt-print">{body}</div>,
            document.body,
          )
        : null}

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className={cn(
            'max-h-[85vh] w-[95vw] overflow-y-auto',
            format === 'ticket' ? 'sm:max-w-sm' : 'sm:max-w-2xl',
          )}
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5 text-primary" />
                <DialogTitle>{isInvoice ? 'Factura de venta' : 'Recibo de venta'}</DialogTitle>
              </div>
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  type="button"
                  size="sm"
                  variant={format === 'pdf' ? 'default' : 'ghost'}
                  className="rounded-none h-7 px-2 text-xs"
                  onClick={() => setFormat('pdf')}
                >
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Hoja
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={format === 'ticket' ? 'default' : 'ghost'}
                  className="rounded-none h-7 px-2 text-xs"
                  onClick={() => setFormat('ticket')}
                >
                  <ReceiptIcon className="mr-1 h-3.5 w-3.5" />
                  Ticket
                </Button>
              </div>
            </div>
          </DialogHeader>

          {body}

          <DialogFooter>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / Descargar PDF
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
