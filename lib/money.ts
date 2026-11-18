const bobFormatter = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
});

/** Formatea un monto en bolivianos, por ejemplo "Bs 1.234,50". */
export function formatBs(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return bobFormatter.format(Number.isFinite(n) ? n : 0);
}