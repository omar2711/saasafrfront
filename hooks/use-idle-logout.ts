'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/api-client';

// Cierre de sesión por inactividad.
const IDLE_MS = 30 * 60 * 1000; // 30 minutos
const WARN_MS = 60 * 1000; // aviso durante el último minuto
const KEY = 'last_activity';
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

const sessionKey = () => (getToken() ?? '').slice(-16);

function readLast(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const [sid, ts] = raw.split('|');
    if (sid !== sessionKey()) return null; // actividad de otra sesión
    const n = Number(ts);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeLast(ts: number) {
  try {
    localStorage.setItem(KEY, `${sessionKey()}|${ts}`);
  } catch {}
}

export function useIdleLogout(onIdle: () => void) {
  const onIdleRef = useRef(onIdle);
  const lastRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Registra actividad (también sirve como "Seguir en sesión")
  const touch = useCallback(() => {
    const now = Date.now();
    lastRef.current = now;
    if (getToken() && now - lastWriteRef.current > 5000) {
      lastWriteRef.current = now;
      writeLast(now);
    }
    setSecondsLeft((s) => (s === null ? s : null));
  }, []);

  useEffect(() => {
    let armed = false;
    let fired = false;

    const fire = () => {
      if (fired) return;
      fired = true;
      onIdleRef.current();
    };

    const arm = () => {
      const now = Date.now();
      lastRef.current = now;
      lastWriteRef.current = now;
      writeLast(now);
      armed = true;
    };

    // Al montar: si la última actividad guardada ya pasó los 45 min
    // (pestaña cerrada o PC dormida), se cierra la sesión de inmediato.
    if (getToken()) {
      const stored = readLast();
      if (stored !== null && Date.now() - stored >= IDLE_MS) {
        fire();
        return;
      }
      arm();
    }

    const tick = () => {
      if (fired) return;
      if (!getToken()) {
        armed = false;
        return;
      }
      if (!armed) {
        arm();
        return;
      }
      // Toma la actividad más reciente entre esta pestaña y las demás
      const last = Math.max(lastRef.current, readLast() ?? 0);
      const left = IDLE_MS - (Date.now() - last);
      if (left <= 0) {
        fire();
        return;
      }
      setSecondsLeft(left <= WARN_MS ? Math.ceil(left / 1000) : null);
    };

    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', tick);
    const id = window.setInterval(tick, 1000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', tick);
      window.clearInterval(id);
    };
  }, [touch]);

  return { warning: secondsLeft !== null, secondsLeft: secondsLeft ?? 0, stay: touch };
}