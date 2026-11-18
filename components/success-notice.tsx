'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface SuccessNoticeValue {
  title: string;
  description: string;
}

export function SuccessNotice({ notice }: { notice: SuccessNoticeValue | null }) {
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center text-card-foreground shadow-2xl animate-in zoom-in-90 duration-300">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold">{notice.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{notice.description}</p>
      </div>
    </div>
  );
}

export function useSuccessNotice(duration = 3000) {
  const [notice, setNotice] = useState<SuccessNoticeValue | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), duration);
    return () => clearTimeout(t);
  }, [notice, duration]);

  const showNotice = useCallback((value: SuccessNoticeValue) => setNotice(value), []);
  return { showNotice, noticeElement: <SuccessNotice notice={notice} /> };
}