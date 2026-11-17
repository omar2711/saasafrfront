import { taxLabelFromTotals } from '@/lib/format';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { QuoteDto } from '@/lib/api/quotes';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  converted: 'Convertida',
};

const money = (n: number | null | undefined) =>
  `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-BO') : '-');

export interface QuotePdfCompany {
  name?: string | null;
  taxId?: string | null;
  phone?: string | null;
  address?: string | null;
}

export function exportQuotePdf(quote: QuoteDto, company: QuotePdfCompany = {}) {
  const doc = new jsPDF();
  const left = 14;
  const right = 196;

  // Tienda (izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(company.name?.trim() || 'Mi Tienda', left, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let y = 26;
  const companyLines = [
    company.taxId ? `NIT: ${company.taxId}` : null,
    company.phone ? `Tel: ${company.phone}` : null,
    company.address ?? null,
  ].filter((l): l is string => !!l);
  companyLines.forEach((line) => {
    doc.text(line, left, y);
    y += 5;
  });

  // Presupuesto (derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRESUPUESTO', right, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(quote.quoteNumber, right, 27, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Emisión: ${dateStr(quote.createdAt)}`, right, 33, { align: 'right' });
  doc.text(`Vigencia: ${dateStr(quote.validUntil)}`, right, 38, { align: 'right' });
  doc.text(`Estado: ${STATUS_LABELS[quote.status] ?? quote.status}`, right, 43, { align: 'right' });

  y = Math.max(y, 43) + 4;
  doc.setDrawColor(200);
  doc.line(left, y, right, y);
  y += 8;

  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CLIENTE', left, y);
  y += 6;
  doc.setFontSize(10);
  const clientLines = [
    quote.clientName ?? 'Sin nombre',
    quote.clientCompany ?? null,
    quote.clientNit ? `CI/NIT: ${quote.clientNit}` : null,
    quote.clientPhone ? `Tel: ${quote.clientPhone}` : null,
    quote.clientEmail ? `Email: ${quote.clientEmail}` : null,
    quote.clientAddress ? `Dirección: ${quote.clientAddress}` : null,
  ].filter((l): l is string => !!l);
  clientLines.forEach((line, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.text(line, left, y);
    y += 5;
  });

  // Productos
  autoTable(doc, {
    startY: y + 4,
    head: [['Descripción', 'Cant.', 'Precio unit.', 'Descuento', 'Subtotal']],
    body: (quote.items ?? []).map((it) => [
      it.productName ?? it.kitName ?? (it.kitId ? 'Kit' : 'Producto'),
      String(it.quantity),
      money(it.unitPrice),
      it.discount > 0 ? money(it.discount) : '-',
      money(it.total),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  // Totales
  const tableEnd: number = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  let ty = tableEnd + 10;
  if (ty > 250) {
    doc.addPage();
    ty = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Subtotal: ${money(quote.subtotal)}`, right, ty, { align: 'right' });
  ty += 6;
  if (quote.discountTotal > 0) {
    doc.text(`Descuento: -${money(quote.discountTotal)}`, right, ty, { align: 'right' });
    ty += 6;
  }
  if (quote.taxTotal > 0) {
    doc.text(`${taxLabelFromTotals(quote.total, quote.taxTotal)}: ${money(quote.taxTotal)}`, right, ty, { align: 'right' });
    ty += 8;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${money(quote.total)}`, right, ty, { align: 'right' });

  // Observaciones
  if (quote.notes) {
    ty += 12;
    if (ty > 265) {
      doc.addPage();
      ty = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('OBSERVACIONES', left, ty);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.notes, left, ty + 5, { maxWidth: 182 });
  }

  // Pie
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Presupuesto válido hasta el ${dateStr(quote.validUntil)}`, 105, 285, { align: 'center' });

  doc.save(`cotizacion-${quote.quoteNumber}.pdf`);
}