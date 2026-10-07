/**
 * Descripción de una tabla exportable, independiente del formato de salida.
 * Cada pestaña de Reportes construye uno de estos y los generadores de PDF y
 * Excel lo consumen sin conocer nada del dominio.
 */
export interface ExportColumn<T> {
  header: string;
  /** Valor listo para imprimir. Ya formateado (fechas en la zona de la org). */
  value: (row: T) => string | number;
  /** Ancho relativo sugerido en el PDF. Sin él, jsPDF reparte a partes iguales. */
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export interface ExportDataset<T> {
  /** Nombre del archivo sin extensión y título del documento. */
  title: string;
  /** Línea bajo el título: rango de fechas, sucursal, filtros aplicados. */
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Pie con totales. Se imprime como última fila destacada. */
  summary?: { label: string; value: string }[];
}

/** "Historial de ventas" -> "historial-de-ventas-2026-09-03" */
export function buildFileName(title: string, extension: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const today = new Date().toISOString().slice(0, 10);
  return `${slug}-${today}.${extension}`;
}

/** Convierte los filtros activos en la línea que va bajo el título del archivo. */
export function describeFilters(filters: Record<string, string | undefined>): string {
  const parts = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);
  return parts.length > 0 ? parts.join('  ·  ') : 'Sin filtros';
}
