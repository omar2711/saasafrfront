'use client';
import { useEffect } from 'react';
import { subscribeApiInvalidation } from '@/lib/api-client';

/** Revalidate after writes, cross-tab writes, focus and a bounded polling interval. */
export function useLiveApiEffect(load: (isCurrent: () => boolean) => Promise<void>, interval = 15000) {
  useEffect(() => {
    let active = true;
    let running = false;
    let queued = false;
    const refresh = async () => {
      if (!active) return;
      if (running) { queued = true; return; }
      running = true;
      try { await load(() => active); }
      catch { /* The consumer renders its error state. */ }
      finally {
        running = false;
        if (queued && active) { queued = false; void refresh(); }
      }
    };
    const trigger = () => { if (!document.hidden) void refresh(); };
    const unsubscribe = subscribeApiInvalidation(trigger);
    window.addEventListener('focus', trigger);
    const timer = setInterval(trigger, interval);
    void refresh();
    return () => { active = false; clearInterval(timer); unsubscribe(); window.removeEventListener('focus', trigger); };
  }, [load, interval]);
}
