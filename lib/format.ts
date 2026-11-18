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

let currentTaxName = 'IVA';

/** Nombre del impuesto configurado (IVA, IGV, ...); lo fija la configuracion de la empresa. */
export function setTaxName(name: string | null | undefined): void {
  currentTaxName = name && name.trim() ? name.trim() : 'IVA';
}

export function getTaxName(): string {
  return currentTaxName;
}

/**
 * Etiqueta del impuesto de un comprobante, por ejemplo "IVA (13%)". El porcentaje se
 * deduce de los montos del propio comprobante (total e impuesto): una venta antigua
 * conserva el porcentaje con el que se cobro aunque despues cambie la configuracion.
 */
export function taxLabelFromTotals(total: number, tax: number): string {
  const base = total - tax;
  if (!(tax > 0) || !(base > 0)) return currentTaxName;
  const rate = Math.round((tax / base) * 10000) / 100;
  return `${currentTaxName} (${formatNumber(rate, 2)}%)`;
}
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
let currentCurrency = 'BOB';

/** Moneda con la que trabaja el sistema; la fija la configuracion de la empresa. */
export function setBaseCurrency(code: string | null | undefined): void {
  currentCurrency = code && CURRENCY_CODE_RE.test(code) ? code : 'BOB';
}

export function getBaseCurrency(): string {
  return currentCurrency;
}

/** Formatea un monto en una moneda concreta (por defecto, la del sistema). */
export function formatMoney(
  value: number | null | undefined,
  currency: string = currentCurrency,
  fractionDigits = 2,
): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(fractionDigits)} ${currency}`;
  }
}

export function formatCurrency(value: number | null | undefined, fractionDigits = 2): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: currentCurrency,
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
