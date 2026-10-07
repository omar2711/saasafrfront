import { buildFileName, type ExportDataset } from './types';

/**
 * Genera el PDF de un dataset. jsPDF + autotable pesan ~380 KB juntos, así que
 * este módulo se carga con `await import()` **dentro del handler de click** y
 * nunca entra en el bundle inicial. No lo importes de forma estática.
 */
export async function exportToPdf<T>(dataset: ExportDataset<T>): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  // Horizontal: los reportes tienen 6-8 columnas y en vertical se aprietan.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(dataset.title, 14, 16);

  if (dataset.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(dataset.subtitle, 14, 22);
    doc.setTextColor(0);
  }

  autoTable(doc, {
    startY: dataset.subtitle ? 27 : 22,
    head: [dataset.columns.map((column) => column.header)],
    body: dataset.rows.map((row) => dataset.columns.map((column) => String(column.value(row)))),
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 47, 63], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    columnStyles: Object.fromEntries(
      dataset.columns.map((column, index) => [
        index,
        { halign: column.align ?? 'left', ...(column.width ? { cellWidth: column.width } : {}) },
      ]),
    ),
    margin: { left: 14, right: 14 },
    // El encabezado se repite en cada hoja y ninguna fila se parte por la mitad.
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(
        `Página ${data.pageNumber} de ${page}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' },
      );
      doc.setTextColor(0);
    },
  });

  if (dataset.summary?.length) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    let y = (finalY ?? 30) + 8;
    doc.setFontSize(9);
    for (const entry of dataset.summary) {
      doc.text(`${entry.label}: ${entry.value}`, 14, y);
      y += 5;
    }
  }

  doc.save(buildFileName(dataset.title, 'pdf'));
}
