'use client';
import { Button } from '@/components/ui/button';
export function ReportPagination({ page, total, loading, onChange }: { page: number; total: number; loading: boolean; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / 50));
  return <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="text-sm text-muted-foreground">{total} registros · Página {page + 1} de {pages}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={loading || page === 0} onClick={() => onChange(page - 1)}>Anterior</Button>
      <Button variant="outline" size="sm" disabled={loading || page + 1 >= pages} onClick={() => onChange(page + 1)}>Siguiente</Button>
    </div>
  </div>;
}
