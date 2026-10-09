'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportDataset } from '@/lib/export/types';

interface ExportButtonsProps<T> {
  /**
   * Se evalúa al pulsar, no al renderizar: construir el dataset completo en
   * cada render costaría recorrer todas las filas por cada tecla escrita en un
   * filtro.
   */
  buildDataset: () => ExportDataset<T> | Promise<ExportDataset<T>>;
  disabled?: boolean;
}

type Pending = 'pdf' | 'excel' | null;

export function ExportButtons<T>({ buildDataset, disabled }: ExportButtonsProps<T>) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState('');

  const run = async (format: Exclude<Pending, null>) => {
    setPending(format);
    setError('');
    try {
      const dataset = await buildDataset();
      // El import dinámico vive aquí dentro: jspdf (~380 KB) y SheetJS (~430 KB)
      // no pueden entrar en el bundle inicial de una app que carga en el POS.
      if (format === 'pdf') {
        const { exportToPdf } = await import('@/lib/export/pdf');
        await exportToPdf(dataset);
      } else {
        const { exportToExcel } = await import('@/lib/export/excel');
        await exportToExcel(dataset);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={() => run('pdf')}
        disabled={disabled || pending !== null}
      >
        {pending === 'pdf' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run('excel')}
        disabled={disabled || pending !== null}
      >
        {pending === 'excel' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Excel
      </Button>
    </div>
  );
}
