/**
 * Formato de fechas, horas y montos con la zona horaria de la organización.
 *
 * El problema que resuelve: hasta ahora todo el proyecto usaba
 * `new Date(x).toLocaleString('es-BO')` **sin** `timeZone`, es decir la zona del
 * navegador. En un PC configurado en UTC una venta de las 14:00 se veía a las
 * 18:00 — el desfase de 4 horas reportado. La base guarda `timestamptz` y
 * devuelve ISO en UTC; quien decide cómo se lee es la organización.
 *
 * La zona vive en un módulo y no en el contexto de React porque estas funciones
 * se llaman también fuera de componentes (generadores de PDF/Excel, helpers).
 * `OrganizationProvider` la fija en cuanto carga la organización; hasta
 * entonces se usa `DEFAULT_TIME_ZONE`, que sigue siendo mejor que la del
 * navegador. Todo consumidor cuelga del provider, así que vuelve a renderizar
 * cuando la organización llega.
 */

export const DEFAULT_TIME_ZONE = 'America/La_Paz';
export const LOCALE = 'es-BO';

let currentTimeZone = DEFAULT_TIME_ZONE;

export function setOrgTimeZone(timeZone: string | null | undefined): void {
  currentTimeZone = isValidTimeZone(timeZone) ? (timeZone as string) : DEFAULT_TIME_ZONE;
}

export function getOrgTimeZone(): string {
  return currentTimeZone;
}

function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat(LOCALE, { timeZone });
    return true;
  } catch {
    // Una organización con una zona inválida en la BD no debe romper la app
    // entera: Intl lanza RangeError al construir el formateador.
    return false;
  }
}

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(value: DateInput, options: Intl.DateTimeFormatOptions, fallback: string): string {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: currentTimeZone }).format(date);
}

/** 03/09/2026 */
export function formatDate(value: DateInput, fallback = '—'): string {
  return format(value, { day: '2-digit', month: '2-digit', year: 'numeric' }, fallback);
}

/** 3 de septiembre de 2026 */
export function formatDateLong(value: DateInput, fallback = '—'): string {
  return format(value, { day: 'numeric', month: 'long', year: 'numeric' }, fallback);
}

/** jueves, 3 de septiembre de 2026 */
export function formatDateFull(value: DateInput, fallback = '—'): string {
  return format(
    value,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    fallback,
  );
}

/** 03/09/2026, 14:35 */
export function formatDateTime(value: DateInput, fallback = '—'): string {
  return format(
    value,
    { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    fallback,
  );
}

/** 14:35 */
export function formatTime(value: DateInput, fallback = '—'): string {
  return format(value, { hour: '2-digit', minute: '2-digit' }, fallback);
}

/**
 * "2026-09-03" en la zona de la organización, para prellenar inputs `type=date`
 * y para comparar contra los filtros de los reportes. `toISOString()` daría el
 * día en UTC, que de madrugada es el día equivocado.
 */
export function toDateInputValue(value: DateInput = new Date()): string {
  const date = toDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: currentTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts;
}

export function formatCurrency(value: number | null | undefined, fractionDigits = 2): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
