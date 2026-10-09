'use client';
import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import { listPath, listAllPages, type ListFilters } from '@/lib/api/pagination';
import { useLiveApiEffect } from './use-live-api-effect';

export interface ReportSummary { totalRecords: number; revenue?: number; convertedCount?: number; netQuantity?: number; }
export function usePagedReport<T>(path: string, summaryPath: string, filters: ListFilters) {
  const key = JSON.stringify(filters);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<T[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({ totalRecords: 0 });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { setPage(0); }, [key]);
  const load = useCallback(async (isCurrent: () => boolean) => {
    setLoading(true); setError('');
    try {
      const filter = JSON.parse(key) as ListFilters;
      const [data, totals] = await Promise.all([
        apiRequest<T[]>(listPath(path, { ...filter, limit: 50, offset: page * 50 })),
        apiRequest<ReportSummary>(listPath(summaryPath, filter)),
      ]);
      if (!isCurrent()) return;
      const lastPage = Math.max(0, Math.ceil(totals.totalRecords / 50) - 1);
      if (page > lastPage) setPage(lastPage);
      setRows(data); setSummary(totals);
    } catch (e) { if (isCurrent()) setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte'); }
    finally { if (isCurrent()) setLoading(false); }
  }, [path, summaryPath, key, page]);
  useLiveApiEffect(load, 30000);
  const exportAll = async () => {
    const filter = JSON.parse(key);
    const before = await apiRequest<ReportSummary>(listPath(summaryPath, filter), { cache: false });
    const allRows = await listAllPages<T>(path, filter);
    const after = await apiRequest<ReportSummary>(listPath(summaryPath, filter), { cache: false });
    if (allRows.length !== before.totalRecords || JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error('El reporte cambió durante la exportación. Vuelve a intentarlo.');
    }
    return allRows;
  };
  return { rows, summary, page, setPage, isLoading, error, exportAll };
}
