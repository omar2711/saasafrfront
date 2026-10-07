import { buildFileName, type ExportDataset } from './types';

/**
 * Genera el .xlsx de un dataset con SheetJS (~430 KB). Igual que el PDF, se
 * carga con `await import()` dentro del handler de click.
 *
 * Nota de dependencias: `xlsx` se instala desde https://cdn.sheetjs.com y no
 * desde npm — el paquete publicado en el registro lleva CVEs sin parchear.
 * Está así en package.json a propósito; no lo "arregles" a `npm i xlsx`.
 */
export async function exportToExcel<T>(dataset: ExportDataset<T>): Promise<void> {
  const XLSX = await import('xlsx');

  const header = dataset.columns.map((column) => column.header);
  const body = dataset.rows.map((row) => dataset.columns.map((column) => column.value(row)));

  const rows: (string | number)[][] = [[dataset.title]];
  if (dataset.subtitle) {
    rows.push([dataset.subtitle]);
  }
  rows.push([], header, ...body);

  if (dataset.summary?.length) {
    rows.push([]);
    for (const entry of dataset.summary) {
      rows.push([entry.label, entry.value]);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  // Sin anchos explícitos todas las columnas salen a 8 caracteres y hay que
  // ensancharlas a mano al abrir el archivo.
  sheet['!cols'] = dataset.columns.map((column, index) => {
    const longest = body.reduce(
      (max, row) => Math.max(max, String(row[index] ?? '').length),
      column.header.length,
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 45) };
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sanitizeSheetName(dataset.title));
  XLSX.writeFile(book, buildFileName(dataset.title, 'xlsx'));
}

/** Excel rechaza \ / ? * [ ] : y nombres de más de 31 caracteres. */
function sanitizeSheetName(title: string): string {
  return title.replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Reporte';
}
