import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrderDto } from '@/lib/api/purchase-orders';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  ordered: 'Ordenado',
  approved: 'Aprobado',
  received: 'Recibido',
  canceled: 'Cancelado',
};

const money = (n: number | null | undefined) =>
  `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-BO') : '-');

export function exportPurchaseOrderPdf(order: PurchaseOrderDto, supplierName?: string) {
  const doc = new jsPDF();
  const left = 14;

  doc.setFontSize(16);
  doc.text(`Nuevo Ingreso ${order.orderNumber}`, left, 18);

  doc.setFontSize(10);
  const info: [string, string][] = [
    ['Proveedor', order.supplierName ?? supplierName ?? '-'],
    ['Sucursal', order.branchName ?? '-'],
    ['Estado', STATUS_LABELS[order.status] ?? order.status],
    ['Fecha', dateStr(order.orderedAt ?? order.createdAt)],
  ];
  info.forEach(([label, value], i) => {
    doc.text(`${label}: ${value}`, left, 28 + i * 6);
  });

  autoTable(doc, {
    startY: 28 + info.length * 6 + 4,
    head: [['Producto', 'SKU', 'Unidad', 'Cantidad', 'Costo unit.', 'Total']],
    body: (order.items ?? []).map(it => [
      it.productName ?? '-',
      it.productSku ?? '-',
      it.productUnit ?? '-',
      String(it.quantity),
      money(it.unitCost),
      money(it.totalCost),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 40] },
  });

  const finalY: number = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  const right = 196;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${money(order.subtotal)}`, right, finalY + 10, { align: 'right' });
  if (order.taxTotal > 0) doc.text(`IVA: ${money(order.taxTotal)}`, right, finalY + 16, { align: 'right' });
  doc.setFontSize(12);
  doc.text(`Total: ${money(order.totalCost)}`, right, finalY + 24, { align: 'right' });

  if (order.notes) {
    doc.setFontSize(9);
    doc.text(`Notas: ${order.notes}`, left, finalY + 34, { maxWidth: 180 });
  }

  doc.save(`ingreso-${order.orderNumber}.pdf`);
}